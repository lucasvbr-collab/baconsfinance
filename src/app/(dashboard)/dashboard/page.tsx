import { CardPaymentAlerts } from "@/components/CardPaymentAlerts";
import { Icon } from "@/components/Icon";
import { InvoiceUpload } from "@/components/InvoiceUpload";
import { pendingCardPayments } from "@/lib/card-payment-match";
import { chartColorAt } from "@/lib/chart-colors";
import { dbCategoryEmbedKey, dbTables } from "@/lib/db-tables";
import { sumIncomeExpense } from "@/lib/dashboard-aggregates";
import { formatCAD } from "@/lib/format";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

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

function initial(name: string | null | undefined): string {
  const t = name?.trim();
  return t ? t[0]!.toLocaleUpperCase("pt-BR") : "?";
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
    .sort((a, b) => b.value - a.value);
  const colorById = new Map(ranked.map((r, i) => [r.id, chartColorAt(i)]));

  const budgetRows = (categories ?? [])
    .filter((c) => (c.kind ?? "expense") !== "income")
    .map((c) => {
      const spent = spentById.get(c.id)?.value ?? 0;
      const limit = Number(c.monthly_limit) * (period.key === "1" ? 1 : Number(period.key));
      const target = Number(c.target_percent ?? 0);
      const share = totalExpense > 0 ? (spent / totalExpense) * 100 : 0;
      return {
        id: c.id,
        name: c.name,
        spent,
        limit,
        target,
        share,
        overLimit: limit > 0 && spent > limit,
        nearLimit: limit > 0 && spent > limit * 0.8 && spent <= limit,
        overTarget: target > 0 && share > target,
        color: colorById.get(c.id) ?? "var(--border)",
      };
    })
    .sort((a, b) => b.spent - a.spent);
  const activeRows = budgetRows.filter((r) => r.spent > 0 || r.limit > 0);
  const idleNames = budgetRows
    .filter((r) => r.spent === 0 && r.limit === 0)
    .map((r) => r.name);

  const net = totals.net;
  const hasData = totals.income > 0 || totals.expense > 0;

  return (
    <div className="space-y-6 lg:space-y-8">
      <h1 className="font-display text-2xl font-bold tracking-tight lg:text-3xl">
        Painel
      </h1>

      <CardPaymentAlerts payments={pendingCards} />

      {/* Cartão do mês */}
      <section
        aria-label={`Resumo de ${period.label}`}
        className="rounded-[28px] bg-plum p-5 text-white shadow-plum sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Link
              href={dashboardHref(period.key, prevMonth, thisMonth)}
              aria-label="Mês anterior"
              className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <Icon name="chevronLeft" />
            </Link>
            <span className="min-w-[8.5rem] text-center text-sm font-semibold capitalize text-white/90">
              {period.label}
            </span>
            {canGoNext ? (
              <Link
                href={dashboardHref(period.key, nextMonth, thisMonth)}
                aria-label="Próximo mês"
                className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <Icon name="chevronRight" />
              </Link>
            ) : (
              <span className="p-1.5 text-white/20" aria-hidden>
                <Icon name="chevronRight" />
              </span>
            )}
          </div>
          <div className="flex rounded-full bg-white/10 p-1" role="group" aria-label="Período">
            {PERIODS.map((p) => (
              <Link
                key={p.key}
                href={dashboardHref(p.key, selected, thisMonth)}
                aria-current={period.key === p.key ? "true" : undefined}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  period.key === p.key
                    ? "bg-lime text-plum"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 sm:mt-10">
          <p className="text-sm font-medium text-white/65">
            {net >= 0 ? `Sobrou ${inPeriod}` : `Faltou ${inPeriod}`}
          </p>
          <p
            className={`money mt-1 font-display text-5xl font-bold leading-none tracking-tight sm:text-7xl ${
              net >= 0 ? "text-lime" : "text-[#ff9db5]"
            }`}
          >
            {formatCAD(Math.abs(net))}
          </p>
          <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div className="flex items-baseline gap-2">
              <dt className="text-white/60">Entrou</dt>
              <dd className="money font-semibold text-[#7ee8b5]">
                +{formatCAD(totals.income)}
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="text-white/60">Saiu</dt>
              <dd className="money font-semibold text-white">
                −{formatCAD(totals.expense)}
              </dd>
            </div>
          </dl>
        </div>

        {totalExpense > 0 ? (
          <div className="mt-8">
            <p className="text-sm font-medium text-white/65">Para onde foi</p>
            <div
              className="bf-stripe mt-3 flex h-3.5 gap-[3px] overflow-hidden rounded-full"
              role="img"
              aria-label={ranked
                .map((r) => `${r.name} ${((r.value / totalExpense) * 100).toFixed(0)}%`)
                .join(", ")}
            >
              {ranked.map((r) => (
                <span
                  key={r.id}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${(r.value / totalExpense) * 100}%`,
                    backgroundColor: colorById.get(r.id),
                  }}
                />
              ))}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              {ranked.slice(0, 6).map((r) => (
                <li key={r.id} className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: colorById.get(r.id) }}
                    aria-hidden
                  />
                  <span className="truncate text-white/80">{r.name}</span>
                  <span className="money ml-auto shrink-0 font-semibold">
                    {((r.value / totalExpense) * 100).toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-8 text-sm text-white/65">
            Nenhuma saída {inPeriod}.
          </p>
        )}
      </section>

      {!hasData && (
        <div className="flex flex-col items-start gap-3 rounded-3xl border border-dashed border-accent/40 bg-accent-muted p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground/80">
            Ainda não há lançamentos {inPeriod}. Importe o CSV do RBC para
            preencher o painel.
          </p>
          <Link
            href="/transactions/import"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent"
          >
            <Icon name="upload" className="h-4 w-4" />
            Importar extrato
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:gap-8">
        {/* Categorias e orçamento */}
        <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl font-bold tracking-tight">
              Categorias
            </h2>
            <Link
              href="/categories"
              className="text-sm font-semibold text-accent hover:underline"
            >
              Ajustar limites
            </Link>
          </div>

          <ul className="mt-5 space-y-5">
            {activeRows.map((r) => {
              const barPct =
                r.limit > 0
                  ? Math.min(100, (r.spent / r.limit) * 100)
                  : Math.min(100, r.share);
              const barColor = r.overLimit
                ? "var(--danger)"
                : r.nearLimit
                  ? "var(--warn)"
                  : r.color;
              return (
                <li key={r.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 font-semibold">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: r.color }}
                        aria-hidden
                      />
                      <span className="truncate">{r.name}</span>
                    </span>
                    <span className="money shrink-0 font-semibold">
                      {formatCAD(r.spent)}
                      {r.limit > 0 && (
                        <span className="font-medium text-foreground/45">
                          {" "}
                          de {formatCAD(r.limit)}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${barPct}%`, backgroundColor: barColor }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-foreground/55">
                    {r.share.toFixed(1)}% das saídas
                    {r.target > 0 && (
                      <span className={r.overTarget ? "font-semibold text-danger" : ""}>
                        {", "}meta {r.target}%
                      </span>
                    )}
                    {r.overLimit && (
                      <span className="font-semibold text-danger">
                        {", "}passou {formatCAD(r.spent - r.limit)} do limite
                      </span>
                    )}
                  </p>
                </li>
              );
            })}
            {activeRows.length === 0 && (
              <li className="text-sm text-foreground/60">
                Nenhum gasto {inPeriod}.{" "}
                <Link href="/categories" className="font-semibold text-accent underline">
                  Criar ou ajustar categorias
                </Link>
              </li>
            )}
          </ul>

          {idleNames.length > 0 && activeRows.length > 0 && (
            <p className="mt-6 border-t border-border pt-4 text-xs text-foreground/50">
              Sem gastos {inPeriod}: {idleNames.join(", ")}.
            </p>
          )}
        </section>

        <div className="space-y-6 lg:space-y-8">
          {/* Últimas transações */}
          <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-xl font-bold tracking-tight">
                Últimos lançamentos
              </h2>
              <Link
                href="/transactions"
                className="text-sm font-semibold text-accent hover:underline"
              >
                Ver extrato
              </Link>
            </div>
            <ul className="mt-4 divide-y divide-border">
              {(recent ?? []).map((t) => {
                const cat = embedCategoryName(t as unknown as Record<string, unknown>);
                const income = t.type === "income";
                return (
                  <li key={t.id}>
                    <Link
                      href={`/transactions/${t.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-background"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
                          income ? "bg-success-soft text-success" : "bg-accent-muted text-accent"
                        }`}
                        aria-hidden
                      >
                        {initial(cat)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {t.description || "Sem descrição"}
                        </span>
                        <span className="mt-0.5 block text-xs text-foreground/55">
                          {cat ?? "Sem categoria"}, {format(new Date(t.date), "d 'de' MMM", { locale: ptBR })}
                        </span>
                      </span>
                      <span
                        className={`money shrink-0 text-sm font-bold ${
                          income ? "text-success" : "text-foreground"
                        }`}
                      >
                        {income ? "+" : "−"}
                        {formatCAD(Number(t.amount))}
                      </span>
                    </Link>
                  </li>
                );
              })}
              {(recent ?? []).length === 0 && (
                <li className="py-8 text-center text-sm text-foreground/55">
                  Nenhum lançamento {inPeriod}.
                </li>
              )}
            </ul>
          </section>

          {/* Adicionar */}
          <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
            <h2 className="font-display text-xl font-bold tracking-tight">
              Adicionar lançamentos
            </h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link
                href="/transactions/import"
                className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-on-accent transition hover:brightness-110"
              >
                <Icon name="upload" className="h-4 w-4" />
                Importar CSV do RBC
              </Link>
              <Link
                href="/transactions/new"
                className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold transition hover:border-accent hover:text-accent"
              >
                <Icon name="plus" className="h-4 w-4" />
                Lançar à mão
              </Link>
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <InvoiceUpload categories={categories ?? []} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
