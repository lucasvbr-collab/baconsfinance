import { CategorySpendBars } from "@/components/CategorySpendBars";
import { FinancialSummary } from "@/components/FinancialSummary";
import { InvoiceUpload } from "@/components/InvoiceUpload";
import { SpendingPie } from "@/components/SpendingPie";
import { dbCategoryEmbedKey, dbTables } from "@/lib/db-tables";
import { sumIncomeExpense } from "@/lib/dashboard-aggregates";
import { monthNetChangeSubtitle } from "@/lib/finance-copy";
import { formatBRL } from "@/lib/format";
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const householdId = await getMyHouseholdId();
  if (!householdId) return null;

  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  const prevStart = startOfMonth(subMonths(now, 1));
  const prevEnd = endOfMonth(subMonths(now, 1));

  const [
    { data: categories },
    { data: expenses },
    { data: monthFlows },
    { data: prevMonthFlows },
    { data: allFlows },
    { data: recent },
  ] = await Promise.all([
    supabase
      .from(dbTables.categories)
      .select("id, name, monthly_limit")
      .eq("household_id", householdId)
      .order("name"),
    supabase
      .from(dbTables.transactions)
      .select(`amount, category_id, ${dbCategoryEmbedKey}(name)`)
      .eq("household_id", householdId)
      .eq("type", "expense")
      .gte("date", start.toISOString())
      .lte("date", end.toISOString()),
    supabase
      .from(dbTables.transactions)
      .select("amount, type")
      .eq("household_id", householdId)
      .gte("date", start.toISOString())
      .lte("date", end.toISOString()),
    supabase
      .from(dbTables.transactions)
      .select("amount, type")
      .eq("household_id", householdId)
      .gte("date", prevStart.toISOString())
      .lte("date", prevEnd.toISOString()),
    supabase
      .from(dbTables.transactions)
      .select("amount, type")
      .eq("household_id", householdId),
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

  const pieData = [...byName.entries()].map(([name, value]) => ({
    name,
    value,
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
  const prevAgg = sumIncomeExpense(prevMonthFlows ?? []);
  const allAgg = sumIncomeExpense(allFlows ?? []);
  const savedMonth = monthAgg.net;
  const pctOfIncome =
    monthAgg.income > 0
      ? ((savedMonth / monthAgg.income) * 100).toFixed(1).replace(".", ",")
      : null;

  const balanceHint = monthNetChangeSubtitle(monthAgg.net, prevAgg.net);
  const savedSubtitle =
    pctOfIncome !== null
      ? `${pctOfIncome}% da receita no mês`
      : savedMonth >= 0
        ? "Receitas e despesas do mês"
        : "Despesas acima das receitas no mês";

  const summaryCards = [
    {
      title: "Saldo total",
      value: formatBRL(allAgg.net),
      subtitle: balanceHint.text,
      subtitleClassName: balanceHint.className,
    },
    {
      title: "Receitas",
      value: formatBRL(monthAgg.income),
      subtitle: "Total no mês",
      subtitleClassName: "text-success",
    },
    {
      title: "Despesas",
      value: formatBRL(monthAgg.expense),
      subtitle: "Total no mês",
      subtitleClassName: "text-danger",
    },
    {
      title: "Economizado",
      value: formatBRL(savedMonth),
      subtitle: savedSubtitle,
      subtitleClassName:
        savedMonth >= 0 ? "text-success" : "text-danger",
      valueClassName: savedMonth >= 0 ? "text-success" : "text-danger",
    },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Painel
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            {format(start, "MMMM yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      <FinancialSummary cards={summaryCards} />

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card-elevated/90 p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Despesas por categoria
          </h2>
          <CategorySpendBars data={pieData} />
          <div className="mt-8 border-t border-border/80 pt-6">
            <h3 className="text-sm font-medium text-foreground/70">
              Distribuição
            </h3>
            <SpendingPie data={pieData} />
          </div>
        </div>
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
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card-elevated/90 p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Orçamentos do mês
        </h2>
        <ul className="mt-5 space-y-5">
          {(categories ?? []).map((c) => {
            const spent = spentByCategoryId[c.id] ?? 0;
            const limit = Number(c.monthly_limit);
            const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
            const over = limit > 0 && spent > limit;
            return (
              <li key={c.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{c.name}</span>
                  <span className={over ? "text-danger" : "text-foreground/70"}>
                    {formatBRL(spent)} /{" "}
                    {limit > 0 ? formatBRL(limit) : "sem limite"}
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
                  {sign} {formatBRL(Number(t.amount))}
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
