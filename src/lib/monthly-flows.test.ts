import { describe, expect, it } from "vitest";
import { monthlyFlows, resolveMonthRange, summarizeMonths, type MonthFlow } from "./monthly-flows";

describe("monthlyFlows", () => {
  it("soma por mês no fuso de Toronto e preenche meses vazios", () => {
    const rows = [
      { amount: "1000", type: "income", date: "2026-03-10T16:00:00Z" },
      { amount: 250.5, type: "expense", date: "2026-03-11T16:00:00Z" },
      // 1º de maio 02:00 UTC ainda é 30 de abril em Toronto
      { amount: 100, type: "expense", date: "2026-05-01T02:00:00Z" },
      { amount: 40, type: "expense", date: "2026-05-20T16:00:00Z" },
    ];
    expect(monthlyFlows(rows, { from: "2026-03", to: "2026-05" })).toEqual([
      { ym: "2026-03", income: 1000, expense: 250.5, net: 749.5 },
      { ym: "2026-04", income: 0, expense: 100, net: -100 },
      { ym: "2026-05", income: 0, expense: 40, net: -40 },
    ]);
  });

  it("ignora valores inválidos e lançamentos fora do intervalo", () => {
    const rows = [
      { amount: "abc", type: "income", date: "2026-03-10T16:00:00Z" },
      { amount: 10, type: "expense", date: "2026-02-10T16:00:00Z" },
    ];
    expect(monthlyFlows(rows, { from: "2026-03", to: "2026-03" })).toEqual([
      { ym: "2026-03", income: 0, expense: 0, net: 0 },
    ]);
  });

  it("intervalo invertido → lista vazia", () => {
    expect(monthlyFlows([], { from: "2026-05", to: "2026-03" })).toEqual([]);
  });
});

describe("resolveMonthRange", () => {
  const now = { year: 2026, month: 11 };

  it("sem filtro: últimos 12 meses", () => {
    expect(resolveMonthRange(undefined, undefined, now)).toEqual({ from: "2025-12", to: "2026-11", custom: false });
  });

  it("aceita um período e um mês isolado", () => {
    expect(resolveMonthRange("2026-07", "2026-09", now)).toEqual({ from: "2026-07", to: "2026-09", custom: true });
    expect(resolveMonthRange("2026-05", "2026-05", now)).toEqual({ from: "2026-05", to: "2026-05", custom: true });
  });

  it("inverte se vier ao contrário e não passa do mês atual", () => {
    expect(resolveMonthRange("2026-09", "2026-07", now)).toEqual({ from: "2026-07", to: "2026-09", custom: true });
    expect(resolveMonthRange("2026-10", "2027-03", now)).toEqual({ from: "2026-10", to: "2026-11", custom: true });
  });

  it("só 'de' ou só 'até'", () => {
    expect(resolveMonthRange("2026-08", undefined, now)).toEqual({ from: "2026-08", to: "2026-11", custom: true });
    expect(resolveMonthRange(undefined, "2026-04", now)).toEqual({ from: "2025-05", to: "2026-04", custom: true });
  });

  it("ignora lixo e limita a 36 meses", () => {
    expect(resolveMonthRange("abc", "2026-13", now).custom).toBe(false);
    expect(resolveMonthRange("2020-01", "2026-11", now)).toEqual({ from: "2023-12", to: "2026-11", custom: true });
  });
});

describe("summarizeMonths", () => {
  const m = (ym: string, income: number, expense: number): MonthFlow => ({
    ym,
    income,
    expense,
    net: income - expense,
  });

  it("média, melhor e pior só com meses fechados", () => {
    const s = summarizeMonths(
      [m("2026-08", 5000, 4000), m("2026-09", 6000, 7000), m("2026-10", 7000, 5000), m("2026-11", 100, 3000)],
      "2026-11",
    );
    expect(s.closed).toBe(3);
    expect(s.averageNet).toBeCloseTo((1000 - 1000 + 2000) / 3);
    expect(s.totalNet).toBeCloseTo(2000);
    expect(s.best?.ym).toBe("2026-10");
    expect(s.worst?.ym).toBe("2026-09");
  });

  it("ignora meses sem nenhum lançamento no começo da lista", () => {
    const s = summarizeMonths([m("2026-01", 0, 0), m("2026-02", 1000, 400), m("2026-03", 0, 0)], "2026-04");
    expect(s.firstWithData).toBe("2026-02");
    expect(s.closed).toBe(2);
    expect(s.averageNet).toBeCloseTo(300);
  });

  it("sem meses fechados → sem média", () => {
    const s = summarizeMonths([m("2026-11", 100, 50)], "2026-11");
    expect(s.closed).toBe(0);
    expect(s.averageNet).toBeNull();
    expect(s.best).toBeNull();
  });
});
