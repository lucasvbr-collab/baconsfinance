import { APP_TZ, zonedMidnight } from "@/lib/month";

/** Meia-noite (no fuso) do domingo mais recente, e o dia da semana de `now` (0 = domingo). */
export function weekStart(now: Date, tz: string = APP_TZ): { start: Date; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const y = get("year");
  const m = get("month");
  const d = get("day");
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const sunday = new Date(Date.UTC(y, m - 1, d - weekday));
  return {
    start: zonedMidnight(sunday.getUTCFullYear(), sunday.getUTCMonth() + 1, sunday.getUTCDate(), tz),
    weekday,
  };
}

/**
 * Lembrete de subir os gastos: a partir do domingo, todo dia, até alguém do
 * lar importar um extrato. `daysLate` = dias desde o domingo (0 no domingo).
 */
export function reminderFor(
  lastImportAt: Date | null,
  now: Date,
  tz: string = APP_TZ,
): { daysLate: number } | null {
  const { start, weekday } = weekStart(now, tz);
  if (lastImportAt && lastImportAt.getTime() >= start.getTime()) return null;
  return { daysLate: weekday };
}

export function reminderMessage(daysLate: number): { title: string; body: string } {
  if (daysLate === 0) {
    return {
      title: "Hora de subir os gastos da semana",
      body: "Exporte o CSV do RBC (conta e cartão) e importe no app.",
    };
  }
  return {
    title: `Faltam os gastos da semana (há ${daysLate} ${daysLate === 1 ? "dia" : "dias"})`,
    body: "Importe o extrato do RBC para os limites ficarem em dia.",
  };
}
