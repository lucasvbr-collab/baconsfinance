/**
 * Detecta transações que não devem contar nos totais de receita/despesa:
 * - transferências entre contas próprias ("ONLINE BANKING TRANSFER");
 * - estornos NSF ("ITEM RETURNED NSF") e o pagamento que voltou
 *   (despesa de mesmo valor, no mesmo dia ou até 5 dias antes).
 *
 * E-transfers (ex.: aluguel) NÃO são transferências próprias e continuam contando.
 */

export type ExclusionCandidate = {
  description: string;
  amount: number;
  type: "income" | "expense";
  /** ISO string */
  date: string;
};

const OWN_TRANSFER = /\bONLINE (BANKING )?TRANSFER\b/i;
const NSF_RETURN = /\bITEM RETURNED NSF\b/i;
const NSF_WINDOW_DAYS = 5;
const DAY_MS = 86_400_000;

export function isOwnTransfer(description: string): boolean {
  return OWN_TRANSFER.test(description);
}

/** Índices (em `txs`) a marcar com exclude_from_totals. */
export function detectExclusions(txs: ExclusionCandidate[]): Set<number> {
  const out = new Set<number>();

  txs.forEach((t, i) => {
    if (isOwnTransfer(t.description)) out.add(i);
  });

  txs.forEach((t, i) => {
    if (t.type !== "income" || !NSF_RETURN.test(t.description)) return;
    out.add(i);
    const returnedAt = new Date(t.date).getTime();
    let match = -1;
    let bestGap = Infinity;
    txs.forEach((c, j) => {
      if (out.has(j) || c.type !== "expense") return;
      if (Math.abs(c.amount - t.amount) > 0.005) return;
      const gap = returnedAt - new Date(c.date).getTime();
      if (gap < 0 || gap > NSF_WINDOW_DAYS * DAY_MS) return;
      if (gap < bestGap) {
        bestGap = gap;
        match = j;
      }
    });
    if (match >= 0) out.add(match);
  });

  return out;
}
