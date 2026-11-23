"use client";

import { formatCAD } from "@/lib/format";
import { useEffect, useRef, useState } from "react";

/** Peças comuns dos gráficos da aba Mês a mês (SVG desenhado à mão). */

export const INCOME = "var(--success)";
export const EXPENSE = "var(--accent)";
export const NEGATIVE = "var(--danger)";

const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTH_LONG = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function monthParts(ym: string) {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  return { year: y, month: m };
}
export const shortLabel = (ym: string) => MONTH_SHORT[monthParts(ym).month - 1]!;
export const longLabel = (ym: string) => {
  const { year, month } = monthParts(ym);
  return `${MONTH_LONG[month - 1]} ${year}`;
};
export const signed = (n: number) => `${n >= 0 ? "+" : "−"}${formatCAD(Math.abs(n))}`;

/** Valor curto para o eixo: $1.5k, $800. */
export function axisMoney(n: number): string {
  const a = Math.abs(n);
  const s = a >= 1000 ? `$${(a / 1000).toFixed(a % 1000 === 0 ? 0 : 1)}k` : `$${Math.round(a)}`;
  return n < 0 ? `−${s}` : s;
}

/** Passo "redondo" (1, 2, 2.5, 5 × 10^n) para ~4 linhas de grade. */
export function niceStep(range: number): number {
  if (range <= 0) return 1;
  const raw = range / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * pow;
}

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Barra com os cantos arredondados só na ponta do dado (longe da linha de base). */
export function barPath(x: number, w: number, y0: number, y1: number): string {
  const h = Math.abs(y1 - y0);
  if (h < 0.5) return "";
  const r = Math.min(4, w / 2, h);
  if (y1 < y0) {
    return `M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + w - r} Q${x + w},${y1} ${x + w},${y1 + r} V${y0} Z`;
  }
  return `M${x},${y0} V${y1 - r} Q${x},${y1} ${x + r},${y1} H${x + w - r} Q${x + w},${y1} ${x + w},${y1 - r} V${y0} Z`;
}

export const H = 220;
export const PAD = { top: 12, right: 8, bottom: 28, left: 48 };

/** Colunas invisíveis que capturam o mouse/dedo por mês (alvo maior que a barra). */
export function HitColumns({ n, plotW, setActive }: { n: number; plotW: number; setActive: (i: number | null) => void }) {
  const colW = plotW / n;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <rect
          key={i}
          x={PAD.left + i * colW}
          y={0}
          width={colW}
          height={H}
          fill="transparent"
          onPointerEnter={() => setActive(i)}
          onPointerDown={() => setActive(i)}
        />
      ))}
    </g>
  );
}

export function Axis({ ticks, y, plotW }: { ticks: number[]; y: (v: number) => number; plotW: number }) {
  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={PAD.left + plotW}
            y1={y(t)}
            y2={y(t)}
            stroke="var(--border)"
            strokeWidth={t === 0 ? 1.5 : 1}
          />
          <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="currentColor" opacity="0.55">
            {axisMoney(t)}
          </text>
        </g>
      ))}
    </g>
  );
}

export function MonthLabels({ months, plotW, currentYm }: { months: { ym: string }[]; plotW: number; currentYm: string }) {
  const colW = plotW / months.length;
  // Um rótulo a cada ~40px: períodos longos pulam meses.
  const every = Math.max(1, Math.ceil(40 / Math.max(colW, 1)));
  return (
    <g>
      {months.map((m, i) =>
        i % every === 0 || m.ym === currentYm ? (
          <text
            key={m.ym}
            x={PAD.left + colW * (i + 0.5)}
            y={H - 8}
            textAnchor="middle"
            fontSize="11"
            fill="currentColor"
            opacity={m.ym === currentYm ? 0.45 : 0.65}
          >
            {shortLabel(m.ym)}
            {m.ym.endsWith("-01") || i === 0 ? ` ${m.ym.slice(2, 4)}` : ""}
          </text>
        ) : null,
      )}
    </g>
  );
}

/** No toque o "leave" vem logo após soltar o dedo: o quadro fica até tocar em outro mês. */
export function mouseLeave(setActive: (i: number | null) => void) {
  return (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") setActive(null);
  };
}

export function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-3xl bg-card p-4 shadow-card sm:p-5">
      <p className="text-xs font-medium text-foreground/55">{label}</p>
      <p
        className={`money mt-1 font-display text-2xl font-bold tracking-tight ${
          tone === "good" ? "text-success" : tone === "bad" ? "text-danger" : ""
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-foreground/50">{hint}</p>}
    </div>
  );
}
