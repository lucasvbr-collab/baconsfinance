import { describe, expect, it } from "vitest";
import { pendingCardPayments } from "./card-payment-match";

const autopay = { id: "p1", amount: 331.43, date: "2026-11-24T12:00:00.000Z" };
const manual = { id: "p2", amount: 534.48, date: "2026-10-05T12:00:00.000Z" };

describe("pendingCardPayments", () => {
  it("débito automático com o valor da fatura fica resolvido", () => {
    expect(
      pendingCardPayments([autopay], [{ newBalance: 331.43, periodEnd: "2026-11-03" }]),
    ).toEqual([]);
  });

  it("tolera 1 centavo de diferença", () => {
    expect(
      pendingCardPayments(
        [{ ...autopay, amount: 331.42 }],
        [{ newBalance: 331.43, periodEnd: "2026-11-03" }],
      ),
    ).toEqual([]);
  });

  it("pagamento manual: resolvido por fatura que fechou até 40 dias antes", () => {
    expect(
      pendingCardPayments([manual], [{ newBalance: 900, periodEnd: "2026-09-05" }]),
    ).toEqual([]);
  });

  it("pagamento manual sem fatura recente continua pendente", () => {
    expect(
      pendingCardPayments([manual], [{ newBalance: 900, periodEnd: "2026-08-01" }]),
    ).toEqual([manual]);
  });

  it("fatura que fecha depois do pagamento não resolve pelo período", () => {
    expect(
      pendingCardPayments([manual], [{ newBalance: 900, periodEnd: "2026-11-03" }]),
    ).toEqual([manual]);
  });

  it("sem faturas, todos pendentes, do mais recente para o mais antigo", () => {
    expect(pendingCardPayments([manual, autopay], [])).toEqual([autopay, manual]);
  });
});
