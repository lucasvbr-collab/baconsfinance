import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CardStatementError,
  parseRbcCardStatementText,
} from "./rbc-card-statement";

// O checkout no Windows pode trazer CRLF; os testes trabalham com LF.
const FIXTURE = readFileSync(
  fileURLToPath(new URL("./__fixtures__/rbc-mastercard-2026-11.txt", import.meta.url)),
  "utf8",
).replace(/\r\n/g, "\n");

const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;

describe("parseRbcCardStatementText (fatura out/nov 2026)", () => {
  const st = parseRbcCardStatementText(FIXTURE);

  it("lê o resumo da fatura", () => {
    expect(st).toMatchObject({
      cardLast4: "1256",
      periodStart: "2026-10-06",
      periodEnd: "2026-11-03",
      dueDate: "2026-11-24",
      previousBalance: 568.09,
      paymentsCredits: -749.66,
      purchasesDebits: 513,
      cashAdvances: 0,
      interest: 0,
      fees: 0,
      newBalance: 331.43,
    });
  });

  it("encontra as 20 compras somando 513,00", () => {
    const purchases = st.lines.filter((l) => !l.isPayment);
    expect(purchases).toHaveLength(20);
    expect(sum(purchases.map((l) => l.amount))).toBe(513);
  });

  it("separa os 2 pagamentos", () => {
    expect(st.lines.filter((l) => l.isPayment).map((l) => l.amount)).toEqual([
      -534.48, -215.18,
    ]);
  });

  it("ignora referência numérica e linha de câmbio na descrição", () => {
    const purchases = st.lines.filter((l) => !l.isPayment);
    expect(purchases[0]).toEqual({
      date: "2026-10-06",
      description: "PTCENTERPAG LEIRIA 10",
      amount: 25.17,
      isPayment: false,
    });
    expect(purchases.at(-1)).toEqual({
      date: "2026-11-02",
      description: "BURGER KING #8818 OTTAWA ON",
      amount: 19.77,
      isPayment: false,
    });
  });

  it("lê o texto com quebras CRLF do mesmo jeito", () => {
    const crlf = parseRbcCardStatementText(FIXTURE.replace(/\n/g, "\r\n"));
    expect(crlf.lines).toEqual(st.lines);
  });
});

describe("parseRbcCardStatementText (proteções)", () => {
  it("recusa fatura com linha faltando, dizendo quanto leu e quanto a fatura diz", () => {
    const broken = FIXTURE.replace(
      /OCT 11 OCT 13 STARBUCKS[^\n]*\n[^\n]*\n\$7\.63\n/,
      "",
    );
    expect(broken).not.toBe(FIXTURE);
    expect(() => parseRbcCardStatementText(broken)).toThrow(CardStatementError);
    expect(() => parseRbcCardStatementText(broken)).toThrow(/505,37|505\.37/);
    expect(() => parseRbcCardStatementText(broken)).toThrow(/513,00|513\.00/);
  });

  it("recusa PDF que não é fatura do RBC Mastercard", () => {
    expect(() =>
      parseRbcCardStatementText("RBC Royal Bank chequing statement\nOpening balance $10.00"),
    ).toThrow("Não reconheci uma fatura do RBC Mastercard neste PDF.");
  });

  const mini = (lines: string, summary: { prev: string; pay: string; pur: string; nb: string }) =>
    [
      "RBC® Cash Back Mastercard‡",
      "TITULAR EXEMPLO 0000 00** **** 9999",
      "STATEMENT FROM DEC 06 TO JAN 05, 2027",
      `Previous Account Balance ${summary.prev}`,
      `Payments & credits ${summary.pay}`,
      `Purchases & debits ${summary.pur}`,
      "Cash advances $0.00",
      "Interest $0.00",
      "Fees $0.00",
      `NEW BALANCE ${summary.nb}`,
      "Payment due date JAN 26, 2027",
      lines,
    ].join("\n");

  it("fatura que vira o ano: dezembro fica no ano anterior", () => {
    const st = parseRbcCardStatementText(
      mini("DEC 20 DEC 21 LOJA X\n12345678901234567890123\n$10.00\nJAN 02 JAN 03 LOJA Y\n12345678901234567890124\n$5.00", {
        prev: "$0.00",
        pay: "$0.00",
        pur: "$15.00",
        nb: "$15.00",
      }),
    );
    expect(st.periodStart).toBe("2026-12-06");
    expect(st.lines.map((l) => l.date)).toEqual(["2026-12-20", "2027-01-02"]);
  });

  it("lê valor com milhar e estorno que não é pagamento", () => {
    const st = parseRbcCardStatementText(
      mini("DEC 10 DEC 11 TV GRANDE\n12345678901234567890123\n$1,234.56\nDEC 12 DEC 13 TV GRANDE REFUND\n12345678901234567890124\n-$12.00", {
        prev: "$0.00",
        pay: "-$12.00",
        pur: "$1,234.56",
        nb: "$1,222.56",
      }),
    );
    expect(st.lines).toEqual([
      { date: "2026-12-10", description: "TV GRANDE", amount: 1234.56, isPayment: false },
      { date: "2026-12-12", description: "TV GRANDE REFUND", amount: -12, isPayment: false },
    ]);
  });
});
