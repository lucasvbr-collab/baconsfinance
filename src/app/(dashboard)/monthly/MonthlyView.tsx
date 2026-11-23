"use client";

import {
  Axis,
  barPath,
  EXPENSE,
  H,
  HitColumns,
  INCOME,
  longLabel,
  MonthLabels,
  NEGATIVE,
  niceStep,
  PAD,
  shortLabel,
  signed,
  Stat,
  useWidth,
} from "./chart-kit";
import { formatCAD } from "@/lib/format";
import type { MonthFlow, MonthsSummary } from "@/lib/monthly-flows";
import Link from "next/link";
import { useState } from "react";

type ChartProps = {
  months: MonthFlow[];
  currentYm: string;
  active: number | null;
  setActive: (i: number | null) => void;
};

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
