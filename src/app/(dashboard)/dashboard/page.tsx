import { DashboardView } from "./DashboardView";
import { pendingCardPayments } from "@/lib/card-payment-match";
import { chartColorAt } from "@/lib/chart-colors";
import { dbCategoryEmbedKey, dbTables } from "@/lib/db-tables";
import { sumIncomeExpense } from "@/lib/dashboard-aggregates";
import { getMyHouseholdId } from "@/lib/household-cache";
import {
  addMonths,
  compareYearMonth,
  currentYearMonth,
  formatYearMonth,
  monthLabel,
  monthRange,
  parseYearMonth,
  type YearMonth,
} from "@/lib/month";
import { createClient } from "@/lib/supabase/server";
import { embedCategoryName } from "@/lib/supabase-joins";

type PeriodKey = "1" | "3" | "6" | "12";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "1", label: "Mês" },
  { key: "3", label: "3 meses" },
  { key: "6", label: "6 meses" },
  { key: "12", label: "12 meses" },
];

/** Período terminando no mês escolhido (no fuso do app). */
function resolvePeriod(rawPeriod: string | undefined, ym: YearMonth) {
  const key = (["1", "3", "6", "12"].includes(rawPeriod ?? "")
    ? rawPeriod
    : "1") as PeriodKey;
  const months = Number(key);
  const { end } = monthRange(ym);
  const first = addMonths(ym, -(months - 1));
  const { start } = monthRange(first);
  const label =
    key === "1" ? monthLabel(ym) : `${monthLabel(first)} a ${monthLabel(ym)}`;
  return { key, start, end, label };
}

function dashboardHref(period: PeriodKey, ym: YearMonth, current: YearMonth) {
  const params = new URLSearchParams();
  if (period !== "1") params.set("period", period);
  if (compareYearMonth(ym, current) !== 0) params.set("month", formatYearMonth(ym));
  const q = params.toString();
  return q ? `/dashboard?${q}` : "/dashboard";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const householdId = await getMyHouseholdId();
  if (!householdId) return null;

  const thisMonth = currentYearMonth();
  const selected = parseYearMonth(sp.month) ?? thisMonth;
  const period = resolvePeriod(sp.period, selected);
  const prevMonth = addMonths(selected, -1);
  const nextMonth = addMonths(selected, 1);
  const canGoNext = compareYearMonth(nextMonth, thisMonth) <= 0;
  const inPeriod = period.key === "1" ? "no mês" : "no período";

  const [
    { data: categories },
    { data: expenses },
    { data: flows },
    { data: recent },
    { data: cardPayments },
    { data: statements },
  ] = await Promise.all([
    supabase
      .from(dbTables.categories)
      .select("id, name, monthly_limit, target_percent, kind")
      .eq("household_id", householdId)
      .order("name"),
    supabase
      .from(dbTables.transactions)
      .select(`amount, category_id, ${dbCategoryEmbedKey}(name)`)
      .eq("household_id", householdId)
      .eq("type", "expense")
      .eq("exclude_from_totals", false)
      .gte("date", period.start.toISOString())
      .lte("date", period.end.toISOString()),
    supabase
      .from(dbTables.transactions)
      .select("amount, type")
      .eq("household_id", householdId)
      .eq("exclude_from_totals", false)
      .gte("date", period.start.toISOString())
      .lte("date", period.end.toISOString()),
    supabase
      .from(dbTables.transactions)
      .select(`id, description, amount, date, type, ${dbCategoryEmbedKey}(name)`)
      .eq("household_id", householdId)
      .gte("date", period.start.toISOString())
      .lte("date", period.end.toISOString())
      .order("date", { ascending: false })
      .limit(6),
    supabase
      .from(dbTables.transactions)
      .select("id, amount, date")
      .eq("household_id", householdId)
      .eq("card_payment", true)
      .eq("card_payment_dismissed", false),
    supabase
      .from(dbTables.cardStatements)
      .select("new_balance, period_end")
      .eq("household_id", householdId),
  ]);

  const pendingCards = pendingCardPayments(
    (cardPayments ?? []).map((p) => ({
      id: p.id as string,
      amount: Number(p.amount),
      date: p.date as string,
    })),
    (statements ?? []).map((s) => ({
      newBalance: Number(s.new_balance),
      periodEnd: s.period_end as string,
    })),
  );

  const totals = sumIncomeExpense(flows ?? []);

  // Gasto por categoria (por id), ordenado do maior para o menor.
  const spentById = new Map<string, { name: string; value: number }>();
  for (const row of expenses ?? []) {
    const id = row.category_id as string;
    const name =
      embedCategoryName(row as unknown as Record<string, unknown>) ?? "Sem categoria";
    const cur = spentById.get(id) ?? { name, value: 0 };
    cur.value += Number(row.amount);
    spentById.set(id, cur);
  }
  const totalExpense = [...spentById.values()].reduce((a, b) => a + b.value, 0);
  const ranked = [...spentById.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.value - a.value)
    .map((r, i) => ({ ...r, color: chartColorAt(i) }));
  const colorById = new Map(ranked.map((r) => [r.id, r.color]));

  const cents = (n: number) => Math.round(n * 100);
  const budgetRows = (categories ?? [])
    .filter((c) => (c.kind ?? "expense") !== "income")
    .map((c) => {
      const spent = spentById.get(c.id)?.value ?? 0;
      const limit = Number(c.monthly_limit) * (period.key === "1" ? 1 : Number(period.key));
      const target = Number(c.target_percent ?? 0);
      const share = totalExpense > 0 ? (spent / totalExpense) * 100 : 0;
      const atLimit = limit > 0 && cents(spent) === cents(limit);
      return {
        id: c.id as string,
        name: c.name as string,
        spent,
        limit,
        target,
        share,
        overLimit: limit > 0 && cents(spent) > cents(limit),
        atLimit,
        nearLimit: limit > 0 && spent > limit * 0.8 && cents(spent) < cents(limit),
        overTarget: target > 0 && share > target,
        color: colorById.get(c.id) ?? "var(--border)",
      };
    })
    .sort((a, b) => b.spent - a.spent);

  return (
    <DashboardView
      periodLabel={period.label}
      periodLinks={PERIODS.map((pl) => ({
        key: pl.key,
        label: pl.label,
        href: dashboardHref(pl.key, selected, thisMonth),
        active: period.key === pl.key,
      }))}
      prevHref={dashboardHref(period.key, prevMonth, thisMonth)}
      nextHref={canGoNext ? dashboardHref(period.key, nextMonth, thisMonth) : null}
      inPeriod={inPeriod}
      totals={totals}
      ranked={ranked}
      totalExpense={totalExpense}
      activeRows={budgetRows.filter((r) => r.spent > 0 || r.limit > 0)}
      idleNames={budgetRows.filter((r) => r.spent === 0 && r.limit === 0).map((r) => r.name)}
      recent={(recent ?? []).map((t) => ({
        id: t.id as string,
        description: t.description as string,
        amount: Number(t.amount),
        date: t.date as string,
        type: t.type === "income" ? "income" : "expense",
        categoryName: embedCategoryName(t as unknown as Record<string, unknown>) ?? null,
      }))}
      categories={(categories ?? []).map((c) => ({ id: c.id as string, name: c.name as string }))}
      pendingCards={pendingCards}
    />
  );
}
