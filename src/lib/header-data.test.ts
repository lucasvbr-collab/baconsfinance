import { describe, expect, it } from "vitest";
import { budgetNotification, cardNotification } from "./header-data";

describe("textos do sino", () => {
  it("estouro diz quanto passou e leva ao extrato da categoria", () => {
    expect(
      budgetNotification({
        key: "2026-11:mercado:over",
        categoryId: "mercado",
        name: "Mercado",
        spent: 861.55,
        limit: 800,
        level: "over",
      }),
    ).toEqual({
      key: "2026-11:mercado:over",
      title: "Mercado estourou o limite",
      detail: "$861.55 de $800.00, passou $61.55",
      href: "/transactions?category_id=mercado",
      tone: "danger",
    });
  });

  it("100% avisa em tom de alerta", () => {
    const n = budgetNotification({
      key: "2026-11:luz:reached",
      categoryId: "luz",
      name: "Luz",
      spent: 214.7,
      limit: 214.7,
      level: "reached",
    });
    expect(n.title).toBe("Luz chegou a 100%");
    expect(n.tone).toBe("warn");
  });

  it("pagamento de cartão sem fatura leva à importação", () => {
    expect(
      cardNotification({ id: "t1", amount: 331.43, date: "2026-11-24T17:00:00.000Z" }),
    ).toEqual({
      key: "card:t1",
      title: "Pagamento do cartão sem fatura",
      detail: "$331.43 em 24/11. Importe a fatura para separar as compras.",
      href: "/transactions/import",
      tone: "warn",
    });
  });
});
