import { describe, expect, it } from "vitest";
import { sumIncomeExpense } from "./dashboard-aggregates";
import { parseRbcCsv } from "./rbc-csv";

const CSV = `Account Type,Account Number,Transaction Date,Cheque Number,Description 1,Description 2,CAD$,USD$
Chequing,00000-0000000,11/2/2026,,INTERAC PURCHASE - 0737 SHELL C81588,,-88.87,
Chequing,00000-0000000,11/6/2026,,PAYROLL DEPOSIT EMPLOYER,,1710.68,
Chequing,00000-0000000,11/9/2026,,"CONTACTLESS INTERAC PURCHASE - 5022 MCDONALD'S, #347",,-35.15,
Chequing,00000-0000000,11/9/2026,,ZERO,,0,
`;

describe("parseRbcCsv", () => {
  const txs = parseRbcCsv(CSV);

  it("lê linhas, ignora valor zero e respeita aspas", () => {
    expect(txs).toHaveLength(3);
    expect(txs[2]!.description).toBe("CONTACTLESS INTERAC PURCHASE - 5022 MCDONALD'S, #347");
  });

  it("sinal define receita/despesa e o valor fica positivo", () => {
    expect(txs[0]).toMatchObject({ type: "expense", amount: 88.87, source: "csv" });
    expect(txs[1]).toMatchObject({ type: "income", amount: 1710.68 });
  });

  it("converte MM/DD/YYYY e gera hash estável", () => {
    expect(txs[0]!.date.slice(0, 10)).toBe("2026-11-02");
    expect(parseRbcCsv(CSV)[0]!.importHash).toBe(txs[0]!.importHash);
    expect(txs[0]!.importHash).not.toBe(txs[1]!.importHash);
  });

  it("duas linhas idênticas no mesmo dia viram dois lançamentos", () => {
    const dup = `Account Type,Account Number,Transaction Date,Cheque Number,Description 1,Description 2,CAD$,USD$
Chequing,00000-0000000,5/1/2026,,TELEPHONE BILL PMT ROGERS PAC,,-52.36,
Chequing,00000-0000000,5/1/2026,,TELEPHONE BILL PMT ROGERS PAC,,-52.36,
`;
    const single = dup.split("\n").slice(0, 2).join("\n");
    const two = parseRbcCsv(dup);
    expect(two).toHaveLength(2);
    expect(two[0]!.importHash).not.toBe(two[1]!.importHash);
    // A primeira mantém o hash de sempre: reimportar não duplica o que já existe.
    expect(two[0]!.importHash).toBe(parseRbcCsv(single)[0]!.importHash);
    // Reimportar o mesmo arquivo gera os mesmos hashes.
    expect(parseRbcCsv(dup).map((t) => t.importHash)).toEqual(two.map((t) => t.importHash));
  });

  it("rejeita CSV sem colunas reconhecidas", () => {
    expect(() => parseRbcCsv("a,b\n1,2")).toThrow(/CSV não reconhecido/);
  });
});

describe("sumIncomeExpense", () => {
  it("soma por tipo e ignora valores inválidos", () => {
    expect(
      sumIncomeExpense([
        { amount: "100.50", type: "income" },
        { amount: 40, type: "expense" },
        { amount: "abc", type: "expense" },
      ]),
    ).toEqual({ income: 100.5, expense: 40, net: 60.5 });
  });
});
