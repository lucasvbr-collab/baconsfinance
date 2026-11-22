import { describe, expect, it } from "vitest";
import { friendlyDescription } from "./friendly-description";

describe("friendlyDescription", () => {
  it.each([
    ["CONTACTLESS INTERAC PURCHASE - 9694 A W # 4634 KANA", "A W # 4634 KANA"],
    ["CONTACTLESS INTERAC PURCHASE - 7264 PETRO-CANADA 10", "PETRO-CANADA 10"],
    ["INTERAC PURCHASE - 0737 SHELL C81588", "SHELL C81588"],
    ["ONLINE BANKING PAYMENT - 8517 SAAQ-REGISTRATI", "SAAQ-REGISTRATI"],
    ["E-TRANSFER SENT BRITISH SQUARE KHHKSR", "BRITISH SQUARE KHHKSR"],
    ["PAYROLL DEPOSIT SPENCE DIAMONDS", "SPENCE DIAMONDS"],
    ["TELEPHONE BILL PMT ROGERS PAC", "ROGERS PAC"],
    ["HYDRO BILL PMT HYDRO-QUEBEC", "HYDRO-QUEBEC"],
    ["VISA DEBIT PURCHASE - 1234 COSTCO WHOLESAL", "COSTCO WHOLESAL"],
  ])("%s → %s", (raw, expected) => {
    expect(friendlyDescription(raw)).toBe(expected);
  });

  it("deixa como está o que não tem prefixo de banco", () => {
    expect(friendlyDescription("UBER CANADA/UBERTRIP TORONTO ON")).toBe("UBER CANADA/UBERTRIP TORONTO ON");
    expect(friendlyDescription("Almoço com amigos")).toBe("Almoço com amigos");
    expect(friendlyDescription("OVERDRAFT INTEREST")).toBe("OVERDRAFT INTEREST");
  });

  it("nunca devolve vazio", () => {
    expect(friendlyDescription("PAYROLL DEPOSIT")).toBe("PAYROLL DEPOSIT");
    expect(friendlyDescription("")).toBe("");
  });
});
