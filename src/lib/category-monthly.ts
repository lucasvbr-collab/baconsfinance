import { normalizeMerchant } from "@/lib/categorize";
import { monthlyFlows } from "@/lib/monthly-flows";

/** Uma categoria mês a mês (aba Mês a mês com categoria escolhida). */

export type CategoryRow = { amount: unknown; type: string; date: string; description: string };
export type MonthValue = { ym: string; value: number };

/** Total do mês no sentido da categoria (entradas para Salário, gastos para Mercado). */
export function categoryMonthly(
  rows: CategoryRow[],
  range: { from: string; to: string },
  kind: "income" | "expense",
): MonthValue[] {
  return monthlyFlows(rows, range).map((m) => ({ ym: m.ym, value: kind === "income" ? m.income : m.expense }));
}

export type SeriesSummary = {
  closed: number;
  total: number;
  average: number | null;
  max: MonthValue | null;
  min: MonthValue | null;
};

/** Média, total, maior e menor só com meses fechados (o mês corrente está incompleto). */
export function summarizeSeries(points: MonthValue[], currentYm: string): SeriesSummary {
  const closed = points.filter((p) => p.ym < currentYm);
  if (closed.length === 0) return { closed: 0, total: 0, average: null, max: null, min: null };
  const total = closed.reduce((a, p) => a + p.value, 0);
  return {
    closed: closed.length,
    total,
    average: total / closed.length,
    max: closed.reduce((a, p) => (p.value > a.value ? p : a)),
    min: closed.reduce((a, p) => (p.value < a.value ? p : a)),
  };
}

/** Jargão do RBC no começo da descrição. */
const PREFIXES = [
  /^(?:CONTACTLESS )?INTERAC PURCHASE - \d{3,4} /i,
  /^VISA DEBIT PURCHASE - \d{3,4} /i,
  /^ONLINE BANKING PAYMENT - \d{3,4} /i,
  /^E-TRANSFER - AUTODEPOSIT /i,
  /^E-TRANSFER (?:SENT|RECEIVED|CANCEL) /i,
  /^PAYROLL DEPOSIT /i,
  /^MISC PAYMENT /i,
  /^TELEPHONE BILL PMT /i,
  /^HYDRO BILL PMT /i,
  /^INSURANCE /i,
];
const PROVINCE = / (?:ON|QC|BC|AB|MB|SK|NS|NB|NL|PE|YT|NT|NU)$/;
const TRAILING_PUNCT = /[\s\-–—/,#]+$/;

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Nome legível da origem/destino: "PAYROLL DEPOSIT SPENCE DIAMONDS" → "Spence Diamonds". */
export function sourceLabel(description: string): string {
  // "Comunidade RT (HTM*MKS …)": o nome dado à mão vem antes do parêntese.
  let s = description.replace(/\s*\(.*\)\s*$/, "").trim();
  const isTransfer = /^E-TRANSFER/i.test(s);
  for (const re of PREFIXES) {
    const rest = s.replace(re, "");
    if (rest !== s) {
      s = rest;
      break;
    }
  }
  // E-transfer termina com o código de referência (CAQKQXCW, C1A3PKM4H3UZ).
  if (isTransfer) s = s.replace(/\s+[A-Z0-9]{6,}$/i, "");
  s = normalizeMerchant(s).replace(TRAILING_PUNCT, "").replace(PROVINCE, "").replace(TRAILING_PUNCT, "");
  return titleCase(s) || "Sem descrição";
}

export type Source = { label: string; total: number; count: number };

/**
 * Chave de agrupamento: a primeira palavra quando ela já identifica a loja
 * (4+ letras: "Costco Wholesal" e "Costco Wholesale W540 Nepean" → "Costco");
 * nomes curtos ("A W Kana") usam as duas primeiras.
 */
function groupKey(label: string): string {
  const words = label.split(" ");
  // "Super C Aylmer" / "Super C Greber" → "Super C": letra solta faz parte do nome.
  const keepSecond = words[0]!.length < 4 || words[1]?.length === 1;
  return keepSecond ? words.slice(0, 2).join(" ") : words[0]!;
}

/** Maiores origens/destinos da categoria; o que passar de `limit` vira "Outros". */
export function topSources(rows: CategoryRow[], kind: "income" | "expense", limit = 8): Source[] {
  const by = new Map<string, Source & { labels: Set<string> }>();
  for (const r of rows) {
    if (r.type !== kind) continue;
    const amount = Number(r.amount);
    if (!Number.isFinite(amount)) continue;
    const label = sourceLabel(r.description);
    const key = groupKey(label);
    const cur = by.get(key) ?? { label, total: 0, count: 0, labels: new Set<string>() };
    cur.total += amount;
    cur.count++;
    cur.labels.add(label);
    by.set(key, cur);
  }
  // Um nome só no grupo: mostra inteiro ("Spence Diamonds"); vários: só a chave ("Costco").
  const sorted = [...by.entries()]
    .map(([key, s]) => ({
      label: s.labels.size === 1 ? s.label : key,
      total: Math.round(s.total * 100) / 100,
      count: s.count,
    }))
    .sort((a, b) => b.total - a.total);
  if (sorted.length <= limit) return sorted;
  const head = sorted.slice(0, limit - 1);
  const rest = sorted.slice(limit - 1);
  return [
    ...head,
    {
      label: "Outros",
      total: Math.round(rest.reduce((a, s) => a + s.total, 0) * 100) / 100,
      count: rest.reduce((a, s) => a + s.count, 0),
    },
  ];
}
