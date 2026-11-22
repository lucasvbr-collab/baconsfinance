"use client";

import { createTransaction } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function NewTransactionForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [type, setType] = useState<"expense" | "income">("expense");

  return (
    <form
      className="space-y-4 rounded-3xl bg-card p-6 shadow-card"
      action={(fd) => {
        fd.set("type", type);
        setErr(null);
        start(async () => {
          const r = await createTransaction(fd);
          if (r && "error" in r && r.error) setErr(r.error);
          else if (r && "ok" in r && r.ok) router.push("/transactions");
        });
      }}
    >
      {err && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {err}
        </p>
      )}

      <div>
        <label className="mb-1 block text-xs text-foreground/60">Tipo</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              type === "expense"
                ? "border-accent bg-accent text-on-accent"
                : "border-border"
            }`}
          >
            Saída
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              type === "income"
                ? "border-success bg-success-soft text-success"
                : "border-border"
            }`}
          >
            Entrada
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-foreground/60">
          Descrição
        </label>
        <input
          name="description"
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-foreground/60">Valor (CAD)</label>
        <input
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-foreground/60">Data</label>
        <input
          name="date"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-foreground/60">Categoria</label>
        <select
          name="category_id"
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Selecione…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {categories.length === 0 && (
        <p className="text-sm text-warn">
          Cadastre categorias antes de lançar transações.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || categories.length === 0}
        className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-on-accent disabled:opacity-50"
      >
        Salvar transação
      </button>
    </form>
  );
}
