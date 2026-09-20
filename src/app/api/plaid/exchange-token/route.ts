import { dbTables } from "@/lib/db-tables";
import { ensureHouseholdId } from "@/lib/household";
import { getPlaidClient } from "@/lib/plaid";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  public_token: z.string().min(1),
  institution_name: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const householdId = await ensureHouseholdId(supabase);

    const plaid = getPlaidClient();
    const { data: exchange } = await plaid.itemPublicTokenExchange({
      public_token: parsed.data.public_token,
    });

    const { data: item, error: itemErr } = await supabase
      .from(dbTables.bankItems)
      .insert({
        household_id: householdId,
        user_id: user.id,
        plaid_item_id: exchange.item_id,
        access_token: exchange.access_token,
        institution_name: parsed.data.institution_name ?? "Banco",
      })
      .select("id")
      .single();

    if (itemErr || !item) {
      return NextResponse.json(
        { error: itemErr?.message ?? "Falha ao gravar conexão" },
        { status: 500 },
      );
    }

    // Guarda as contas do Item (chequing, savings, cartão…)
    const { data: accounts } = await plaid.accountsGet({
      access_token: exchange.access_token,
    });
    if (accounts.accounts.length > 0) {
      await supabase.from(dbTables.bankAccounts).insert(
        accounts.accounts.map((a) => ({
          item_id: item.id,
          household_id: householdId,
          plaid_account_id: a.account_id,
          name: a.name ?? "",
          mask: a.mask,
          subtype: a.subtype,
        })),
      );
    }

    return NextResponse.json({ ok: true, item_id: item.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
