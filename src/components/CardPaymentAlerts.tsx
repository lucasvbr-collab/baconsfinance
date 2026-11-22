"use client";

import { Icon } from "@/components/Icon";
import { dismissCardPayment } from "@/lib/actions";
import type { CardPaymentRow } from "@/lib/card-payment-match";
import { formatCAD } from "@/lib/format";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "2-digit",
    timeZone: "America/Toronto",
  });
}

/** Uma faixa por pagamento de cartão que ainda não tem a fatura importada. */
export function CardPaymentAlerts({ payments }: { payments: CardPaymentRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (payments.length === 0) return null;

  return (
    <section aria-label="Pagamentos de cartão sem fatura" className="space-y-2">
      {payments.map((p) => (
        <div
          key={p.id}
          className="flex flex-col gap-3 rounded-3xl bg-warn-soft px-5 py-4 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            Pagamento do cartão de{" "}
            <span className="money font-semibold">{formatCAD(p.amount)}</span> em{" "}
            {shortDate(p.date)} ainda sem fatura.
          </p>
          <div className="flex shrink-0 gap-2">
            <Link
              href="/transactions/import"
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-on-accent"
            >
              <Icon name="upload" className="h-4 w-4" />
              Importar fatura
            </Link>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setErr(null);
                start(async () => {
                  const r = await dismissCardPayment(p.id);
                  if ("error" in r) setErr(r.error);
                  else router.refresh();
                });
              }}
              className="rounded-xl border border-foreground/15 px-3 py-2 text-xs font-semibold text-foreground/70 hover:border-foreground/30 disabled:opacity-50"
            >
              Dispensar
            </button>
          </div>
        </div>
      ))}
      {err && (
        <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p>
      )}
    </section>
  );
}
