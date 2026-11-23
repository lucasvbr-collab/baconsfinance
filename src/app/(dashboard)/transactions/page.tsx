import { ReviewPending } from "@/components/ReviewPending";
import { TransactionList } from "./TransactionList";
import { dbCategoryEmbedKey, dbTables } from "@/lib/db-tables";
import { getMyHouseholdId } from "@/lib/household-cache";
import { createClient } from "@/lib/supabase/server";
import { embedCategoryName } from "@/lib/supabase-joins";
import {
  currentYearMonth,
  formatYearMonth,
  lastDayOfMonth,
  zonedDayEnd,
  zonedDayStart,
} from "@/lib/month";
import { searchPattern } from "@/lib/search";
import { sumIncomeExpense } from "@/lib/dashboard-aggregates";
import { formatCAD } from "@/lib/format";

type Search = { from?: string; to?: string; category_id?: string; q?: string };

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
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
  const defaultFrom = `${formatYearMonth(thisMonth)}-01`;
  const defaultTo = lastDayOfMonth(thisMonth);
  const fromStart = zonedDayStart(sp.from ?? "");
  const toEnd = zonedDayEnd(sp.to ?? "");
  const from = fromStart ? sp.from! : defaultFrom;
  const to = toEnd ? sp.to! : defaultTo;

  const fromIso = (fromStart ?? zonedDayStart(defaultFrom)!).toISOString();
  const toIso = (toEnd ?? zonedDayEnd(defaultTo)!).toISOString();

  const { data: categories } = await supabase
    .from(dbTables.categories)
    .select("id, name")
    .eq("household_id", householdId)
    .order("name");

  const rawCategory = sp.category_id?.trim() ?? "";
  const categoryFilter =
    rawCategory &&
    isUuid(rawCategory) &&
    (categories ?? []).some((c) => c.id === rawCategory)
      ? rawCategory
      : undefined;

  let txQuery = supabase
    .from(dbTables.transactions)
    .select(
      `id, description, amount, date, type, status, exclude_from_totals, ${dbCategoryEmbedKey}(name)`,
    )
    .eq("household_id", householdId)
    .order("date", { ascending: false });

  const query = sp.q?.trim() ?? "";
  const pattern = searchPattern(query);
  // Busca vinda do topo (sem datas) olha todos os meses.
  const searchAllTime = Boolean(pattern) && !sp.from && !sp.to;
  txQuery = searchAllTime
    ? txQuery.limit(500)
    : txQuery.gte("date", fromIso).lte("date", toIso);
  if (pattern) {
    txQuery = txQuery.ilike("description", pattern);
  }
  if (categoryFilter) {
    txQuery = txQuery.eq("category_id", categoryFilter);
  }

  const [{ data: rows }, { data: pendingRows }] = await Promise.all([
    txQuery,
    supabase
      .from(dbTables.transactions)
      .select(
        `id, description, amount, date, type, ${dbCategoryEmbedKey}(name)`,
      )
      .eq("household_id", householdId)
      .eq("status", "pending_review")
      .order("date", { ascending: false })
      .limit(50),
  ]);

  const allRows = rows ?? [];
  const counted = allRows.filter((t) => !t.exclude_from_totals);
  const sums = sumIncomeExpense(counted);
  const excludedCount = allRows.length - counted.length;
  const hitLimit = searchAllTime && allRows.length >= 500;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-3xl">
          Extrato
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          {searchAllTime
            ? `Resultados para “${query}” em todos os meses.`
            : query
              ? `Resultados para “${query}” no período selecionado.`
              : "Entradas e saídas no período selecionado."}
        </p>
      </div>

      <ReviewPending
        rows={(pendingRows ?? []).map((t) => ({
          id: t.id,
          description: t.description,
          amount: Number(t.amount),
          date: t.date,
          type: t.type as "income" | "expense",
          categoryName: embedCategoryName(
            t as unknown as Record<string, unknown>,
          ) ?? null,
        }))}
      />

      <form
        className="grid grid-cols-2 gap-3 rounded-3xl bg-card p-5 shadow-card sm:flex sm:flex-wrap sm:items-end sm:gap-4 sm:p-6"
        method="get"
      >
        <div className="col-span-2 sm:w-full">
          <label className="mb-1.5 block text-xs font-medium text-foreground/55">
            Buscar na descrição
          </label>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Ex.: Uber, Costco"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none ring-accent/40 focus:ring-2"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground/55">
            De
          </label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none ring-accent/40 focus:ring-2"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground/55">
            Até
          </label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none ring-accent/40 focus:ring-2"
          />
        </div>
        <div className="col-span-2 sm:min-w-[200px] sm:flex-1">
          <label className="mb-1.5 block text-xs font-medium text-foreground/55">
            Categoria
          </label>
          <select
            name="category_id"
            defaultValue={categoryFilter ?? ""}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none ring-accent/40 focus:ring-2"
          >
            <option value="">Todas</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="col-span-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent transition hover:brightness-110"
        >
          Filtrar
        </button>
</form>

      {allRows.length > 0 && (
        <section
          aria-label="Soma dos lançamentos filtrados"
          className="flex flex-wrap items-baseline gap-x-8 gap-y-2 rounded-3xl bg-card px-5 py-4 shadow-card sm:px-6"
        >
          <p className="text-sm text-foreground/60">
            {allRows.length} {allRows.length === 1 ? "lançamento" : "lançamentos"}
            {hitLimit && " (mostrando os 500 mais recentes)"}
          </p>
          <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
            {sums.expense > 0 && (
              <div className="flex items-baseline gap-2">
                <dt className="text-sm text-foreground/60">Saiu</dt>
                <dd className="money text-lg font-bold">−{formatCAD(sums.expense)}</dd>
              </div>
            )}
            {sums.income > 0 && (
              <div className="flex items-baseline gap-2">
                <dt className="text-sm text-foreground/60">Entrou</dt>
                <dd className="money text-lg font-bold text-success">+{formatCAD(sums.income)}</dd>
              </div>
            )}
            {sums.income > 0 && sums.expense > 0 && (
              <div className="flex items-baseline gap-2">
                <dt className="text-sm text-foreground/60">Saldo</dt>
                <dd className={`money text-lg font-bold ${sums.net >= 0 ? "text-success" : "text-danger"}`}>
                  {sums.net >= 0 ? "+" : "−"}
                  {formatCAD(Math.abs(sums.net))}
                </dd>
              </div>
            )}
          </dl>
          {excludedCount > 0 && (
            <p className="w-full text-xs text-foreground/50">
              {excludedCount === 1
                ? "1 lançamento marcado como “não conta” ficou fora da soma."
                : `${excludedCount} lançamentos marcados como “não conta” ficaram fora da soma.`}
            </p>
          )}
        </section>
      )}

      <TransactionList
        rows={allRows.map((t) => ({
          id: t.id as string,
          description: t.description as string,
          amount: Number(t.amount),
          date: t.date as string,
          type: t.type === "income" ? "income" : "expense",
          pending: t.status === "pending_review",
          excluded: Boolean(t.exclude_from_totals),
          categoryName:
            embedCategoryName(t as unknown as Record<string, unknown>) ?? null,
        }))}
      />
    </div>
  );
}
