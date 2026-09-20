import { dbTables } from "@/lib/db-tables";
import { getMyHouseholdId } from "@/lib/household-cache";
import { getPlaidClient, isPlaidConfigured } from "@/lib/plaid";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({ item_id: z.string().uuid() });

/** Desconecta um banco: /item/remove no Plaid (encerra cobrança) + apaga linhas. */
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
    const householdId = await getMyHouseholdId();
    if (!householdId) {
      return NextResponse.json({ error: "Lar não encontrado" }, { status: 400 });
    }

    const { data: item, error } = await supabase
      .from(dbTables.bankItems)
      .select("id, access_token")
      .eq("id", parsed.data.item_id)
      .eq("household_id", householdId)
      .maybeSingle();
    if (error || !item) {
      return NextResponse.json(
        { error: error?.message ?? "Conexão não encontrada" },
        { status: 404 },
      );
    }

    if (isPlaidConfigured()) {
      try {
        const plaid = getPlaidClient();
        await plaid.itemRemove({ access_token: item.access_token });
      } catch {
        // Item já removido no Plaid — segue apagando localmente.
      }
    }

    const { error: delErr } = await supabase
      .from(dbTables.bankItems)
      .delete()
      .eq("id", item.id)
      .eq("household_id", householdId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
