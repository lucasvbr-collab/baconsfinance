"use client";

import { addSavingsBalance, deleteSavingsBalance } from "@/lib/actions";
import { formatCAD } from "@/lib/format";
import type { SavingsSummary } from "@/lib/savings";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

function dayLabel(isoDay: string): string {
  const [y, m, d] = isoDay.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Delta({ value, label }: { value: number; label: string }) {
  const cents = Math.round(value * 100);
  const sign = cents > 0 ? "+" : cents < 0 ? "−" : "";
  const color = cents > 0 ? "text-success" : cents < 0 ? "text-danger" : "text-foreground/60";
  return (
    <span>
      <span className={`money font-semibold ${color}`}>
        {sign}
        {formatCAD(Math.abs(value))}
      </span>{" "}
      <span className="text-foreground/55">{label}</span>
    </span>
  );
}

/** Saldo guardado na savings, atualizado à mão. */
export function SavingsCard({ summary, today }: { summary: SavingsSummary | null; today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("");
  const [asOf, setAsOf] = useState(today);
  const [err, setErr] = useState<string | null>(null);

  const openForm = () => {
    setErr(null);
    setAmount("");
    setAsOf(today);
    setEditing(true);
  };

  const save = () => {
    setErr(null);
    start(async () => {
      const r = await addSavingsBalance(amount, asOf);
      if ("error" in r) setErr(r.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  };

  const removeLatest = () => {
    if (!summary) return;
    if (!window.confirm(`Apagar a atualização de ${formatCAD(summary.latest.amount)} (${dayLabel(summary.latest.asOf)})?`))
      return;
    setErr(null);
    start(async () => {
      const r = await deleteSavingsBalance(summary.latest.id);
      if ("error" in r) setErr(r.error);
      else router.refresh();
    });
  };

  return (
    <section aria-label="Guardado na savings" className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold tracking-tight">Guardado na savings</h2>
          {summary ? (
            <>
              <p className="money mt-2 break-words font-display text-4xl font-bold leading-none tracking-tight">
                {formatCAD(summary.latest.amount)}
              </p>
              <p className="mt-2 text-xs text-foreground/55">Atualizado em {dayLabel(summary.latest.asOf)}</p>
              {(summary.sinceLast !== null || summary.sinceYearStart !== null) && (
                <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  {summary.sinceLast !== null && <Delta value={summary.sinceLast} label="desde a anterior" />}
                  {summary.sinceYearStart !== null && <Delta value={summary.sinceYearStart} label="no ano" />}
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-foreground/65">
              Informe o saldo da sua savings para acompanhar quanto tem guardado.
            </p>
          )}
        </div>

        {!editing && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={openForm}
              disabled={pending}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition hover:brightness-110 disabled:opacity-50"
            >
              {summary ? "Atualizar saldo" : "Informar saldo"}
            </button>
            {summary && (
              <button
                type="button"
                onClick={removeLatest}
                disabled={pending}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground/70 hover:border-foreground/30 disabled:opacity-50"
              >
                Apagar última
              </button>
            )}
          </div>
        )}
      </div>

      {editing && (
        <form
          className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
          onSubmit={(ev) => {
            ev.preventDefault();
            save();
          }}
        >
          <label className="block text-sm">
            <span className="font-medium">Saldo (CAD)</span>
            <input
              inputMode="decimal"
              autoFocus
              required
              value={amount}
              onChange={(ev) => setAmount(ev.target.value)}
              placeholder="12,450.00"
              className="money mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Data</span>
            <input
              type="date"
              required
              max={today}
              value={asOf}
              onChange={(ev) => setAsOf(ev.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-50 sm:flex-none"
            >
              {pending ? "Salvando…" : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={pending}
              className="flex-1 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground/70 sm:flex-none"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {err && <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p>}
    </section>
  );
}
