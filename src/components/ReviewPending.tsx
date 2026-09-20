"use client";

import { approvePendingTransactions } from "@/lib/actions";
import { formatCAD } from "@/lib/format";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type PendingRow = {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  categoryName: string | null;
};

export function ReviewPending({ rows }: { rows: PendingRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  if (rows.length === 0) return null;

  return (
    <section className="space-y-4 rounded-2xl border border-amber-500/40 bg-amber-950/20 p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Revisar categorização
          </h2>
          <p className="mt-1 text-sm text-foreground/65">
            {rows.length} transação(ões) sugeridas pela IA — aprove ou corrija a
            categoria.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setMsg(null);
            start(async () => {
              const r = await approvePendingTransactions();
              if (r && "error" in r && r.error) setMsg(r.error);
              else router.refresh();
            });
          }}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          Aprovar todas
        </button>
      </div>
      {msg && (
        <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-100">
          {msg}
        </p>
      )}
      <ul className="divide-y divide-border/60">
        {rows.slice(0, 12).map((t) => {
          const sign = t.type === "income" ? "+" : "−";
          return (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/transactions/${t.id}`}
                  className="font-medium hover:text-accent"
                >
                  {t.description || "Sem descrição"}
                </Link>
                <p className="text-xs text-foreground/55">
                  {t.categoryName ?? "—"} ·{" "}
                  {new Date(t.date).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`tabular-nums font-semibold ${
                    t.type === "income" ? "text-success" : "text-danger"
                  }`}
                >
                  {sign} {formatCAD(t.amount)}
                </span>
                <Link
                  href={`/transactions/${t.id}`}
                  className="text-xs text-accent hover:underline"
                >
                  Corrigir
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      {rows.length > 12 && (
        <p className="text-xs text-foreground/55">
          +{rows.length - 12} outras. Filtre o extrato ou aprove todas.
        </p>
      )}
    </section>
  );
}
