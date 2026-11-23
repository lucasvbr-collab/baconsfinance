import { describe, expect, it } from "vitest";
import type { BudgetCategory } from "./budget-alerts";
import { newThresholdNotices, noticeKey, thresholdMessage } from "./budget-thresholds";

const cat = (id: string, monthlyLimit: number, kind: "income" | "expense" = "expense"): BudgetCategory => ({
  id,
  name: id,
  monthlyLimit,
  kind,
});
const YM = "2026-11";

describe("newThresholdNotices", () => {
  it("79,99% não avisa; 80% avisa", () => {
    const cats = [cat("Lazer", 100)];
    expect(newThresholdNotices(cats, { Lazer: 79.99 }, new Set(), YM)).toEqual([]);
    expect(newThresholdNotices(cats, { Lazer: 80 }, new Set(), YM)).toEqual([
      { categoryId: "Lazer", name: "Lazer", spent: 80, limit: 100, threshold: 80, markSent: [80] },
    ]);
  });

  it("pulo de nível manda só o maior e marca os menores", () => {
    const n = newThresholdNotices([cat("Mercado", 1000)], { Mercado: 1050 }, new Set(), YM);
    expect(n).toHaveLength(1);
    expect(n[0]!.threshold).toBe(100);
    expect(n[0]!.markSent).toEqual([80, 90, 100]);
  });

  it("nível já enviado não repete; nível novo acima avisa", () => {
    const sent = new Set([noticeKey("Lazer", YM, 80)]);
    expect(newThresholdNotices([cat("Lazer", 100)], { Lazer: 85 }, sent, YM)).toEqual([]);
    const n = newThresholdNotices([cat("Lazer", 100)], { Lazer: 92 }, sent, YM);
    expect(n.map((x) => [x.threshold, x.markSent])).toEqual([[90, [90]]]);
  });

  it("ignora categoria sem limite, de entrada ou sem gasto", () => {
    const cats = [cat("Extra", 0), cat("Salário", 100, "income"), cat("Pet", 100)];
    expect(newThresholdNotices(cats, { Extra: 999, Salário: 999 }, new Set(), YM)).toEqual([]);
  });

  it("usa centavos: 90% exato de 333,33 conta", () => {
    const n = newThresholdNotices([cat("Luz", 333.33)], { Luz: 299.997 }, new Set(), YM);
    expect(n[0]?.threshold).toBe(90);
  });
});

describe("thresholdMessage", () => {
  it("abaixo de 100% diz quanto falta", () => {
    expect(
      thresholdMessage({ categoryId: "x", name: "Lazer", spent: 135, limit: 150, threshold: 90, markSent: [90] }, YM),
    ).toEqual({ title: "Lazer: 90% do limite", body: "$135.00 de $150.00 em novembro. Faltam $15.00." });
  });

  it("em 100% ou mais diz quanto passou", () => {
    expect(
      thresholdMessage({ categoryId: "x", name: "Mercado", spent: 1350, limit: 1320, threshold: 100, markSent: [100] }, YM)
        .body,
    ).toBe("$1,350.00 de $1,320.00 em novembro. Passou $30.00.");
    expect(
      thresholdMessage({ categoryId: "x", name: "Mercado", spent: 1320, limit: 1320, threshold: 100, markSent: [100] }, YM)
        .body,
    ).toBe("$1,320.00 de $1,320.00 em novembro. Chegou no limite.");
  });
});
