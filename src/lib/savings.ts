import { parseMoneyInput } from "@/lib/format";

/** Uma atualização do saldo da savings, informada à mão. */
export type SavingsEntry = {
  id: string;
  amount: number;
  /** Dia do saldo, YYYY-MM-DD */
  asOf: string;
  /** ISO; desempata atualizações do mesmo dia */
  createdAt: string;
};

export type SavingsSummary = {
  latest: SavingsEntry;
  /** Variação desde a atualização anterior */
  sinceLast: number | null;
  /** Variação desde a primeira atualização do ano corrente */
  sinceYearStart: number | null;
};

/** numeric(12,2) */
const MAX_AMOUNT = 9_999_999_999.99;

function byDate(a: SavingsEntry, b: SavingsEntry): number {
  if (a.asOf !== b.asOf) return a.asOf < b.asOf ? -1 : 1;
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

export function summarizeSavings(entries: SavingsEntry[], todayIso: string): SavingsSummary | null {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort(byDate);
  const latest = sorted[sorted.length - 1]!;
  const previous = sorted.length > 1 ? sorted[sorted.length - 2]! : null;

  const year = todayIso.slice(0, 4);
  const firstOfYear = sorted.find((s) => s.asOf.startsWith(year)) ?? null;
  const sinceYearStart =
    firstOfYear && firstOfYear !== latest && latest.asOf.startsWith(year)
      ? latest.amount - firstOfYear.amount
      : null;

  return {
    latest,
    sinceLast: previous ? latest.amount - previous.amount : null,
    sinceYearStart,
  };
}

function isValidIsoDay(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function parseSavingsInput(
  amountRaw: string,
  asOfRaw: string,
  todayIso: string,
): { amount: number; asOf: string } | { error: string } {
  const raw = amountRaw.trim();
  if (!/\d/.test(raw)) return { error: "Informe o saldo." };
  if (raw.includes("-")) return { error: "O saldo não pode ser negativo." };
  const amount = Math.round(parseMoneyInput(raw) * 100) / 100;
  if (!Number.isFinite(amount) || amount < 0) return { error: "Saldo inválido." };
  if (amount > MAX_AMOUNT) return { error: "Saldo grande demais." };

  const asOf = asOfRaw.trim();
  if (!isValidIsoDay(asOf)) return { error: "Data inválida." };
  if (asOf > todayIso) return { error: "A data não pode ser no futuro." };

  return { amount, asOf };
}
