import { CategorySpendBars } from "@/components/CategorySpendBars";
import { FinancialSummary } from "@/components/FinancialSummary";
import { InvoiceUpload } from "@/components/InvoiceUpload";
import { SpendingPie } from "@/components/SpendingPie";
import { dbCategoryEmbedKey, dbTables } from "@/lib/db-tables";
import { sumIncomeExpense } from "@/lib/dashboard-aggregates";
import { formatCAD } from "@/lib/format";
import { getMyHouseholdId } from "@/lib/household-cache";
import { createClient } from "@/lib/supabase/server";
import { embedCategoryName } from "@/lib/supabase-joins";
import {
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

function categoryInitial(name: string | null | undefined): string {
  const t = name?.trim();
  if (!t) return "?";
  return t[0]!.toLocaleUpperCase("pt-BR");
}

type PeriodKey = "1" | "3" | "6" | "12";

function resolvePeriod(raw: string | undefined): {
  key: PeriodKey;
  start: Date;
  end: Date;
  label: string;
} {
  const key = (["1", "3", "6", "12"].includes(raw ?? "")
    ? raw
    : "1") as PeriodKey;
  const end = endOfMonth(new Date());
  if (key === "1") {
    const start = startOfMonth(new Date());
    return {
      key,
      start,
      end,
      label: format(start, "MMMM yyyy", { locale: ptBR }),
    };
  }
  const months = Number(key);
  const start = startOfMonth(subMonths(end, months - 1));
  return {
    key,
    start,
    end,
    label: `Últimos ${months} meses`,
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const householdId = await getMyHouseholdId();
  if (!householdId) return null;

  const period = resolvePeriod(sp.period);

  const [
    { data: categories },
    { data: expenses },
    { data: monthFlows },
    { data: recent },
  ] = await Promise.all([
    supabase
      .from(dbTables.categories)
      .select("id, name, monthly_limit, target_percent")
      .eq("household_id", householdId)
      .order("name"),
    supabase
      .from(dbTables.transactions)
      .select(`amount, category_id, ${dbCategoryEmbedKey}(name)`)
      .eq("household_id", householdId)
      .eq("type", "expense")
      .gte("date", period.start.toISOString())
      .lte("date", period.end.toISOString()),
    supabase
      .from(dbTables.transactions)
      .select("amount, type")
      .eq("household_id", householdId)
      .gte("date", period.start.toISOString())
      .lte("date", period.end.toISOString()),
    supabase
      .from(dbTables.transactions)
      .select(`id, description, amount, date, type, ${dbCategoryEmbedKey}(name)`)
      .eq("household_id", householdId)
      .order("date", { ascending: false })
      .limit(5),
  ]);

  const byName = new Map<string, number>();
  for (const row of expenses ?? []) {
    const name =
      embedCategoryName(row as unknown as Record<string, unknown>) ?? "Sem nome";
    const amt = Number(row.amount);
    byName.set(name, (byName.get(name) ?? 0) + amt);
  }

  const totalExpense = [...byName.values()].reduce((a, b) => a + b, 0);
  const targetByName = new Map(
    (categories ?? []).map((c) => [c.name, Number(c.target_percent ?? 0)]),
  );

  const pieData = [...byName.entries()].map(([name, value]) => ({
    name,
    value,
    percentOfTotal: totalExpense > 0 ? (value / totalExpense) * 100 : 0,
    targetPercent: targetByName.get(name) ?? 0,
  }));

  const spentByCategoryId = (expenses ?? []).reduce<Record<string, number>>(
    (acc, row) => {
      const id = row.category_id as string;
      acc[id] = (acc[id] ?? 0) + Number(row.amount);
      return acc;
    },
    {},
  );

  const monthAgg = sumIncomeExpense(monthFlows ?? []);

  const summaryCards = [
    {
      title: "Receitas",
      value: formatCAD(monthAgg.income),
      subtitle: period.key === "1" ? "Total no mês" : "Total no período",
      subtitleClassName: "text-success",
    },
    {
      title: "Despesas",
      value: formatCAD(monthAgg.expense),
      subtitle: period.key === "1" ? "Total no mês" : "Total no período",
      subtitleClassName: "text-danger",
    },
  ];

  const periodLinks: { key: PeriodKey; label: string }[] = [
    { key: "1", label: "Mês" },
    { key: "3", label: "3 meses" },
    { key: "6", label: "6 meses" },
    { key: "12", label: "12 meses" },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Painel
          </h1>
          <p className="mt-1 text-sm text-foreground/60">{period.label}</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card/60 p-1">
          {periodLinks.map((p) => (
            <Link
              key={p.key}
              href={p.key === "1" ? "/dashboard" : `/dashboard?period=${p.key}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                period.key === p.key
                  ? "bg-accent text-black"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <section className="grid gap-8 lg:grid-cols-2">
        <FinancialSummary cards={summaryCards} />
        <div className="space-y-6 rounded-2xl border border-border bg-card-elevated/90 p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Ações rápidas
          </h2>
          <InvoiceUpload categories={categories ?? []} />
          <Link
            href="/transactions/new"
            className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-3 text-center text-sm font-medium text-foreground transition hover:border-accent hover:text-accent"
          >
            Nova transação manual
          </Link>
          <Link
            href="/settings"
            className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-3 text-center text-sm font-medium text-foreground transition hover:border-accent hover:text-accent"
          >
            Conectar banco / sincronizar
          </Link>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card-elevated/90 p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Despesas por categoria
          </h2>
          <p className="mt-1 text-xs text-foreground/50">
            Valor e % do total
            {totalExpense > 0 ? ` (${formatCAD(totalExpense)})` : ""}
          </p>
          <CategorySpendBars data={pieData} />
        </div>
        <div className="rounded-2xl border border-border bg-card-elevated/90 p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Distribuição
          </h2>
          <SpendingPie data={pieData} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card-elevated/90 p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Orçamentos {period.key === "1" ? "do mês" : "no período"}
        </h2>
        <ul className="mt-5 space-y-5">
          {(categories ?? []).map((c) => {
            const spent = spentByCategoryId[c.id] ?? 0;
            const limit = Number(c.monthly_limit);
            const targetPct = Number(c.target_percent ?? 0);
            const actualPct =
              totalExpense > 0 ? (spent / totalExpense) * 100 : 0;
            const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
            const over = limit > 0 && spent > limit;
            const overPct = targetPct > 0 && actualPct > targetPct;
            return (
              <li key={c.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{c.name}</span>
                  <span
                    className={
                      over || overPct ? "text-danger" : "text-foreground/70"
                    }
                  >
                    {formatCAD(spent)}
                    {limit > 0 ? ` / ${formatCAD(limit)}` : ""}
                    {" · "}
                    {actualPct.toFixed(1)}%
                    {targetPct > 0 ? ` (meta ${targetPct}%)` : ""}
                  </span>
                </div>
                {limit > 0 && (
                  <div className="h-3 overflow-hidden rounded-full bg-border">
                    <div
                      className={`h-full rounded-full transition-all ${over ? "bg-danger" : pct > 80 ? "bg-amber-400" : "bg-accent"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </li>
            );
          })}
          {(categories ?? []).length === 0 && (
            <li className="text-sm text-foreground/60">
              Nenhuma categoria.{" "}
              <Link href="/categories" className="text-accent underline">
                Criar categorias
              </Link>
            </li>
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card-elevated/90 p-6 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Últimas transações
          </h2>
          <Link
            href="/transactions"
            className="text-sm font-medium text-accent hover:underline"
          >
            Ver extrato
          </Link>
        </div>
        <ul className="mt-5 divide-y divide-border/80">
          {(recent ?? []).map((t) => {
            const catName = embedCategoryName(
              t as unknown as Record<string, unknown>,
            );
            const sign = t.type === "income" ? "+" : "−";
            const initial = categoryInitial(catName);
            return (
              <li
                key={t.id}
                className="flex items-center gap-4 py-4 first:pt-0"
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold text-foreground/90"
                  aria-hidden
                >
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    {t.description || "Sem descrição"}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground/55">
                    {catName ?? "—"} ·{" "}
                    {format(new Date(t.date), "dd/MM/yyyy")}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-display text-base font-semibold tabular-nums ${
                    t.type === "income" ? "text-success" : "text-danger"
                  }`}
                >
                  {sign} {formatCAD(Number(t.amount))}
                </span>
              </li>
            );
          })}
          {(recent ?? []).length === 0 && (
            <li className="py-10 text-center text-sm text-foreground/55">
              Nenhuma transação ainda.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
