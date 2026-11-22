/**
 * Quais pagamentos de cartão ainda não têm a fatura importada.
 * - Débito automático paga o saldo da fatura: casa pelo valor (±1 centavo).
 * - Pagamento manual/parcial: resolvido por fatura que fechou até 40 dias
 *   antes do pagamento.
 */

export type CardPaymentRow = { id: string; amount: number; date: string };
export type StatementRow = { newBalance: number; periodEnd: string };

const WINDOW_DAYS = 40;
const DAY_MS = 86_400_000;

export function pendingCardPayments(
  payments: CardPaymentRow[],
  statements: StatementRow[],
): CardPaymentRow[] {
  const resolved = (p: CardPaymentRow) => {
    const paidAt = new Date(p.date).getTime();
    return statements.some((s) => {
      if (Math.abs(Math.round(s.newBalance * 100) - Math.round(p.amount * 100)) <= 1) {
        return true;
      }
      const gap = paidAt - new Date(`${s.periodEnd}T12:00:00Z`).getTime();
      return gap >= 0 && gap <= WINDOW_DAYS * DAY_MS;
    });
  };
  return payments
    .filter((p) => !resolved(p))
    .sort((a, b) => b.date.localeCompare(a.date));
}
