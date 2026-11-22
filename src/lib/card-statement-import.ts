import { createHash } from "node:crypto";
import type { IncomingTransaction } from "@/lib/import-transactions";
import type { CardStatement } from "@/lib/rbc-card-statement";

/**
 * Lançamentos da fatura → transações a importar.
 * Pagamentos ficam de fora (o dinheiro já saiu da conta corrente);
 * compras viram despesa e estornos viram entrada.
 */
export function statementToIncoming(
  statement: CardStatement,
  statementId: string,
): IncomingTransaction[] {
  return statement.lines
    .filter((l) => !l.isPayment && l.amount !== 0)
    .map((l) => {
      const type = l.amount > 0 ? "expense" : "income";
      const amount = Math.abs(l.amount);
      return {
        description: l.description,
        merchantName: l.description,
        amount,
        type,
        // Mesma convenção do CSV: meio-dia do dia da compra.
        date: new Date(`${l.date}T12:00:00`).toISOString(),
        source: "card_statement",
        statementId,
        importHash: createHash("sha256")
          .update(`card|${l.date}|${amount.toFixed(2)}|${l.description}|${type}`)
          .digest("hex"),
      };
    });
}
