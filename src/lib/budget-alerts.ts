/**
 * Avisos de orçamento do mês: categoria de despesa com limite que chegou a
 * 100% ("reached") ou passou dele ("over"). A chave muda com o mês e com o
 * nível, então estourar depois de ter chegado a 100% acende o sino de novo.
 */

export type BudgetCategory = {
  id: string;
  name: string;
  monthlyLimit: number;
  kind: "income" | "expense";
};

export type BudgetAlert = {
  key: string;
  categoryId: string;
  name: string;
  spent: number;
  limit: number;
  level: "reached" | "over";
};

const cents = (n: number) => Math.round(n * 100);

export function budgetAlerts(
  categories: BudgetCategory[],
  spentById: Record<string, number>,
  monthKey: string,
): BudgetAlert[] {
  const out: BudgetAlert[] = [];
  for (const c of categories) {
    if (c.kind !== "expense" || c.monthlyLimit <= 0) continue;
    const spent = spentById[c.id] ?? 0;
    const diff = cents(spent) - cents(c.monthlyLimit);
    if (diff < 0) continue;
    const level = diff > 0 ? "over" : "reached";
    out.push({
      key: `${monthKey}:${c.id}:${level}`,
      categoryId: c.id,
      name: c.name,
      spent,
      limit: c.monthlyLimit,
      level,
    });
  }
  const ratio = (a: BudgetAlert) => a.spent / a.limit;
  return out.sort((a, b) =>
    a.level !== b.level ? (a.level === "over" ? -1 : 1) : ratio(b) - ratio(a),
  );
}
