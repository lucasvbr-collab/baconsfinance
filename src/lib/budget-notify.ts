import type { BudgetCategory } from "@/lib/budget-alerts";
import { newThresholdNotices, noticeKey, thresholdMessage } from "@/lib/budget-thresholds";
import { dbTables } from "@/lib/db-tables";
import { currentYearMonth, formatYearMonth, monthRange } from "@/lib/month";
import { sendToHousehold } from "@/lib/push";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Categorias e gasto por categoria no mês corrente (lançamentos que contam). */
export async function currentMonthBudget(
  supabase: SupabaseClient,
  householdId: string,
): Promise<{ ym: string; categories: BudgetCategory[]; spentById: Record<string, number> }> {
  const ym = currentYearMonth();
  const { start, end } = monthRange(ym);
  const [{ data: categories }, { data: expenses }] = await Promise.all([
    supabase.from(dbTables.categories).select("id, name, monthly_limit, kind").eq("household_id", householdId),
    supabase
      .from(dbTables.transactions)
      .select("amount, category_id")
      .eq("household_id", householdId)
      .eq("type", "expense")
      .eq("exclude_from_totals", false)
      .gte("date", start.toISOString())
      .lte("date", end.toISOString()),
  ]);

  const spentById: Record<string, number> = {};
  for (const row of expenses ?? []) {
    const id = row.category_id as string;
    spentById[id] = (spentById[id] ?? 0) + Number(row.amount);
  }
  return {
    ym: formatYearMonth(ym),
    categories: (categories ?? []).map((c) => ({
      id: c.id as string,
      name: c.name as string,
      monthlyLimit: Number(c.monthly_limit),
      kind: c.kind === "income" ? "income" : "expense",
    })),
    spentById,
  };
}

/**
 * Depois de entrar gasto novo: manda push de 80/90/100% do limite para o lar,
 * uma vez por nível por categoria no mês. Nunca lança (só registra no log).
 */
export async function notifyBudgetThresholds(supabase: SupabaseClient, householdId: string): Promise<void> {
  try {
    const { ym, categories, spentById } = await currentMonthBudget(supabase, householdId);
    const { data: sentRows } = await supabase
      .from(dbTables.budgetNotices)
      .select("category_id, threshold")
      .eq("household_id", householdId)
      .eq("ym", ym);
    const sent = new Set((sentRows ?? []).map((r) => noticeKey(r.category_id as string, ym, Number(r.threshold))));

    const notices = newThresholdNotices(categories, spentById, sent, ym);
    if (notices.length === 0) return;

    // Grava antes de enviar: duas importações seguidas não mandam o mesmo aviso duas vezes.
    const { data: inserted, error } = await supabase
      .from(dbTables.budgetNotices)
      .upsert(
        notices.flatMap((n) =>
          n.markSent.map((t) => ({ household_id: householdId, category_id: n.categoryId, ym, threshold: t })),
        ),
        { onConflict: "household_id,category_id,ym,threshold", ignoreDuplicates: true },
      )
      .select("category_id, threshold");
    if (error) {
      console.error("[budget-notify] falha ao gravar avisos:", error.message);
      return;
    }
    const fresh = new Set((inserted ?? []).map((r) => `${r.category_id}:${r.threshold}`));

    for (const n of notices) {
      if (!fresh.has(`${n.categoryId}:${n.threshold}`)) continue; // outra requisição já mandou
      const msg = thresholdMessage(n, ym);
      await sendToHousehold(supabase, householdId, {
        ...msg,
        url: `/transactions?category_id=${n.categoryId}`,
        tag: `budget:${ym}:${n.categoryId}`,
      });
    }
  } catch (e) {
    console.error("[budget-notify]", e instanceof Error ? e.message : e);
  }
}

/** Registra uma importação de extrato (o lembrete semanal olha a última). */
export async function logImport(
  supabase: SupabaseClient,
  householdId: string,
  userId: string,
  source: string,
  inserted: number,
): Promise<void> {
  const { error } = await supabase
    .from(dbTables.importLog)
    .insert({ household_id: householdId, user_id: userId, source, inserted });
  if (error) console.error("[import-log]", error.message);
}
