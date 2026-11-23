import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Fuso do app. O servidor (Vercel) roda em UTC; sem isto o "mês atual"
 * virava às 19h/20h do último dia em Montreal/Toronto.
 */
export const APP_TZ = "America/Toronto";

export type YearMonth = { year: number; month: number }; // month: 1–12

/** Deslocamento do fuso em minutos (ex.: -300 para UTC−5) num instante. */
export function tzOffsetMinutes(date: Date, tz: string = APP_TZ): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "longOffset",
  }).formatToParts(date);
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = name.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** Instante (UTC) da meia-noite local de y-m-d no fuso. */
export function zonedMidnight(
  year: number,
  month: number,
  day: number,
  tz: string = APP_TZ,
): Date {
  const guess = Date.UTC(year, month - 1, day);
  const off = tzOffsetMinutes(new Date(guess), tz);
  let t = guess - off * 60_000;
  const off2 = tzOffsetMinutes(new Date(t), tz);
  if (off2 !== off) t = guess - off2 * 60_000;
  return new Date(t);
}

/** "YYYY-MM-DD" → meia-noite local desse dia (UTC). */
export function zonedDayStart(isoDay: string, tz: string = APP_TZ): Date | null {
  const m = isoDay.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return zonedMidnight(Number(m[1]), Number(m[2]), Number(m[3]), tz);
}

/** "YYYY-MM-DD" → último milissegundo desse dia local (UTC). */
export function zonedDayEnd(isoDay: string, tz: string = APP_TZ): Date | null {
  const m = isoDay.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const next = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 1));
  return new Date(
    zonedMidnight(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), tz).getTime() - 1,
  );
}

/** Dia de hoje (YYYY-MM-DD) no fuso do app. */
export function todayIso(now: Date = new Date(), tz: string = APP_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function currentYearMonth(
  now: Date = new Date(),
  tz: string = APP_TZ,
): YearMonth {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
  };
}

export function parseYearMonth(raw: string | undefined | null): YearMonth | null {
  const m = raw?.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year: Number(m[1]), month };
}

export function formatYearMonth(ym: YearMonth): string {
  return `${ym.year}-${String(ym.month).padStart(2, "0")}`;
}

export function addMonths(ym: YearMonth, n: number): YearMonth {
  const idx = ym.year * 12 + (ym.month - 1) + n;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function compareYearMonth(a: YearMonth, b: YearMonth): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

/** [início, fim] do mês no fuso, como instantes UTC. */
export function monthRange(
  ym: YearMonth,
  tz: string = APP_TZ,
): { start: Date; end: Date } {
  const next = addMonths(ym, 1);
  const start = zonedMidnight(ym.year, ym.month, 1, tz);
  const end = new Date(zonedMidnight(next.year, next.month, 1, tz).getTime() - 1);
  return { start, end };
}

/** Último dia do mês ("YYYY-MM-DD"). */
export function lastDayOfMonth(ym: YearMonth): string {
  const d = new Date(Date.UTC(ym.year, ym.month, 0)).getUTCDate();
  return `${formatYearMonth(ym)}-${String(d).padStart(2, "0")}`;
}

export function monthLabel(ym: YearMonth): string {
  return format(new Date(ym.year, ym.month - 1, 1), "MMMM yyyy", { locale: ptBR });
}
