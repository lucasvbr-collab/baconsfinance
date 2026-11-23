import { describe, expect, it } from "vitest";
import { reminderFor, reminderMessage } from "./import-reminder";

// Domingo, 22/nov/2026, 00:00 em Toronto = 05:00 UTC (EST).
const SUNDAY_START = new Date("2026-11-22T05:00:00Z");

describe("reminderFor", () => {
  it("domingo sem importação desde o domingo → lembra, dia 0", () => {
    const now = new Date("2026-11-22T13:00:00Z");
    expect(reminderFor(new Date("2026-11-21T20:00:00Z"), now)).toEqual({ daysLate: 0 });
  });

  it("importou depois do começo do domingo → não lembra", () => {
    const now = new Date("2026-11-25T13:00:00Z");
    expect(reminderFor(SUNDAY_START, now)).toBeNull();
    expect(reminderFor(new Date("2026-11-23T15:00:00Z"), now)).toBeNull();
  });

  it("quarta sem importação → 3 dias de atraso", () => {
    expect(reminderFor(new Date("2026-11-20T12:00:00Z"), new Date("2026-11-25T13:00:00Z"))).toEqual({ daysLate: 3 });
  });

  it("nunca importou → lembra", () => {
    expect(reminderFor(null, new Date("2026-11-24T13:00:00Z"))).toEqual({ daysLate: 2 });
  });

  it("usa o dia de Toronto, não o UTC (sábado à noite ainda não é domingo)", () => {
    // 23/nov 03:00 UTC = 22/nov 22:00 em Toronto (domingo)
    expect(reminderFor(null, new Date("2026-11-23T03:00:00Z"))).toEqual({ daysLate: 0 });
    // 22/nov 04:00 UTC = 21/nov 23:00 em Toronto (sábado): a semana ainda é a do domingo 15
    expect(reminderFor(new Date("2026-11-16T12:00:00Z"), new Date("2026-11-22T04:00:00Z"))).toBeNull();
  });

  it("horário de verão: domingo 08/mar/2026 começa às 05:00 UTC (EST)", () => {
    const now = new Date("2026-03-10T13:00:00Z"); // terça
    expect(reminderFor(new Date("2026-03-08T05:00:00Z"), now)).toBeNull();
    expect(reminderFor(new Date("2026-03-08T04:59:00Z"), now)).toEqual({ daysLate: 2 });
  });
});

describe("reminderMessage", () => {
  it("domingo pede; depois cobra com os dias", () => {
    expect(reminderMessage(0).title).toBe("Hora de subir os gastos da semana");
    expect(reminderMessage(1).title).toBe("Faltam os gastos da semana (há 1 dia)");
    expect(reminderMessage(3).title).toBe("Faltam os gastos da semana (há 3 dias)");
  });
});
