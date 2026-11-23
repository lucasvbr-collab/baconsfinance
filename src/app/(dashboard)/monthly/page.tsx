import { MonthFilter, type MonthOption, type Preset } from "./MonthFilter";
import { CategoryView } from "./CategoryView";
import { MonthlyView } from "./MonthlyView";
import { categoryMonthly, summarizeSeries, topSources, type CategoryRow } from "@/lib/category-monthly";
import { dbTables } from "@/lib/db-tables";
import { getMyHouseholdId } from "@/lib/household-cache";
import {
  addMonths,
  APP_TZ,
  currentYearMonth,
  formatYearMonth,
  monthRange,
  parseYearMonth,
} from "@/lib/month";
import {
  monthlyFlows,
  resolveMonthRange,
  summarizeMonths,
  type FlowRow,
} from "@/lib/monthly-flows";
import { createClient } from "@/lib/supabase/server";

const PAGE = 1000;

const MONTH_LONG = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function ymOf(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ, year: "numeric", month: "2-digit" })
    .format(new Date(iso))
    .slice(0, 7);
}

export default async function MonthlyPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const householdId = await getMyHouseholdId();
  if (!householdId) return null;

  const current = currentYearMonth();
  const currentYm = formatYearMonth(current);
  const range = resolveMonthRange(sp.from, sp.to, current);
  const start = monthRange(parseYearMonth(range.from)!).start.toISOString();
  const end = monthRange(parseYearMonth(range.to)!).end.toISOString();

  // Primeiro mês com lançamento (limita as opções do filtro) e categorias do lar.
  const [{ data: firstRow }, { data: categoryRows }] = await Promise.all([
    supabase
      .from(dbTables.transactions)
      .select("date")
      .eq("household_id", householdId)
      .order("date")
      .limit(1)
      .maybeSingle(),
    supabase
      .from(dbTables.categories)
      .select("id, name, kind, monthly_limit")
      .eq("household_id", householdId)
      .order("name"),
  ]);
  const categories = (categoryRows ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    kind: (c.kind === "income" ? "income" : "expense") as "income" | "expense",
    limit: Number(c.monthly_limit) || 0,
  }));
  const category = categories.find((c) => c.id === sp.category) ?? null;
  const firstYm = firstRow?.date ? ymOf(firstRow.date as string) : currentYm;

  // O Supabase devolve no máximo 1000 linhas por consulta: busca em páginas.
  const rows: CategoryRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    let q = supabase
      .from(dbTables.transactions)
      .select("amount, type, date, description")
      .eq("household_id", householdId)
      .eq("exclude_from_totals", false)
      .gte("date", start)
      .lte("date", end);
    if (category) q = q.eq("category_id", category.id);
    const { data, error } = await q.order("date").range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as CategoryRow[]));
    if (!data || data.length < PAGE) break;
  }

  const all = monthlyFlows(rows as FlowRow[], { from: range.from, to: range.to });
  const summary = summarizeMonths(all, currentYm);
  // Sem filtro, corta os meses vazios do começo; com filtro, mostra o que foi pedido.
  const months =
    range.custom || !summary.firstWithData ? all : all.filter((m) => m.ym >= summary.firstWithData!);

  // Com categoria: mesmos meses mostrados no "Todas" (sem os vazios do começo, se não houver filtro).
  const firstShown = months[0]?.ym ?? range.from;
  const categoryPoints = category
    ? categoryMonthly(rows, { from: range.custom ? range.from : firstShown, to: range.to }, category.kind)
    : null;

  const options: MonthOption[] = [];
  for (let ym = parseYearMonth(firstYm)!; formatYearMonth(ym) <= currentYm; ym = addMonths(ym, 1)) {
    options.push({ value: formatYearMonth(ym), label: `${MONTH_LONG[ym.month - 1]} ${ym.year}` });
  }
  const last = (n: number) => formatYearMonth(addMonths(current, -(n - 1)));
  const presets: Preset[] = [
    { label: "3 meses", from: last(3), to: currentYm },
    { label: "6 meses", from: last(6), to: currentYm },
    { label: "12 meses", from: last(12), to: currentYm, isDefault: true },
    { label: "Este ano", from: `${current.year}-01`, to: currentYm },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-3xl">Mês a mês</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Quanto entrou, quanto saiu e quanto sobrou em cada mês. Transferências entre contas
          suas não contam.
        </p>
      </div>
      <MonthFilter
        from={range.from}
        to={range.to}
        custom={range.custom}
        options={options}
        presets={presets}
        categories={categories}
        categoryId={category?.id ?? null}
      />
      {category ? (
        <CategoryView
          key={`${category.id}_${range.from}_${range.to}`}
          category={category}
          points={categoryPoints!}
          summary={summarizeSeries(categoryPoints!, currentYm)}
          sources={topSources(rows, category.kind)}
          currentYm={currentYm}
        />
      ) : (
        <MonthlyView
          key={`${range.from}_${range.to}`}
          months={months}
          summary={summary}
          currentYm={currentYm}
        />
      )}
    </div>
  );
}
