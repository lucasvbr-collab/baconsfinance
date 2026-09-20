export function formatCAD(value: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);
}

/** Entrada monetária: vírgula ou ponto como decimal, vírgulas como milhares (estilo en-CA). */
export function parseMoneyInput(input: string): number {
  const s = input.trim().replace(/[^\d.,-]/g, "");
  if (!s) return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    return Number.parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return Number.parseFloat(s.replace(/,/g, "")) || 0;
}
