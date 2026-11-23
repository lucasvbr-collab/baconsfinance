"use client";

import { formatCAD } from "@/lib/format";
import type { MonthFlow, MonthsSummary } from "@/lib/monthly-flows";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const INCOME = "var(--success)";
const EXPENSE = "var(--accent)";
const NEGATIVE = "var(--danger)";

const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTH_LONG = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function monthParts(ym: string) {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  return { year: y, month: m };
}
const shortLabel = (ym: string) => MONTH_SHORT[monthParts(ym).month - 1]!;
const longLabel = (ym: string) => {
  const { year, month } = monthParts(ym);
  return `${MONTH_LONG[month - 1]} ${year}`;
};
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${formatCAD(Math.abs(n))}`;

/** Valor curto para o eixo: $1.5k, $800. */
function axisMoney(n: number): string {
  const a = Math.abs(n);
  const s = a >= 1000 ? `$${(a / 1000).toFixed(a % 1000 === 0 ? 0 : 1)}k` : `$${Math.round(a)}`;
  return n < 0 ? `−${s}` : s;
}

/** Passo "redondo" (1, 2, 2.5, 5 × 10^n) para ~4 linhas de grade. */
function niceStep(range: number): number {
  if (range <= 0) return 1;
  const raw = range / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * pow;
}

function useWidth<T extends HTMLElement>() {
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
function barPath(x: number, w: number, y0: number, y1: number): string {
  const h = Math.abs(y1 - y0);
  if (h < 0.5) return "";
  const r = Math.min(4, w / 2, h);
  if (y1 < y0) {
    // para cima
    return `M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + w - r} Q${x + w},${y1} ${x + w},${y1 + r} V${y0} Z`;
  }
  // para baixo
  return `M${x},${y0} V${y1 - r} Q${x},${y1} ${x + r},${y1} H${x + w - r} Q${x + w},${y1} ${x + w},${y1 - r} V${y0} Z`;
}

type ChartProps = {
  months: MonthFlow[];
  currentYm: string;
  active: number | null;
  setActive: (i: number | null) => void;
};

const H = 220;
const PAD = { top: 12, right: 8, bottom: 28, left: 48 };

function Tooltip({ m, currentYm, x, width }: { m: MonthFlow; currentYm: string; x: number; width: number }) {
  const left = Math.min(Math.max(x - 90, 0), Math.max(width - 180, 0));
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 w-[180px] rounded-xl bg-plum px-3 py-2.5 text-xs text-white shadow-plum"
      style={{ left }}
      role="status"
    >
      <p className="font-semibold">
        {longLabel(m.ym)}
        {m.ym === currentYm && <span className="font-normal text-white/60"> · em andamento</span>}
      </p>
      <dl className="mt-1.5 space-y-0.5">
        <div className="flex justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-white/70">
            <span className="h-2 w-2 rounded-full" style={{ background: INCOME }} aria-hidden />
            Entrou
          </dt>
          <dd className="money font-semibold">{formatCAD(m.income)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-white/70">
            <span className="h-2 w-2 rounded-full ring-1 ring-white/50" style={{ background: EXPENSE }} aria-hidden />
            Saiu
          </dt>
          <dd className="money font-semibold">{formatCAD(m.expense)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-white/15 pt-1">
          <dt className="text-white/70">{m.net >= 0 ? "Sobrou" : "Faltou"}</dt>
          <dd className={`money font-bold ${m.net >= 0 ? "text-lime" : "text-[#ff9db5]"}`}>{signed(m.net)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Colunas invisíveis que capturam o mouse/dedo por mês (alvo maior que a barra). */
function HitColumns({ n, plotW, setActive }: { n: number; plotW: number; setActive: (i: number | null) => void }) {
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

function Axis({ ticks, y, plotW }: { ticks: number[]; y: (v: number) => number; plotW: number }) {
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

function MonthLabels({ months, plotW, currentYm }: { months: MonthFlow[]; plotW: number; currentYm: string }) {
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

function InOutChart({ months, currentYm, active, setActive }: ChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const plotW = Math.max(width - PAD.left - PAD.right, 0);
  const plotH = H - PAD.top - PAD.bottom;
  const max = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const colW = plotW / Math.max(months.length, 1);
  const barW = Math.max(3, Math.min(18, colW * 0.3));

  return (
    <div ref={ref} className="relative" onPointerLeave={(e) => {
        // No toque o "leave" vem logo após soltar o dedo: o quadro fica até tocar em outro mês.
        if (e.pointerType === "mouse") setActive(null);
      }}>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label="Entradas e saídas por mês. Os valores estão na tabela abaixo.">
          <Axis ticks={ticks} y={y} plotW={plotW} />
          {months.map((m, i) => {
            const cx = PAD.left + colW * (i + 0.5);
            const dim = active !== null && active !== i;
            const ongoing = m.ym === currentYm;
            return (
              <g key={m.ym} opacity={dim ? 0.35 : ongoing ? 0.55 : 1}>
                <path d={barPath(cx - barW - 1, barW, y(0), y(m.income))} fill={INCOME} />
                <path d={barPath(cx + 1, barW, y(0), y(m.expense))} fill={EXPENSE} />
              </g>
            );
          })}
          <MonthLabels months={months} plotW={plotW} currentYm={currentYm} />
          <HitColumns n={months.length} plotW={plotW} setActive={setActive} />
        </svg>
      )}
      {active !== null && months[active] && (
        <Tooltip m={months[active]!} currentYm={currentYm} x={PAD.left + colW * (active + 0.5)} width={width} />
      )}
    </div>
  );
}

function NetChart({ months, currentYm, active, setActive }: ChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const plotW = Math.max(width - PAD.left - PAD.right, 0);
  const plotH = H - PAD.top - PAD.bottom;
  const hi = Math.max(0, ...months.map((m) => m.net));
  const lo = Math.min(0, ...months.map((m) => m.net));
  const step = niceStep(Math.max(hi - lo, 1));
  const top = Math.ceil(hi / step) * step;
  const bottom = Math.floor(lo / step) * step;
  const span = Math.max(top - bottom, step);
  const ticks = Array.from({ length: Math.round((top - bottom) / step) + 1 }, (_, i) => bottom + i * step);
  const y = (v: number) => PAD.top + ((top - v) / span) * plotH;
  const colW = plotW / Math.max(months.length, 1);
  const barW = Math.max(4, Math.min(28, colW * 0.5));

  return (
    <div ref={ref} className="relative" onPointerLeave={(e) => {
        // No toque o "leave" vem logo após soltar o dedo: o quadro fica até tocar em outro mês.
        if (e.pointerType === "mouse") setActive(null);
      }}>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label="Quanto sobrou ou faltou por mês. Os valores estão na tabela abaixo.">
          <Axis ticks={ticks} y={y} plotW={plotW} />
          {months.map((m, i) => {
            const cx = PAD.left + colW * (i + 0.5);
            const dim = active !== null && active !== i;
            const ongoing = m.ym === currentYm;
            return (
              <path
                key={m.ym}
                d={barPath(cx - barW / 2, barW, y(0), y(m.net))}
                fill={m.net >= 0 ? INCOME : NEGATIVE}
                opacity={dim ? 0.35 : ongoing ? 0.55 : 1}
              />
            );
          })}
          <MonthLabels months={months} plotW={plotW} currentYm={currentYm} />
          <HitColumns n={months.length} plotW={plotW} setActive={setActive} />
        </svg>
      )}
      {active !== null && months[active] && (
        <Tooltip m={months[active]!} currentYm={currentYm} x={PAD.left + colW * (active + 0.5)} width={width} />
      )}
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "bad" }) {
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

function Legend() {
  return (
    <ul className="flex gap-4 text-xs text-foreground/65">
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: INCOME }} aria-hidden />
        Entrou
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: EXPENSE }} aria-hidden />
        Saiu
      </li>
    </ul>
  );
}

export function MonthlyView({
  months,
  summary,
  currentYm,
}: {
  months: MonthFlow[];
  summary: MonthsSummary;
  currentYm: string;
}) {
  const [active, setActive] = useState<number | null>(null);

  if (months.length === 0) {
    return (
      <p className="rounded-3xl bg-card p-6 text-sm text-foreground/65 shadow-card">
        Não há lançamentos neste período.{" "}
        <Link href="/transactions/import" className="font-semibold text-accent underline">
          Importar extrato
        </Link>
      </p>
    );
  }

  const avg = summary.averageNet;
  const current = months.find((m) => m.ym === currentYm);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Sobra média por mês"
          value={avg === null ? "—" : signed(avg)}
          hint={summary.closed > 0 ? `${summary.closed} ${summary.closed === 1 ? "mês fechado" : "meses fechados"}` : undefined}
          tone={avg === null ? undefined : avg >= 0 ? "good" : "bad"}
        />
        <Stat
          label="Total que sobrou"
          value={summary.closed > 0 ? signed(summary.totalNet) : "—"}
          hint="soma dos meses fechados"
          tone={summary.closed === 0 ? undefined : summary.totalNet >= 0 ? "good" : "bad"}
        />
        <Stat
          label="Melhor mês"
          value={summary.best ? signed(summary.best.net) : "—"}
          hint={summary.best ? longLabel(summary.best.ym) : undefined}
        />
        <Stat
          label="Pior mês"
          value={summary.worst ? signed(summary.worst.net) : "—"}
          hint={summary.worst ? longLabel(summary.worst.ym) : undefined}
        />
      </div>

      <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-bold tracking-tight">Quanto sobrou</h2>
          {current && (
            <p className="text-xs text-foreground/55">
              {longLabel(currentYm)} ainda em andamento: {signed(current.net)} até agora
            </p>
          )}
        </div>
        <div className="mt-4">
          <NetChart months={months} currentYm={currentYm} active={active} setActive={setActive} />
        </div>
      </section>

      <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-bold tracking-tight">Entrou e saiu</h2>
          <Legend />
        </div>
        <div className="mt-4">
          <InOutChart months={months} currentYm={currentYm} active={active} setActive={setActive} />
        </div>
      </section>

      <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
        <h2 className="font-display text-xl font-bold tracking-tight">Tabela</h2>
        <div className="-mx-2 mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-foreground/55">
                <th className="px-2 py-2 font-medium">Mês</th>
                <th className="px-2 py-2 text-right font-medium">Entrou</th>
                <th className="px-2 py-2 text-right font-medium">Saiu</th>
                <th className="px-2 py-2 text-right font-medium">Sobrou</th>
                <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">Guardado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...months].reverse().map((m) => {
                const pct = m.income > 0 ? Math.round((m.net / m.income) * 100) : null;
                return (
                  <tr key={m.ym} className="hover:bg-background">
                    <td className="px-1.5 sm:px-2 py-2.5">
                      <Link href={`/dashboard?month=${m.ym}`} className="font-semibold hover:text-accent">
                        <span className="sm:hidden">
                          {shortLabel(m.ym)} {m.ym.slice(2, 4)}
                          {m.ym === currentYm && "*"}
                        </span>
                        <span className="hidden sm:inline">{longLabel(m.ym)}</span>
                      </Link>
                      {m.ym === currentYm && (
                        <span className="ml-1.5 hidden text-xs text-foreground/45 sm:inline">em andamento</span>
                      )}
                    </td>
                    <td className="money px-1.5 sm:px-2 py-2.5 text-right">{formatCAD(m.income)}</td>
                    <td className="money px-1.5 sm:px-2 py-2.5 text-right">{formatCAD(m.expense)}</td>
                    <td className={`money px-2 py-2.5 text-right font-semibold ${m.net >= 0 ? "text-success" : "text-danger"}`}>
                      {signed(m.net)}
                    </td>
                    <td className="money hidden px-2 py-2.5 text-right text-foreground/65 sm:table-cell">{pct === null ? "—" : `${pct}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {months.some((m) => m.ym === currentYm) && (
          <p className="mt-2 text-xs text-foreground/45 sm:hidden">* mês em andamento</p>
        )}
      </section>
    </div>
  );
}
