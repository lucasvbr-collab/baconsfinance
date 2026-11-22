import { describe, expect, it } from "vitest";
import {
  addMonths,
  currentYearMonth,
  lastDayOfMonth,
  monthRange,
  parseYearMonth,
  zonedDayEnd,
  zonedDayStart,
} from "./month";

describe("month (America/Toronto)", () => {
  it("novembro/2026 começa em horário de verão (UTC−4) e termina em UTC−5", () => {
    const { start, end } = monthRange({ year: 2026, month: 11 });
    expect(start.toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(end.toISOString()).toBe("2026-12-01T04:59:59.999Z");
  });

  it("janeiro é inteiro em UTC−5", () => {
    const { start } = monthRange({ year: 2027, month: 1 });
    expect(start.toISOString()).toBe("2027-01-01T05:00:00.000Z");
  });

  it("às 22h de 30/11 em Montreal ainda é novembro, mesmo já sendo dezembro em UTC", () => {
    expect(currentYearMonth(new Date("2026-12-01T03:00:00Z"))).toEqual({
      year: 2026,
      month: 11,
    });
  });

  it("addMonths atravessa o ano", () => {
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 11 }, -11)).toEqual({ year: 2025, month: 12 });
  });

  it("parseYearMonth valida o formato", () => {
    expect(parseYearMonth("2026-10")).toEqual({ year: 2026, month: 10 });
    expect(parseYearMonth("2026-13")).toBeNull();
    expect(parseYearMonth("out")).toBeNull();
    expect(parseYearMonth(undefined)).toBeNull();
  });

  it("dias do extrato no fuso local", () => {
    expect(zonedDayStart("2026-11-02")?.toISOString()).toBe("2026-11-02T05:00:00.000Z");
    expect(zonedDayEnd("2026-11-30")?.toISOString()).toBe("2026-12-01T04:59:59.999Z");
    expect(zonedDayStart("lixo")).toBeNull();
    expect(lastDayOfMonth({ year: 2028, month: 2 })).toBe("2028-02-29");
  });
});
