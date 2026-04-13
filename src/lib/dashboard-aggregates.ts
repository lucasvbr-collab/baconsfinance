export type AmountTypeRow = { amount: unknown; type: string };

export function sumIncomeExpense(rows: AmountTypeRow[]) {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    const a = Number(r.amount);
    if (!Number.isFinite(a)) continue;
    if (r.type === "income") income += a;
    else if (r.type === "expense") expense += a;
  }
  return { income, expense, net: income - expense };
}
