/**
 * Pagamento da fatura do cartão saindo da conta corrente.
 * Ainda não vimos o texto exato do RBC para o débito automático, por isso o
 * padrão é amplo. "VISA DEBIT" (compra no débito) nunca é pagamento de cartão.
 */
const CARD = /MASTERCARD|MASTER CARD|\bVISA\b|CREDIT CARD|CARTE DE CR/i;
const VISA_DEBIT = /VISA DEBIT/i;

export function isCardPayment(
  description: string,
  type: "income" | "expense",
): boolean {
  if (type !== "expense") return false;
  if (VISA_DEBIT.test(description)) return false;
  return CARD.test(description);
}

/** Índices (em `txs`) que são pagamento de cartão. */
export function detectCardPayments(
  txs: { description: string; type: "income" | "expense" }[],
): Set<number> {
  const out = new Set<number>();
  txs.forEach((t, i) => {
    if (isCardPayment(t.description, t.type)) out.add(i);
  });
  return out;
}
