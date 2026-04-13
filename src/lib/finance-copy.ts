import { formatBRL } from "@/lib/format";

/** Subtítulo do saldo total: variação do líquido do mês vs mês anterior. */
export function monthNetChangeSubtitle(
  currentMonthNet: number,
  previousMonthNet: number,
): { text: string; className: string } {
  const diff = currentMonthNet - previousMonthNet;
  if (previousMonthNet === 0 && currentMonthNet === 0) {
    return {
      text: "Líquido do mês igual ao mês anterior",
      className: "text-foreground/50",
    };
  }
  if (previousMonthNet === 0) {
    return {
      text: `Líquido do mês: ${formatBRL(currentMonthNet)}`,
      className: "text-success",
    };
  }
  const pct = (diff / Math.abs(previousMonthNet)) * 100;
  const absPct = Math.abs(pct).toFixed(1).replace(".", ",");
  const arrow = diff >= 0 ? "↑" : "↓";
  const positive = diff >= 0;
  return {
    text: `${arrow} ${absPct}% líquido do mês vs anterior`,
    className: positive ? "text-success" : "text-danger",
  };
}
