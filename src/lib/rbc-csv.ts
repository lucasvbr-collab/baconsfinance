import { createHash } from "node:crypto";
import type { IncomingTransaction } from "@/lib/import-transactions";

/**
 * Parser do CSV de exportação do RBC Online Banking.
 * Formato típico: Account Type,Account Number,Transaction Date,Cheque Number,
 * Description 1,Description 2,CAD$,USD$
 * (cabeçalhos variam um pouco; detecção flexível.)
 */
export function parseRbcCsv(raw: string): IncomingTransaction[] {
  const text = raw.replace(/^\uFEFF/, "").trim();
  if (!text) return [];

  const lines = splitCsvLines(text);
  if (lines.length < 2) return [];

  const header = parseCsvRow(lines[0]!).map((h) => h.trim().toLowerCase());
  const dateIdx = findCol(header, ["transaction date", "date", "posted date"]);
  const desc1Idx = findCol(header, ["description 1", "description", "desc"]);
  const desc2Idx = findCol(header, ["description 2"]);
  const cadIdx = findCol(header, ["cad$", "cad", "amount"]);
  const usdIdx = findCol(header, ["usd$"]);

  if (dateIdx < 0 || cadIdx < 0) {
    throw new Error(
      "CSV não reconhecido. Exporte pelo RBC Online Banking (Accounting Software / CSV).",
    );
  }

  const out: IncomingTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvRow(lines[i]!);
    if (row.every((c) => !c.trim())) continue;

    const dateRaw = row[dateIdx]?.trim() ?? "";
    const iso = parseRbcDate(dateRaw);
    if (!iso) continue;

    const amountRaw = (row[cadIdx] ?? row[usdIdx] ?? "").trim();
    const signed = Number.parseFloat(amountRaw.replace(/,/g, ""));
    if (!Number.isFinite(signed) || signed === 0) continue;

    const d1 = desc1Idx >= 0 ? (row[desc1Idx] ?? "").trim() : "";
    const d2 = desc2Idx >= 0 ? (row[desc2Idx] ?? "").trim() : "";
    const description = [d1, d2].filter(Boolean).join(" — ") || "Sem descrição";

    // RBC: valores negativos costumam ser despesas (débito).
    const type = signed < 0 ? "expense" : "income";
    const amount = Math.abs(signed);
    const day = iso.slice(0, 10);
    const importHash = createHash("sha256")
      .update(`csv|${day}|${amount.toFixed(2)}|${description}|${type}`)
      .digest("hex");

    out.push({
      description,
      merchantName: d1 || description,
      amount,
      type,
      date: new Date(`${day}T12:00:00`).toISOString(),
      source: "csv",
      importHash,
    });
  }
  return out;
}

function findCol(header: string[], aliases: string[]): number {
  for (const a of aliases) {
    const i = header.indexOf(a);
    if (i >= 0) return i;
  }
  return -1;
}

/** MM/DD/YYYY ou YYYY-MM-DD */
function parseRbcDate(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mm = m[1]!.padStart(2, "0");
    const dd = m[2]!.padStart(2, "0");
    return `${m[3]}-${mm}-${dd}`;
  }
  return null;
}

function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === '"') {
      inQuotes = !inQuotes;
      cur += ch;
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      lines.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur) lines.push(cur);
  return lines;
}

function parseCsvRow(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  return cells;
}
