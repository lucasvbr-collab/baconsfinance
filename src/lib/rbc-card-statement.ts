import { formatCAD } from "@/lib/format";

/**
 * Leitor da fatura em PDF do RBC Mastercard (texto extraído com unpdf).
 * Lê o resumo e cada lançamento, e confere a soma contra o resumo antes de
 * devolver: fatura que não fecha é recusada inteira.
 */

export type CardStatementLine = {
  /** YYYY-MM-DD, data da transação */
  date: string;
  description: string;
  /** > 0 compra, < 0 crédito (pagamento ou estorno) */
  amount: number;
  isPayment: boolean;
};

export type CardStatement = {
  cardLast4: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string | null;
  previousBalance: number;
  /** Negativo, como na fatura */
  paymentsCredits: number;
  purchasesDebits: number;
  cashAdvances: number;
  interest: number;
  fees: number;
  newBalance: number;
  lines: CardStatementLine[];
};

export class CardStatementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CardStatementError";
  }
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MON = MONTHS.join("|");
const MONEY = String.raw`-?\$[\d,]+\.\d{2}`;
const LINE_START = new RegExp(`^(${MON}) (\\d{1,2}) (?:${MON}) \\d{1,2} (.+)$`);
const AMOUNT_ONLY = new RegExp(`^${MONEY}$`);
const AMOUNT_AT_END = new RegExp(`^(.*?)\\s+(${MONEY})$`);
const PAYMENT = /^PAYMENT - THANK YOU/i;
const NOT_RECOGNIZED = "Não reconheci uma fatura do RBC Mastercard neste PDF.";

function money(raw: string): number {
  const neg = raw.trim().startsWith("-");
  const n = Number.parseFloat(raw.replace(/[^\d.]/g, ""));
  return neg ? -n : n;
}

function cents(n: number): number {
  return Math.round(n * 100);
}

function isoDate(year: number, mon: string, day: string): string {
  const m = MONTHS.indexOf(mon) + 1;
  return `${year}-${String(m).padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function summaryValue(text: string, label: RegExp): number {
  const m = text.match(label);
  if (!m) throw new CardStatementError(NOT_RECOGNIZED);
  return money(m[1]!);
}

export function parseRbcCardStatementText(text: string): CardStatement {
  if (!/mastercard/i.test(text)) throw new CardStatementError(NOT_RECOGNIZED);
  const period = text.match(
    new RegExp(`STATEMENT FROM (${MON}) (\\d{1,2}) TO (${MON}) (\\d{1,2}), (\\d{4})`),
  );
  if (!period) throw new CardStatementError(NOT_RECOGNIZED);

  const [, startMon, startDay, endMon, endDay, endYearRaw] = period;
  const endYear = Number(endYearRaw);
  const endMonthIdx = MONTHS.indexOf(endMon!);
  // Mês depois do mês final = ano anterior (fatura que vira o ano).
  const yearFor = (mon: string) =>
    MONTHS.indexOf(mon) > endMonthIdx ? endYear - 1 : endYear;

  const due = text.match(new RegExp(`Payment due date\\s+(${MON}) (\\d{1,2}), (\\d{4})`, "i"));
  const last4 = text.match(/\*{4} (\d{4})/);

  const statement: CardStatement = {
    cardLast4: last4?.[1] ?? "",
    periodStart: isoDate(yearFor(startMon!), startMon!, startDay!),
    periodEnd: isoDate(endYear, endMon!, endDay!),
    dueDate: due ? isoDate(Number(due[3]), due[1]!.toUpperCase(), due[2]!) : null,
    previousBalance: summaryValue(text, new RegExp(`Previous Account Balance\\s+(${MONEY})`, "i")),
    paymentsCredits: summaryValue(text, new RegExp(`Payments & credits\\s+(${MONEY})`, "i")),
    purchasesDebits: summaryValue(text, new RegExp(`Purchases & debits\\s+(${MONEY})`, "i")),
    cashAdvances: summaryValue(text, new RegExp(`Cash advances\\s+(${MONEY})`, "i")),
    interest: summaryValue(text, new RegExp(`^Interest\\s+(${MONEY})$`, "m")),
    fees: summaryValue(text, new RegExp(`^Fees\\s+(${MONEY})$`, "m")),
    newBalance: summaryValue(text, new RegExp(`NEW BALANCE\\s+(${MONEY})`)),
    lines: [],
  };

  let open: { date: string; description: string } | null = null;
  const close = (amount: number) => {
    statement.lines.push({
      date: open!.date,
      description: open!.description,
      amount,
      isPayment: PAYMENT.test(open!.description),
    });
    open = null;
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const start = line.match(LINE_START);
    if (start) {
      const [, mon, day, rest] = start;
      const date = isoDate(yearFor(mon!), mon!, day!);
      const inline = rest!.match(AMOUNT_AT_END);
      open = { date, description: (inline ? inline[1]! : rest!).trim() };
      if (inline) close(money(inline[2]!));
      continue;
    }
    if (open && AMOUNT_ONLY.test(line)) close(money(line));
    // Outras linhas (referência numérica, câmbio, cabeçalhos) são ignoradas.
  }

  reconcile(statement);
  return statement;
}

function reconcile(st: CardStatement): void {
  const debits = st.lines.filter((l) => l.amount > 0).reduce((a, l) => a + cents(l.amount), 0);
  const credits = st.lines.filter((l) => l.amount < 0).reduce((a, l) => a + cents(l.amount), 0);
  const expectedDebits =
    cents(st.purchasesDebits) + cents(st.cashAdvances) + cents(st.interest) + cents(st.fees);

  if (Math.abs(debits - expectedDebits) > 1) {
    throw new CardStatementError(
      `Li ${formatCAD(debits / 100)} em compras, mas a fatura diz ${formatCAD(expectedDebits / 100)}. Nada foi importado.`,
    );
  }
  if (Math.abs(credits - cents(st.paymentsCredits)) > 1) {
    throw new CardStatementError(
      `Li ${formatCAD(credits / 100)} em créditos, mas a fatura diz ${formatCAD(st.paymentsCredits)}. Nada foi importado.`,
    );
  }
  if (Math.abs(cents(st.previousBalance) + debits + credits - cents(st.newBalance)) > 1) {
    throw new CardStatementError("O saldo da fatura não fecha. Nada foi importado.");
  }
}

/** Texto do PDF, páginas unidas por quebra de linha. */
export async function extractPdfText(data: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const doc = await getDocumentProxy(data);
  const { text } = await extractText(doc, { mergePages: false });
  return text.join("\n");
}
