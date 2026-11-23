import { describe, expect, it } from "vitest";
import { parseSavingsInput, summarizeSavings, type SavingsEntry } from "./savings";

const e = (id: string, amount: number, asOf: string, createdAt = `${asOf}T12:00:00Z`): SavingsEntry => ({
  id,
  amount,
  asOf,
  createdAt,
});

describe("summarizeSavings", () => {
  it("sem atualizações → null", () => {
    expect(summarizeSavings([], "2026-11-22")).toBeNull();
  });

  it("uma atualização → sem variações", () => {
    expect(summarizeSavings([e("a", 1000, "2026-11-01")], "2026-11-22")).toEqual({
      latest: e("a", 1000, "2026-11-01"),
      sinceLast: null,
      sinceYearStart: null,
    });
  });

  it("ordena por data e calcula variações", () => {
    const s = summarizeSavings(
      [e("c", 12450, "2026-11-20"), e("a", 9250, "2026-01-15"), e("b", 11950, "2026-10-01")],
      "2026-11-22",
    );
    expect(s?.latest.id).toBe("c");
    expect(s?.sinceLast).toBeCloseTo(500);
    expect(s?.sinceYearStart).toBeCloseTo(3200);
  });

  it("ignora atualizações de anos anteriores no 'no ano'", () => {
    const s = summarizeSavings(
      [e("a", 5000, "2025-12-20"), e("b", 6000, "2026-02-01"), e("c", 7000, "2026-03-01")],
      "2026-11-22",
    );
    expect(s?.sinceLast).toBeCloseTo(1000);
    expect(s?.sinceYearStart).toBeCloseTo(1000);
  });

  it("mesmo dia: vale a criada por último", () => {
    const s = summarizeSavings(
      [
        e("novo", 2000, "2026-11-20", "2026-11-20T15:00:00Z"),
        e("velho", 1500, "2026-11-20", "2026-11-20T09:00:00Z"),
      ],
      "2026-11-22",
    );
    expect(s?.latest.id).toBe("novo");
    expect(s?.sinceLast).toBeCloseTo(500);
  });

  it("última atualização de outro ano → sem 'no ano'", () => {
    const s = summarizeSavings([e("a", 5000, "2025-06-01"), e("b", 6000, "2025-12-01")], "2026-01-10");
    expect(s?.sinceLast).toBeCloseTo(1000);
    expect(s?.sinceYearStart).toBeNull();
  });
});

describe("parseSavingsInput", () => {
  it("aceita formatos en-CA e pt-BR", () => {
    expect(parseSavingsInput("$12,450.00", "2026-11-22", "2026-11-22")).toEqual({
      amount: 12450,
      asOf: "2026-11-22",
    });
    expect(parseSavingsInput("1.234,56", "2026-11-01", "2026-11-22")).toEqual({
      amount: 1234.56,
      asOf: "2026-11-01",
    });
  });

  it("aceita zero", () => {
    expect(parseSavingsInput("0", "2026-11-01", "2026-11-22")).toEqual({ amount: 0, asOf: "2026-11-01" });
  });

  it("recusa valor vazio, negativo ou grande demais", () => {
    expect(parseSavingsInput("", "2026-11-01", "2026-11-22")).toHaveProperty("error");
    expect(parseSavingsInput("abc", "2026-11-01", "2026-11-22")).toHaveProperty("error");
    expect(parseSavingsInput("-50", "2026-11-01", "2026-11-22")).toHaveProperty("error");
    expect(parseSavingsInput("10000000000", "2026-11-01", "2026-11-22")).toHaveProperty("error");
  });

  it("recusa data inválida ou no futuro", () => {
    expect(parseSavingsInput("100", "", "2026-11-22")).toHaveProperty("error");
    expect(parseSavingsInput("100", "2026-02-30", "2026-11-22")).toHaveProperty("error");
    expect(parseSavingsInput("100", "2026-11-23", "2026-11-22")).toHaveProperty("error");
  });
});
