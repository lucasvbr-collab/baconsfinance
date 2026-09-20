import { dbTables } from "@/lib/db-tables";
import { getMyHouseholdId } from "@/lib/household-cache";
import { getPlaidClient, isPlaidConfigured } from "@/lib/plaid";
import { syncBankItem, type BankItemRow } from "@/lib/plaid-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const maxDuration = 300;

const ITEM_COLUMNS =
  "id, household_id, user_id, plaid_item_id, access_token, institution_name, sync_cursor";

async function runSync(
  supabase: SupabaseClient,
  items: BankItemRow[],
  asUserId?: string,
) {
  const plaid = getPlaidClient();
  const results = [];
  const errors: { institution: string; error: string }[] = [];
  for (const item of items) {
    try {
      results.push(await syncBankItem(supabase, plaid, item, asUserId));
    } catch (e) {
      errors.push({
        institution: item.institution_name,
        error: e instanceof Error ? e.message : "Erro desconhecido",
      });
    }
  }
  const totals = results.reduce(
    (acc, r) => ({
      inserted: acc.inserted + r.inserted,
      skipped: acc.skipped + r.skipped,
      pendingReview: acc.pendingReview + r.pendingReview,
      modified: acc.modified + r.modified,
      removed: acc.removed + r.removed,
    }),
    { inserted: 0, skipped: 0, pendingReview: 0, modified: 0, removed: 0 },
  );
  return { totals, results, errors };
}

/** Sincronização manual (botão) — usa a sessão do utilizador. */
export async function POST() {
  try {
    if (!isPlaidConfigured()) {
      return NextResponse.json(
        { error: "Plaid não configurado." },
        { status: 500 },
      );
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

    const { data: items, error } = await supabase
      .from(dbTables.bankItems)
      .select(ITEM_COLUMNS)
      .eq("household_id", householdId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Nenhum banco conectado." },
        { status: 400 },
      );
    }

    const out = await runSync(supabase, items as BankItemRow[], user.id);
    return NextResponse.json(out);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Cron (Vercel): GET com Authorization: Bearer CRON_SECRET. Sincroniza todos os lares. */
export async function GET(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    const auth = request.headers.get("authorization");
    if (!secret || auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (!isPlaidConfigured()) {
      return NextResponse.json(
        { error: "Plaid não configurado." },
        { status: 500 },
      );
    }

    const admin = createAdminClient();
    const { data: items, error } = await admin
      .from(dbTables.bankItems)
      .select(ITEM_COLUMNS);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const out = await runSync(admin, (items ?? []) as BankItemRow[]);
    return NextResponse.json(out);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
