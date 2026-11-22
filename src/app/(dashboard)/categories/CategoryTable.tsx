"use client";

import {
  createCategory,
  deleteCategory,
  updateCategoryBudget,
  updateCategoryKind,
} from "@/lib/actions";
import { formatCAD } from "@/lib/format";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type CategoryRow = {
  id: string;
  name: string;
  monthly_limit: number;
  target_percent: number;
  kind: "income" | "expense";
};

const field =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";

export function CategoryTable({ initial }: { initial: CategoryRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [limits, setLimits] = useState<Record<string, string>>(
    Object.fromEntries(initial.map((c) => [c.id, String(c.monthly_limit)])),
  );
  const [percents, setPercents] = useState<Record<string, string>>(
    Object.fromEntries(initial.map((c) => [c.id, String(c.target_percent)])),
  );

  async function onSaveBudget(id: string) {
    setMsg(null);
    const monthly_limit =
      Number.parseFloat((limits[id] ?? "0").replace(",", ".")) || 0;
    const target_percent =
      Number.parseFloat((percents[id] ?? "0").replace(",", ".")) || 0;
    start(async () => {
      const r = await updateCategoryBudget(id, monthly_limit, target_percent);
      if (r && "error" in r && r.error) setMsg(r.error);
      else router.refresh();
    });
  }

  function onKindChange(id: string, kind: "income" | "expense") {
    setMsg(null);
    start(async () => {
      const r = await updateCategoryKind(id, kind);
      if (r && "error" in r && r.error) setMsg(r.error);
      else router.refresh();
    });
  }

  async function onDelete(id: string) {
    if (!window.confirm("Excluir esta categoria?")) return;
    setMsg(null);
    start(async () => {
      const r = await deleteCategory(id);
      if (r && "error" in r && r.error) setMsg(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {msg && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {msg}
        </p>
      )}

      <form
        action={async (fd) => {
          setMsg(null);
          start(async () => {
            const r = await createCategory(fd);
            if (r && "error" in r && r.error) setMsg(r.error);
            else router.refresh();
          });
        }}
        className="grid grid-cols-2 gap-3 rounded-3xl bg-card p-5 shadow-card sm:flex sm:flex-wrap sm:items-end"
      >
        <div className="col-span-2 sm:min-w-[160px] sm:flex-1">
          <label htmlFor="new-cat-name" className="mb-1 block text-xs font-medium text-foreground/60">
            Nova categoria
          </label>
          <input
            id="new-cat-name"
            name="name"
            required
            placeholder="Ex.: Mercado"
            className={field}
          />
        </div>
        <div className="sm:w-32">
          <label htmlFor="new-cat-kind" className="mb-1 block text-xs font-medium text-foreground/60">
            Tipo
          </label>
          <select id="new-cat-kind" name="kind" defaultValue="expense" className={field}>
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </select>
        </div>
        <div className="sm:w-36">
          <label htmlFor="new-cat-limit" className="mb-1 block text-xs font-medium text-foreground/60">
            Limite mensal ($)
          </label>
          <input
            id="new-cat-limit"
            name="monthly_limit"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            defaultValue={0}
            className={field}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="col-span-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>

      {initial.length === 0 ? (
        <p className="rounded-3xl bg-card p-8 text-center text-sm text-foreground/55 shadow-card">
          Nenhuma categoria. Adicione a primeira acima.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {initial.map((c) => (
            <li key={c.id} className="rounded-3xl bg-card p-5 shadow-card">
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate font-display text-lg font-bold tracking-tight">
                  {c.name}
                </p>
                <label className="sr-only" htmlFor={`kind-${c.id}`}>
                  Tipo de {c.name}
                </label>
                <select
                  id={`kind-${c.id}`}
                  value={c.kind}
                  disabled={pending}
                  onChange={(e) =>
                    onKindChange(c.id, e.target.value === "income" ? "income" : "expense")
                  }
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold"
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
                <button
                  type="button"
                  aria-label={`Excluir ${c.name}`}
                  disabled={pending}
                  onClick={() => void onDelete(c.id)}
                  className="rounded-full p-2 text-danger hover:bg-danger-soft"
                >
                  <TrashIcon />
                </button>
              </div>

              {c.kind === "expense" && (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={`limit-${c.id}`} className="mb-1 block text-xs font-medium text-foreground/60">
                        Limite mensal ($)
                      </label>
                      <input
                        id={`limit-${c.id}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={limits[c.id] ?? ""}
                        onChange={(e) => setLimits((m) => ({ ...m, [c.id]: e.target.value }))}
                        className={field}
                      />
                    </div>
                    <div>
                      <label htmlFor={`pct-${c.id}`} className="mb-1 block text-xs font-medium text-foreground/60">
                        Meta (% das saídas)
                      </label>
                      <input
                        id={`pct-${c.id}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        step="0.1"
                        value={percents[c.id] ?? ""}
                        onChange={(e) => setPercents((m) => ({ ...m, [c.id]: e.target.value }))}
                        className={field}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-foreground/50">
                      {c.monthly_limit > 0
                        ? `Limite atual: ${formatCAD(c.monthly_limit)}`
                        : "Sem limite: o sino não avisa esta categoria."}
                    </p>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void onSaveBudget(c.id)}
                      className="shrink-0 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      Salvar
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}
