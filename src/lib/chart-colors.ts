/**
 * Paleta das categorias (faixa do cartão do mês e barras).
 * Família ameixa/verde, legível tanto sobre o cartão ameixa quanto sobre branco.
 */
export const CHART_BAR_COLORS = [
  "#8b6cff", // violeta
  "#2fbf85", // verde
  "#c8f169", // lima
  "#e36a8f", // rosa
  "#f2b544", // âmbar
  "#5bc0eb", // céu
  "#b79cff", // lavanda
  "#7fd9b0", // menta
  "#ff9c6b", // pêssego
  "#d9a0f0", // orquídea
  "#4e7bff", // azul
  "#a7a1b8", // cinza lilás
] as const;

export function chartColorAt(index: number): string {
  return CHART_BAR_COLORS[index % CHART_BAR_COLORS.length]!;
}
