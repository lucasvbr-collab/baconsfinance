import {
  APP_TZ,
  addMonths,
  compareYearMonth,
  formatYearMonth,
  parseYearMonth,
  type YearMonth,
} from "@/lib/month";

/** Meses mostrados sem filtro. */
export const DEFAULT_MONTHS = 12;
/** Maior período aceito no filtro. */
export const MAX_MONTHS = 36;

/**
 * Período do filtro ("YYYY-MM"): valores inválidos viram o padrão (últimos 12
 * meses), "até" não passa do mês atual, "de" e "até" trocados são invertidos.
 */
export function resolveMonthRange(
  fromRaw: string | undefined,
  toRaw: string | undefined,
  current: YearMonth,
): { from: string; to: string; custom: boolean } {
  let from = parseYearMonth(fromRaw);
  let to = parseYearMonth(toRaw);
  const custom = Boolean(from || to);
  const clamp = (ym: YearMonth) => (compareYearMonth(ym, current) > 0 ? current : ym);

  to = clamp(to ?? current);
  from = from ? clamp(from) : addMonths(to, -(DEFAULT_MONTHS - 1));
  if (compareYearMonth(from, to) > 0) [from, to] = [to, from];
  if (compareYearMonth(to, from) >= MAX_MONTHS) from = addMonths(to, -(MAX_MONTHS - 1));

  return { from: formatYearMonth(from), to: formatYearMonth(to), custom };
}

/** Entradas e saídas de um mês (lançamentos que contam nos totais). */
export type MonthFlow = {
  /** "YYYY-MM" */
  ym: string;
  income: number;
  expense: number;
  net: number;
};

export type FlowRow = { amount: unknown; type: string; date: string };

function ymInTz(iso: string, tz: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit" }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return y && m ? `${y}-${m}` : null;
}

function nextYm(ym: string): string {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** Soma por mês, de `from` a `to` (inclusive, "YYYY-MM"), com meses vazios zerados. */
export function monthlyFlows(
  rows: FlowRow[],
  range: { from: string; to: string },
  tz: string = APP_TZ,
): MonthFlow[] {
  if (range.from > range.to) return [];
  const byYm = new Map<string, MonthFlow>();
  for (let ym = range.from; ym <= range.to; ym = nextYm(ym)) {
    byYm.set(ym, { ym, income: 0, expense: 0, net: 0 });
  }
  for (const r of rows) {
    const amount = Number(r.amount);
    if (!Number.isFinite(amount)) continue;
    const ym = ymInTz(r.date, tz);
    const month = ym ? byYm.get(ym) : undefined;
    if (!month) continue;
    if (r.type === "income") month.income += amount;
    else if (r.type === "expense") month.expense += amount;
  }
  return [...byYm.values()].map((m) => ({
    ...m,
    income: Math.round(m.income * 100) / 100,
    expense: Math.round(m.expense * 100) / 100,
    net: Math.round((m.income - m.expense) * 100) / 100,
  }));
}

export type MonthsSummary = {
  /** Primeiro mês com algum lançamento (os anteriores são cortados da tela). */
  firstWithData: string | null;
  /** Meses fechados (antes do mês corrente) a partir do primeiro com dados. */
  closed: number;
  averageNet: number | null;
  totalNet: number;
  best: MonthFlow | null;
  worst: MonthFlow | null;
};

/** Resumo só com meses fechados: o mês corrente ainda está incompleto. */
export function summarizeMonths(months: MonthFlow[], currentYm: string): MonthsSummary {
  const first = months.find((m) => m.income > 0 || m.expense > 0)?.ym ?? null;
  const closed = first ? months.filter((m) => m.ym >= first && m.ym < currentYm) : [];
  if (closed.length === 0) {
    return { firstWithData: first, closed: 0, averageNet: null, totalNet: 0, best: null, worst: null };
  }
  const totalNet = closed.reduce((a, m) => a + m.net, 0);
  const best = closed.reduce((a, m) => (m.net > a.net ? m : a));
  const worst = closed.reduce((a, m) => (m.net < a.net ? m : a));
  return {
    firstWithData: first,
    closed: closed.length,
    averageNet: totalNet / closed.length,
    totalNet,
    best,
    worst,
  };
}
