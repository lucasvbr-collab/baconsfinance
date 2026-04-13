"use client";

import { createCategory, deleteCategory, updateCategoryLimit } from "@/lib/actions";
import { formatBRL } from "@/lib/format";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type CategoryRow = {
  id: string;
  name: string;
  monthly_limit: number;
};

export function CategoryTable({ initial }: { initial: CategoryRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [limits, setLimits] = useState<Record<string, string>>(
    Object.fromEntries(
      initial.map((c) => [c.id, String(c.monthly_limit)]),
    ),
  );

  async function onSaveLimit(id: string) {
    setMsg(null);
    const raw = limits[id] ?? "0";
    const monthly_limit =
      Number.parseFloat(raw.replace(",", ".")) || 0;
    start(async () => {
      const r = await updateCategoryLimit(id, monthly_limit);
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
        <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-100">
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
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs text-foreground/60">
            Nova categoria
          </label>
          <input
            name="name"
            required
            placeholder="Ex.: Mercado"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="w-36">
          <label className="mb-1 block text-xs text-foreground/60">
            Limite mensal (R$)
          </label>
          <input
            name="monthly_limit"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-card text-xs uppercase text-foreground/55">
            <tr>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Limite mensal</th>
              <th className="px-4 py-3 w-28" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {initial.map((c) => (
              <tr key={c.id} className="bg-background/40">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={limits[c.id] ?? ""}
                      onChange={(e) =>
                        setLimits((m) => ({ ...m, [c.id]: e.target.value }))
                      }
                      className="w-32 rounded-lg border border-border bg-background px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void onSaveLimit(c.id)}
                      className="rounded-lg border border-border px-2 py-1 text-xs hover:border-accent"
                    >
                      Salvar limite
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-foreground/45">
                    Atual: {formatBRL(Number(c.monthly_limit))}
                  </p>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    title="Excluir categoria"
                    disabled={pending}
                    onClick={() => void onDelete(c.id)}
                    className="rounded-lg p-2 text-red-300 hover:bg-red-950/40"
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {initial.length === 0 && (
          <p className="p-8 text-center text-sm text-foreground/55">
            Nenhuma categoria. Adicione a primeira acima.
          </p>
        )}
      </div>
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
