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
  mouseLeave,
  NEGATIVE,
  niceStep,
  PAD,
  shortLabel,
  Stat,
  useWidth,
} from "./chart-kit";
import { CategoryIcon } from "@/components/CategoryIcon";
import type { MonthValue, SeriesSummary, Source } from "@/lib/category-monthly";
import { formatCAD } from "@/lib/format";
import Link from "next/link";
import { useState } from "react";

export type CategoryInfo = {
  id: string;
  name: string;
  kind: "income" | "expense";
  /** Limite mensal (0 = sem limite). */
  limit: number;
};

const pctOf = (value: number, limit: number) => Math.round((value / limit) * 100);

function SeriesChart({
  points,
  currentYm,
  category,
  active,
  setActive,
}: {
  points: MonthValue[];
  currentYm: string;
  category: CategoryInfo;
  active: number | null;
  setActive: (i: number | null) => void;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const plotW = Math.max(width - PAD.left - PAD.right, 0);
  const plotH = H - PAD.top - PAD.bottom;
  const hasLimit = category.kind === "expense" && category.limit > 0;
  const max = Math.max(1, ...points.map((p) => p.value), hasLimit ? category.limit : 0);
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const colW = plotW / Math.max(points.length, 1);
  const barW = Math.max(4, Math.min(28, colW * 0.5));
  const color = category.kind === "income" ? INCOME : EXPENSE;
  const a = active !== null ? points[active] : undefined;

  return (
    <div ref={ref} className="relative" onPointerLeave={mouseLeave(setActive)}>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label={`${category.name} por mês. Os valores estão na tabela abaixo.`}>
          <Axis ticks={ticks} y={y} plotW={plotW} />
          {points.map((p, i) => {
            const cx = PAD.left + colW * (i + 0.5);
            const dim = active !== null && active !== i;
            const over = hasLimit && p.value > category.limit;
            return (
              <path
                key={p.ym}
                d={barPath(cx - barW / 2, barW, y(0), y(p.value))}
                fill={over ? NEGATIVE : color}
                opacity={dim ? 0.35 : p.ym === currentYm ? 0.55 : 1}
              />
            );
          })}
          {hasLimit && (
            <g>
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(category.limit)}
                y2={y(category.limit)}
                stroke="currentColor"
                strokeOpacity="0.6"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
              <text
                x={PAD.left + plotW}
                y={y(category.limit) - 5}
                textAnchor="end"
                fontSize="11"
                fontWeight="600"
                fill="currentColor"
                opacity="0.7"
              >
                limite {formatCAD(category.limit)}
              </text>
            </g>
          )}
          <MonthLabels months={points} plotW={plotW} currentYm={currentYm} />
          <HitColumns n={points.length} plotW={plotW} setActive={setActive} />
        </svg>
      )}
      {a && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-[170px] rounded-xl bg-plum px-3 py-2.5 text-xs text-white shadow-plum"
          style={{ left: Math.min(Math.max(PAD.left + colW * (active! + 0.5) - 85, 0), Math.max(width - 170, 0)) }}
          role="status"
        >
          <p className="font-semibold">
            {longLabel(a.ym)}
            {a.ym === currentYm && <span className="font-normal text-white/60"> · em andamento</span>}
          </p>
          <p className="money mt-1 text-base font-bold">{formatCAD(a.value)}</p>
          {hasLimit && (
            <p className={a.value > category.limit ? "text-[#ff9db5]" : "text-white/70"}>
              {pctOf(a.value, category.limit)}% do limite
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function CategoryView({
  category,
  points,
  summary,
  sources,
  currentYm,
}: {
  category: CategoryInfo;
  points: MonthValue[];
  summary: SeriesSummary;
  sources: Source[];
  currentYm: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const hasLimit = category.kind === "expense" && category.limit > 0;
  const income = category.kind === "income";
  const current = points.find((p) => p.ym === currentYm);
  const sourcesTotal = sources.reduce((a, s) => a + s.total, 0);
  const closedHint =
    summary.closed > 0 ? `${summary.closed} ${summary.closed === 1 ? "mês fechado" : "meses fechados"}` : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
            income ? "bg-success-soft text-success" : "bg-accent-muted text-accent"
          }`}
        >
          <CategoryIcon name={category.name} className="h-6 w-6" />
        </span>
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">{category.name}</h2>
          <p className="text-xs text-foreground/55">
            {income ? "Entradas" : "Gastos"} por mês
            {hasLimit && `, limite de ${formatCAD(category.limit)}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Média por mês"
          value={summary.average === null ? "—" : formatCAD(summary.average)}
          hint={
            hasLimit && summary.average !== null
              ? `${pctOf(summary.average, category.limit)}% do limite`
              : closedHint
          }
          tone={hasLimit && summary.average !== null && summary.average > category.limit ? "bad" : undefined}
        />
        <Stat label="Total no período" value={summary.closed > 0 ? formatCAD(summary.total) : "—"} hint={closedHint} />
        <Stat
          label="Maior mês"
          value={summary.max ? formatCAD(summary.max.value) : "—"}
          hint={summary.max ? longLabel(summary.max.ym) : undefined}
        />
        <Stat
          label="Menor mês"
          value={summary.min ? formatCAD(summary.min.value) : "—"}
          hint={summary.min ? longLabel(summary.min.ym) : undefined}
        />
      </div>

      <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-lg font-bold tracking-tight">Mês a mês</h3>
          {current && (
            <p className="text-xs text-foreground/55">
              {longLabel(currentYm)} em andamento: {formatCAD(current.value)} até agora
            </p>
          )}
        </div>
        <div className="mt-4">
          <SeriesChart points={points} currentYm={currentYm} category={category} active={active} setActive={setActive} />
        </div>
      </section>

      {sources.length > 0 && (
        <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
          <h3 className="font-display text-lg font-bold tracking-tight">{income ? "De onde veio" : "Para onde foi"}</h3>
          <p className="mt-0.5 text-xs text-foreground/55">No período escolhido, somando todos os meses.</p>
          <ul className="mt-4 space-y-3.5">
            {sources.map((s) => (
              <li key={s.label}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-semibold">{s.label}</span>
                  <span className="money shrink-0 font-semibold">{formatCAD(s.total)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${sourcesTotal > 0 ? (s.total / sourcesTotal) * 100 : 0}%`,
                      backgroundColor: income ? INCOME : EXPENSE,
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-foreground/50">
                  {s.count} {s.count === 1 ? "lançamento" : "lançamentos"}
                  {sourcesTotal > 0 && `, ${Math.round((s.total / sourcesTotal) * 100)}%`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
        <h3 className="font-display text-lg font-bold tracking-tight">Tabela</h3>
        <div className="-mx-2 mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-foreground/55">
                <th className="px-2 py-2 font-medium">Mês</th>
                <th className="px-2 py-2 text-right font-medium">{income ? "Entrou" : "Gastou"}</th>
                {hasLimit && <th className="px-2 py-2 text-right font-medium">Do limite</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...points].reverse().map((p) => {
                const over = hasLimit && p.value > category.limit;
                return (
                  <tr key={p.ym} className="hover:bg-background">
                    <td className="px-2 py-2.5">
                      <Link
                        href={`/transactions?category_id=${category.id}&from=${p.ym}-01&to=${p.ym}-${new Date(
                          Date.UTC(Number(p.ym.slice(0, 4)), Number(p.ym.slice(5, 7)), 0),
                        ).getUTCDate()}`}
                        className="font-semibold hover:text-accent"
                      >
                        <span className="sm:hidden">
                          {shortLabel(p.ym)} {p.ym.slice(2, 4)}
                        </span>
                        <span className="hidden sm:inline">{longLabel(p.ym)}</span>
                      </Link>
                      {p.ym === currentYm && <span className="ml-1.5 text-xs text-foreground/45">em andamento</span>}
                    </td>
                    <td className="money px-2 py-2.5 text-right font-semibold">{formatCAD(p.value)}</td>
                    {hasLimit && (
                      <td className={`money px-2 py-2.5 text-right ${over ? "font-semibold text-danger" : "text-foreground/65"}`}>
                        {pctOf(p.value, category.limit)}%
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-foreground/45">Toque no mês para ver os lançamentos no extrato.</p>
      </section>
    </div>
  );
}
