import type { BudgetCategory } from "@/lib/budget-alerts";
import { formatCAD } from "@/lib/format";

/** Níveis de aviso, em % do limite do mês. */
export const THRESHOLDS = [80, 90, 100] as const;
export type Threshold = (typeof THRESHOLDS)[number];

export type ThresholdNotice = {
  categoryId: string;
  name: string;
  spent: number;
  limit: number;
  /** Maior nível novo atingido: é o que vai na notificação. */
  threshold: Threshold;
  /** Níveis a gravar como enviados (o maior e os menores pulados). */
  markSent: Threshold[];
};

export const noticeKey = (categoryId: string, ym: string, threshold: number) =>
  `${ym}:${categoryId}:${threshold}`;

const cents = (n: number) => Math.round(n * 100);

/**
 * Avisos novos de 80/90/100% para o mês `ym`. Cada nível sai uma vez por
 * categoria por mês; se a importação pular níveis, só o maior é notificado.
 */
export function newThresholdNotices(
  categories: BudgetCategory[],
  spentById: Record<string, number>,
  alreadySent: Set<string>,
  ym: string,
): ThresholdNotice[] {
  const out: ThresholdNotice[] = [];
  for (const c of categories) {
    if (c.kind !== "expense" || c.monthlyLimit <= 0) continue;
    const spent = spentById[c.id] ?? 0;
    // Comparação em centavos inteiros: spent/limit >= t/100.
    const reached = THRESHOLDS.filter((t) => cents(spent) * 100 >= cents(c.monthlyLimit) * t);
    const top = reached.at(-1);
    if (top === undefined || alreadySent.has(noticeKey(c.id, ym, top))) continue;
    out.push({
      categoryId: c.id,
      name: c.name,
      spent,
      limit: c.monthlyLimit,
      threshold: top,
      markSent: reached.filter((t) => !alreadySent.has(noticeKey(c.id, ym, t))),
    });
  }
  return out;
}

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function thresholdMessage(n: ThresholdNotice, ym: string): { title: string; body: string } {
  const month = MONTHS[Number(ym.slice(5, 7)) - 1] ?? "";
  const diff = cents(n.limit) - cents(n.spent);
  const tail =
    diff > 0
      ? `Faltam ${formatCAD(diff / 100)}.`
      : diff < 0
        ? `Passou ${formatCAD(-diff / 100)}.`
        : "Chegou no limite.";
  return {
    title: `${n.name}: ${n.threshold}% do limite`,
    body: `${formatCAD(n.spent)} de ${formatCAD(n.limit)} em ${month}. ${tail}`,
  };
}
