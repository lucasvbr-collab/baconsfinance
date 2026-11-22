/**
 * Descrição para mostrar na tela: tira o "jargão" do RBC do começo
 * ("CONTACTLESS INTERAC PURCHASE - 9694 …") e deixa o nome da loja/pagador.
 * A descrição original continua gravada; isto é só apresentação.
 */
const PREFIXES = [
  /^(?:CONTACTLESS )?INTERAC PURCHASE - \d{3,4} /i,
  /^VISA DEBIT PURCHASE - \d{3,4} /i,
  /^ONLINE BANKING PAYMENT - \d{3,4} /i,
  /^E-TRANSFER (?:SENT|RECEIVED) /i,
  /^PAYROLL DEPOSIT /i,
  /^TELEPHONE BILL PMT /i,
  /^HYDRO BILL PMT /i,
  /^INSURANCE /i,
];

export function friendlyDescription(raw: string): string {
  const text = raw.trim();
  for (const re of PREFIXES) {
    const rest = text.replace(re, "").trim();
    if (rest !== text && rest.length > 0) return rest;
  }
  return text;
}
