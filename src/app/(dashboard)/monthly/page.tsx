import { MonthFilter, type MonthOption, type Preset } from "./MonthFilter";
import { MonthlyView } from "./MonthlyView";
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
  searchParams: Promise<{ from?: string; to?: string }>;
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

  // Primeiro mês com lançamento: limita as opções do filtro.
  const { data: firstRow } = await supabase
    .from(dbTables.transactions)
    .select("date")
    .eq("household_id", householdId)
    .order("date")
    .limit(1)
    .maybeSingle();
  const firstYm = firstRow?.date ? ymOf(firstRow.date as string) : currentYm;

  // O Supabase devolve no máximo 1000 linhas por consulta: busca em páginas.
  const rows: FlowRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from(dbTables.transactions)
      .select("amount, type, date")
      .eq("household_id", householdId)
      .eq("exclude_from_totals", false)
      .gte("date", start)
      .lte("date", end)
      .order("date")
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as FlowRow[]));
    if (!data || data.length < PAGE) break;
  }

  const all = monthlyFlows(rows, { from: range.from, to: range.to });
  const summary = summarizeMonths(all, currentYm);
  // Sem filtro, corta os meses vazios do começo; com filtro, mostra o que foi pedido.
  const months =
    range.custom || !summary.firstWithData ? all : all.filter((m) => m.ym >= summary.firstWithData!);

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
      />
      <MonthlyView
        key={`${range.from}_${range.to}`}
        months={months}
        summary={summary}
        currentYm={currentYm}
      />
    </div>
  );
}
