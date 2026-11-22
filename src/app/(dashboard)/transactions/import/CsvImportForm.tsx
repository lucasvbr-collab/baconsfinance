"use client";

import { importRbcCsvAction } from "./actions";
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
        start(async () => {
          const r = await importRbcCsvAction(fd);
          if (r && "error" in r && r.error) {
            setErr(r.error);
            return;
          }
          if (r && "ok" in r && r.ok) {
            setMsg(
              `Importadas ${r.inserted} (${r.skipped} duplicadas ignoradas, ${r.pendingReview} para revisão, ${r.excluded} fora dos totais).`,
            );
            router.refresh();
          }
        });
      }}
    >
      <div>
        <label className="mb-1.5 block text-xs font-medium text-foreground/55">
          Ficheiro CSV do RBC
        </label>
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
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
        {pending ? "A importar…" : "Importar"}
      </button>
    </form>
  );
}
