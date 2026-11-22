"use client";

import { importRbcCsvAction } from "./actions";
import { importCardStatementAction } from "./card-actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function CsvImportForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      className="space-y-4 rounded-3xl bg-card p-6 shadow-card"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setMsg(null);
        setErr(null);
        const file = fd.get("file");
        const isPdf = file instanceof File && file.name.toLowerCase().endsWith(".pdf");
        start(async () => {
          if (isPdf) {
            const r = await importCardStatementAction(fd);
            if ("error" in r) {
              setErr(r.error);
              return;
            }
            setMsg(
              `Fatura de ${r.period} importada: ${r.inserted} ${r.inserted === 1 ? "compra" : "compras"} (${r.pendingReview} para revisar).`,
            );
            router.refresh();
            return;
          }
          const r = await importRbcCsvAction(fd);
          if (r && "error" in r && r.error) {
            setErr(r.error);
            return;
          }
          if (r && "ok" in r && r.ok) {
            const cards =
              r.cardPayments > 0
                ? ` ${r.cardPayments} ${r.cardPayments === 1 ? "pagamento de cartão encontrado" : "pagamentos de cartão encontrados"}. Importe a fatura para separar as compras.`
                : "";
            setMsg(
              `Importadas ${r.inserted} (${r.skipped} duplicadas ignoradas, ${r.pendingReview} para revisão, ${r.excluded} fora dos totais).${cards}`,
            );
            router.refresh();
          }
        });
      }}
    >
      <div>
        <label className="mb-1.5 block text-xs font-medium text-foreground/55">
          CSV do extrato da conta ou PDF da fatura do cartão
        </label>
        <input
          type="file"
          name="file"
          accept=".csv,text/csv,.pdf,application/pdf"
          required
          className="block w-full text-sm text-foreground/80 file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-on-accent"
        />
      </div>
      {err && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {err}
        </p>
      )}
      {msg && (
        <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
          {msg}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent disabled:opacity-50"
      >
        {pending ? "Importando…" : "Importar"}
      </button>
    </form>
  );
}
