import { describe, expect, it } from "vitest";
import { matchRule, normalizeMerchant, type CategoryRule } from "./categorize";

describe("normalizeMerchant", () => {
  it("remove números de loja e terminal", () => {
    expect(
      normalizeMerchant("CONTACTLESS INTERAC PURCHASE - 2171 A W # 4634 KANA"),
    ).toBe("CONTACTLESS INTERAC PURCHASE - A W KANA");
  });

  it("troca * por espaço e põe em maiúsculas", () => {
    expect(normalizeMerchant("contactless interac purchase - 9640 SQ *WOMENS ULTR")).toBe(
      "CONTACTLESS INTERAC PURCHASE - SQ WOMENS ULTR",
    );
  });

  it("mantém números curtos (ex.: nome de posto)", () => {
    expect(normalizeMerchant("PETRO-CANADA 10")).toBe("PETRO-CANADA 10");
  });
});

describe("matchRule", () => {
  const rules: CategoryRule[] = [
    { id: "1", pattern: "COSTCO", category_id: "mercado" },
    { id: "2", pattern: "COSTCO GAS", category_id: "gasolina" },
    { id: "3", pattern: "PETRO-CANADA", category_id: "gasolina" },
    { id: "4", pattern: "PAYROLL DEPOSIT", category_id: "salario" },
  ];

  it("vence o padrão mais longo, independente da ordem", () => {
    expect(matchRule(rules, "CONTACTLESS INTERAC PURCHASE - 1 COSTCO GAS #12")?.id).toBe("2");
    expect(matchRule([...rules].reverse(), "COSTCO GAS")?.id).toBe("2");
  });

  it("não confunde salário da Petro Canada com posto Petro-Canada", () => {
    expect(matchRule(rules, "PAYROLL DEPOSIT PETRO CANADA -")?.id).toBe("4");
    expect(matchRule(rules, "CONTACTLESS INTERAC PURCHASE - 5427 PETRO-CANADA 10")?.id).toBe("3");
  });

  it("retorna null sem match", () => {
    expect(matchRule(rules, "HYDRO BILL PMT HYDRO-QUEBEC")).toBeNull();
    expect(matchRule(rules, "")).toBeNull();
  });
});
