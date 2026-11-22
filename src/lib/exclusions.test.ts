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

  it("não pareia NSF com despesa de outro valor ou muito antiga", () => {
    const txs: ExclusionCandidate[] = [
      { description: "ITEM RETURNED NSF", amount: 50, type: "income", date: day("2026-11-20") },
      { description: "BILL PMT", amount: 49.99, type: "expense", date: day("2026-11-20") },
      { description: "BILL PMT", amount: 50, type: "expense", date: day("2026-11-01") },
    ];
    expect([...detectExclusions(txs)]).toEqual([0]);
  });
});
