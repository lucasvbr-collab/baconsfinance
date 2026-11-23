import { describe, expect, it } from "vitest";
import { detectExclusions, type ExclusionCandidate } from "./exclusions";

const day = (d: string) => `${d}T12:00:00.000Z`;

describe("detectExclusions", () => {
  it("exclui estornos NSF e o pagamento que voltou, mas não o pagamento refeito", () => {
    const txs: ExclusionCandidate[] = [
      { description: "ITEM RETURNED NSF", amount: 125.13, type: "income", date: day("2026-11-02") },
      { description: "ITEM RETURNED NSF", amount: 58.12, type: "income", date: day("2026-11-02") },
      { description: "TELEPHONE BILL PMT ROGERS PAC", amount: 125.13, type: "expense", date: day("2026-11-02") },
      { description: "TELEPHONE BILL PMT ROGERS PAC", amount: 58.12, type: "expense", date: day("2026-11-02") },
      { description: "TELEPHONE BILL PMT ROGERS PAC", amount: 125.13, type: "expense", date: day("2026-11-09") },
      { description: "TELEPHONE BILL PMT ROGERS PAC", amount: 58.12, type: "expense", date: day("2026-11-09") },
    ];
    expect([...detectExclusions(txs)].sort()).toEqual([0, 1, 2, 3]);
  });

  it("exclui transferência entre contas próprias, mas não e-transfer (aluguel)", () => {
    const txs: ExclusionCandidate[] = [
      { description: "ONLINE BANKING TRANSFER - 4110", amount: 1500, type: "income", date: day("2026-11-03") },
      { description: "E-TRANSFER SENT BRITISH SQUARE KHHKSR", amount: 1955, type: "expense", date: day("2026-11-02") },
    ];
    expect([...detectExclusions(txs)]).toEqual([0]);
  });

  it("exclui e-transfers com nomes da lista (enviado, recebido, autodepósito, cancelado)", () => {
    const names = ["LUCAS GUILHERME"];
    const txs: ExclusionCandidate[] = [
      { description: "E-TRANSFER - AUTODEPOSIT LUCAS GUILHERME SILVA CAXWCFMC", amount: 2677.02, type: "income", date: day("2026-05-13") },
      { description: "E-TRANSFER RECEIVED LUCAS GUILHERME SILVA CAGXSVTG", amount: 1076.37, type: "income", date: day("2026-03-03") },
      { description: "E-TRANSFER SENT LUCAS GUILHERME XB32TA", amount: 100, type: "expense", date: day("2026-03-09") },
      { description: "E-TRANSFER CANCEL LUCAS GUILHERME XB32TA", amount: 100, type: "income", date: day("2026-04-15") },
      { description: "E-TRANSFER SENT BRITISH SQUARE MAL646", amount: 1915, type: "expense", date: day("2026-05-04") },
      { description: "PAYROLL DEPOSIT LUCAS GUILHERME LTD", amount: 500, type: "income", date: day("2026-05-04") },
    ];
    expect([...detectExclusions(txs, names)].sort()).toEqual([0, 1, 2, 3]);
    expect([...detectExclusions(txs)]).toEqual([]);
  });

  it("nome da lista ignora maiúsculas e espaços extras", () => {
    const txs: ExclusionCandidate[] = [
      { description: "E-TRANSFER SENT LUCAS   GUILHERME SILVA X1", amount: 50, type: "expense", date: day("2026-07-16") },
    ];
    expect([...detectExclusions(txs, [" lucas guilherme "])]).toEqual([0]);
    expect([...detectExclusions(txs, ["", "  "])]).toEqual([]);
  });

  it("não pareia NSF com despesa de outro valor ou muito antiga", () => {
    const txs: ExclusionCandidate[] = [
      { description: "ITEM RETURNED NSF", amount: 50, type: "income", date: day("2026-11-20") },
      { description: "BILL PMT", amount: 49.99, type: "expense", date: day("2026-11-20") },
      { description: "BILL PMT", amount: 50, type: "expense", date: day("2026-11-01") },
    ];
    expect([...detectExclusions(txs)]).toEqual([0]);
  });
});
