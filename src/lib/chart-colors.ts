/** Paleta partilhada entre barras e gráfico circular (despesas por categoria). */
export const CHART_BAR_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#ec4899",
  "#a855f7",
  "#94a3b8",
  "#e85d04",
  "#14b8a6",
] as const;

export function chartColorAt(index: number): string {
  return CHART_BAR_COLORS[index % CHART_BAR_COLORS.length]!;
}
