"use client";

import { addTransferName, deleteTransferName } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type TransferNameRow = { id: string; name: string };

/** Nomes de quem é do lar: e-transfers com essas pessoas não contam nos totais. */
export function TransferNames({ names }: { names: TransferNameRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const add = () => {
    setMsg(null);
    start(async () => {
      const r = await addTransferName(value);
      if ("error" in r) setMsg({ ok: false, text: r.error });
      else {
        setValue("");
        setMsg({
          ok: true,
          text:
            r.updated === 0
              ? "Nome adicionado."
              : `Nome adicionado. ${r.updated} ${r.updated === 1 ? "lançamento saiu" : "lançamentos saíram"} dos totais.`,
        });
        router.refresh();
      }
    });
  };

  const remove = (row: TransferNameRow) => {
    setMsg(null);
    start(async () => {
      const r = await deleteTransferName(row.id);
      if ("error" in r) setMsg({ ok: false, text: r.error });
      else router.refresh();
    });
  };

  return (
    <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
      <h2 className="font-display text-lg font-semibold tracking-tight">Transferências entre vocês</h2>
      <p className="mt-1 text-sm text-foreground/60">
        E-transfers enviados ou recebidos com estes nomes não contam como entrada nem como gasto. É
        dinheiro passando de uma conta da casa para outra.
      </p>

      {names.length > 0 && (
        <ul className="mt-4 divide-y divide-border rounded-2xl border border-border">
          {names.map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0 truncate text-sm font-semibold">{n.name}</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(n)}
                className="shrink-0 text-xs font-semibold text-foreground/55 hover:text-danger disabled:opacity-50"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-4 flex gap-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          add();
        }}
      >
        <label className="sr-only" htmlFor="transfer-name">
          Nome como aparece no extrato
        </label>
        <input
          id="transfer-name"
          value={value}
          onChange={(ev) => setValue(ev.target.value)}
          placeholder="Nome como aparece no extrato"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={pending || value.trim().length === 0}
          className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>

      {msg && (
        <p
          className={`mt-3 rounded-xl px-3 py-2 text-sm ${msg.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}
