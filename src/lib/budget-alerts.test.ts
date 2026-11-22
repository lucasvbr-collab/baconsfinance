import { describe, expect, it } from "vitest";
import { budgetAlerts } from "./budget-alerts";

const cats = [
  { id: "mercado", name: "Mercado", monthlyLimit: 800, kind: "expense" as const },
  { id: "lazer", name: "Lazer", monthlyLimit: 150, kind: "expense" as const },
  { id: "luz", name: "Luz", monthlyLimit: 214.7, kind: "expense" as const },
  { id: "pet", name: "Pet", monthlyLimit: 0, kind: "expense" as const },
  { id: "salario", name: "Salário", monthlyLimit: 5000, kind: "income" as const },
];

describe("budgetAlerts", () => {
  const alerts = budgetAlerts(
    cats,
    { mercado: 861.55, lazer: 120, luz: 214.7, pet: 64.39, salario: 5215.14 },
    "2026-11",
  );

  it("avisa quem estourou e quem chegou a 100%, estourados primeiro", () => {
    expect(alerts).toEqual([
      { key: "2026-11:mercado:over", categoryId: "mercado", name: "Mercado", spent: 861.55, limit: 800, level: "over" },
      { key: "2026-11:luz:reached", categoryId: "luz", name: "Luz", spent: 214.7, limit: 214.7, level: "reached" },
    ]);
  });

  it("ignora categoria abaixo do limite, sem limite ou de receita", () => {
    expect(alerts.map((a) => a.categoryId)).not.toContain("lazer");
    expect(alerts.map((a) => a.categoryId)).not.toContain("pet");
    expect(alerts.map((a) => a.categoryId)).not.toContain("salario");
  });

  it("um centavo acima do limite já é estouro", () => {
    const [a] = budgetAlerts([cats[1]!], { lazer: 150.01 }, "2026-11");
    expect(a!.level).toBe("over");
  });

  it("vários estourados: o que mais passou do limite vem primeiro", () => {
    const res = budgetAlerts(
      [cats[0]!, cats[1]!],
      { mercado: 880, lazer: 300 },
      "2026-11",
    );
    expect(res.map((a) => a.categoryId)).toEqual(["lazer", "mercado"]);
  });
});
