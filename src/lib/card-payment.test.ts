import { describe, expect, it } from "vitest";
import { detectCardPayments, isCardPayment } from "./card-payment";

describe("isCardPayment", () => {
  it("reconhece pagamento de cartão saindo da conta", () => {
    expect(isCardPayment("ONLINE BANKING PAYMENT - 1234 RBC MASTERCARD", "expense")).toBe(true);
    expect(isCardPayment("MASTERCARD PAYMENT", "expense")).toBe(true);
    expect(isCardPayment("PAYMENT - VISA", "expense")).toBe(true);
  });

  it("não confunde compra no débito (VISA DEBIT) com pagamento de cartão", () => {
    expect(isCardPayment("VISA DEBIT PURCHASE - 1234 COSTCO", "expense")).toBe(false);
  });

  it("não marca e-transfer nem contas comuns", () => {
    expect(isCardPayment("E-TRANSFER SENT BRITISH SQUARE", "expense")).toBe(false);
    expect(isCardPayment("ONLINE BANKING PAYMENT - 8517 SAAQ-REGISTRATI", "expense")).toBe(false);
  });

  it("entrada nunca é pagamento de cartão", () => {
    expect(isCardPayment("MASTERCARD REFUND", "income")).toBe(false);
  });
});

describe("detectCardPayments", () => {
  it("devolve os índices dos pagamentos de cartão do lote", () => {
    const idx = detectCardPayments([
      { description: "LOBLAW #1050", type: "expense" },
      { description: "ONLINE BANKING PAYMENT - 1234 RBC MASTERCARD", type: "expense" },
      { description: "VISA DEBIT PURCHASE - 9 SHELL", type: "expense" },
    ]);
    expect([...idx]).toEqual([1]);
  });
});
