import { describe, expect, it } from "vitest";
import { categoryMonthly, sourceLabel, summarizeSeries, topSources } from "./category-monthly";

const row = (amount: number, type: "income" | "expense", date: string, description = "X") => ({
  amount,
  type,
  date,
  description,
});

describe("categoryMonthly", () => {
  it("soma só o tipo da categoria, mês a mês, com meses vazios", () => {
    const rows = [
      row(1000, "income", "2026-07-10T16:00:00Z"),
      row(500, "income", "2026-07-24T16:00:00Z"),
      row(30, "expense", "2026-07-24T16:00:00Z"),
      row(900, "income", "2026-09-10T16:00:00Z"),
    ];
    expect(categoryMonthly(rows, { from: "2026-07", to: "2026-09" }, "income")).toEqual([
      { ym: "2026-07", value: 1500 },
      { ym: "2026-08", value: 0 },
      { ym: "2026-09", value: 900 },
    ]);
    expect(categoryMonthly(rows, { from: "2026-07", to: "2026-07" }, "expense")).toEqual([
      { ym: "2026-07", value: 30 },
    ]);
  });
});

describe("summarizeSeries", () => {
  it("média, total, maior e menor só com meses fechados", () => {
    const s = summarizeSeries(
      [
        { ym: "2026-08", value: 5491.15 },
        { ym: "2026-09", value: 7113.59 },
        { ym: "2026-10", value: 6996.06 },
        { ym: "2026-11", value: 5215.14 },
      ],
      "2026-11",
    );
    expect(s.closed).toBe(3);
    expect(s.total).toBeCloseTo(19600.8);
    expect(s.average).toBeCloseTo(6533.6);
    expect(s.max?.ym).toBe("2026-09");
    expect(s.min?.ym).toBe("2026-08");
  });

  it("sem meses fechados → sem média", () => {
    const s = summarizeSeries([{ ym: "2026-11", value: 10 }], "2026-11");
    expect(s).toEqual({ closed: 0, total: 0, average: null, max: null, min: null });
  });
});

describe("sourceLabel", () => {
  it("tira o jargão do banco, códigos e números de loja", () => {
    expect(sourceLabel("PAYROLL DEPOSIT SPENCE DIAMONDS")).toBe("Spence Diamonds");
    expect(sourceLabel("PAYROLL DEPOSIT PETRO CANADA -")).toBe("Petro Canada");
    expect(sourceLabel("E-TRANSFER - AUTODEPOSIT BRIGHTER SPACE CLEANING COMPANY C1A3PKM4H3UZ")).toBe(
      "Brighter Space Cleaning Company",
    );
    expect(sourceLabel("E-TRANSFER RECEIVED BRIGHTER SPACE CLEANING COMPANY CAQKQXCW")).toBe(
      "Brighter Space Cleaning Company",
    );
    expect(sourceLabel("MISC PAYMENT DOORDASH  INC.-")).toBe("Doordash Inc.");
    expect(sourceLabel("CONTACTLESS INTERAC PURCHASE - 9180 A W # 4634 KANA")).toBe("A W Kana");
    expect(sourceLabel("Comunidade RT (HTM*MKS GESTAO DIGITAL Vinhedo — 249.06 BRL @ 0.282823)")).toBe(
      "Comunidade Rt",
    );
    expect(sourceLabel("UBER CANADA/UBERTRIP TORONTO ON")).toBe(sourceLabel("UBER CANADA/UBERTRIP TORONTO"));
  });
});

describe("topSources", () => {
  it("agrupa pelo nome, soma e ordena do maior para o menor", () => {
    const rows = [
      row(1583.3, "income", "2026-09-11T16:00:00Z", "PAYROLL DEPOSIT SPENCE DIAMONDS"),
      row(772.08, "income", "2026-09-11T16:00:00Z", "PAYROLL DEPOSIT SPENCE DIAMONDS"),
      row(1126.37, "income", "2026-09-15T16:00:00Z", "PAYROLL DEPOSIT PETRO CANADA -"),
      row(5, "expense", "2026-09-15T16:00:00Z", "PAYROLL DEPOSIT PETRO CANADA -"),
    ];
    expect(topSources(rows, "income")).toEqual([
      { label: "Spence Diamonds", total: 2355.38, count: 2 },
      { label: "Petro Canada", total: 1126.37, count: 1 },
    ]);
  });

  it("junta o que passar do limite em 'Outros'", () => {
    const rows = ["COSTCO", "LOBLAW", "PROVIGO"].map((d, i) => row(10 - i, "expense", "2026-09-01T16:00:00Z", d));
    const top = topSources(rows, "expense", 2);
    expect(top.map((s) => s.label)).toEqual(["Costco", "Outros"]);
    expect(top[1]!.total).toBe(17);
  });

  it("mesma loja com textos diferentes (conta x cartão) vira um grupo só", () => {
    const rows = [
      row(98.61, "expense", "2026-10-09T16:00:00Z", "CONTACTLESS INTERAC PURCHASE - 8307 COSTCO WHOLESAL"),
      row(49.69, "expense", "2026-03-07T16:00:00Z", "COSTCO WHOLESALE W540 NEPEAN"),
      row(184.88, "expense", "2026-05-02T16:00:00Z", "COSTCO BUSINESS CENTER GLOUCESTER"),
      row(11.68, "expense", "2026-06-01T16:00:00Z", "CONTACTLESS INTERAC PURCHASE - 8400 WALMART STORE #"),
      row(5.64, "expense", "2026-10-01T16:00:00Z", "CONTACTLESS INTERAC PURCHASE - 9180 A W # 4634 KANA"),
    ];
    expect(topSources(rows, "expense")).toEqual([
      { label: "Costco", total: 333.18, count: 3 },
      { label: "Walmart Store", total: 11.68, count: 1 },
      { label: "A W Kana", total: 5.64, count: 1 },
    ]);
  });
});
