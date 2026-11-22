import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { statementToIncoming } from "./card-statement-import";
import type { CardStatement } from "./rbc-card-statement";

const base: CardStatement = {
  cardLast4: "1256",
  periodStart: "2026-10-06",
  periodEnd: "2026-11-03",
  dueDate: "2026-11-24",
  previousBalance: 0,
  paymentsCredits: -112,
  purchasesDebits: 25.17,
  cashAdvances: 0,
  interest: 0,
  fees: 0,
  newBalance: -86.83,
  lines: [
    { date: "2026-10-05", description: "PAYMENT - THANK YOU / PAIEMENT - MERCI", amount: -100, isPayment: true },
    { date: "2026-10-06", description: "PTCENTERPAG LEIRIA 10", amount: 25.17, isPayment: false },
    { date: "2026-10-07", description: "LOJA REFUND", amount: -12, isPayment: false },
  ],
};

describe("statementToIncoming", () => {
  const txs = statementToIncoming(base, "stmt-1");

  it("ignora os pagamentos da fatura", () => {
    expect(txs).toHaveLength(2);
    expect(txs.some((t) => t.description.startsWith("PAYMENT"))).toBe(false);
  });

  it("compra vira despesa com valor positivo, ligada à fatura", () => {
    expect(txs[0]).toMatchObject({
      description: "PTCENTERPAG LEIRIA 10",
      merchantName: "PTCENTERPAG LEIRIA 10",
      amount: 25.17,
      type: "expense",
      source: "card_statement",
      statementId: "stmt-1",
    });
    expect(txs[0]!.date.slice(0, 10)).toBe("2026-10-06");
  });

  it("estorno vira entrada com valor positivo", () => {
    expect(txs[1]).toMatchObject({ amount: 12, type: "income", description: "LOJA REFUND" });
  });

  it("hash estável card|data|valor|descrição|tipo", () => {
    const expected = createHash("sha256")
      .update("card|2026-10-06|25.17|PTCENTERPAG LEIRIA 10|expense")
      .digest("hex");
    expect(txs[0]!.importHash).toBe(expected);
  });
});

describe("statementToIncoming (compras repetidas)", () => {
  const twice: CardStatement = {
    ...base,
    lines: [
      { date: "2026-10-14", description: "UBER CANADA/UBERTRIP TORONTO ON", amount: 13.95, isPayment: false },
      { date: "2026-10-14", description: "UBER CANADA/UBERTRIP TORONTO ON", amount: 13.95, isPayment: false },
    ],
  };

  it("duas compras idênticas na mesma fatura têm hashes diferentes", () => {
    const [a, b] = statementToIncoming(twice, "s");
    expect(a!.importHash).not.toBe(b!.importHash);
  });

  it("e os hashes se repetem ao reimportar a mesma fatura", () => {
    const first = statementToIncoming(twice, "s").map((t) => t.importHash);
    const again = statementToIncoming(twice, "s").map((t) => t.importHash);
    expect(again).toEqual(first);
  });
});
