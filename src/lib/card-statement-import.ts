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
  // Compras idênticas na mesma fatura (duas corridas iguais no mesmo dia)
  // precisam de hashes diferentes; a 1ª mantém o formato base.
  const seen = new Map<string, number>();
  return statement.lines
    .filter((l) => !l.isPayment && l.amount !== 0)
    .map((l) => {
      const type = l.amount > 0 ? "expense" : "income";
      const amount = Math.abs(l.amount);
      const key = `card|${l.date}|${amount.toFixed(2)}|${l.description}|${type}`;
      const n = seen.get(key) ?? 0;
      seen.set(key, n + 1);
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
          .update(n === 0 ? key : `${key}|${n}`)
          .digest("hex"),
      };
    });
}
