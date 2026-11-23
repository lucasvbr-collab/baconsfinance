"use client";

import { deletePushSubscription, savePushSubscription, sendTestPush } from "@/lib/actions";
import { vapidPublicKeyBytes } from "@/lib/vapid";
import { useEffect, useState, useTransition } from "react";

type Status = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on" | "no-keys" | "bad-key";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_KEY_BYTES = vapidPublicKeyBytes(VAPID_PUBLIC_KEY);

function isIos(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Liga/desliga as notificações no celular (avisos de limite e lembrete de domingo). */
export function PushSettings() {
  const [status, setStatus] = useState<Status>("loading");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      if (!VAPID_PUBLIC_KEY.trim()) return setStatus("no-keys");
      if (!VAPID_KEY_BYTES) return setStatus("bad-key");
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) return setStatus(isIos() && !isStandalone() ? "ios-install" : "unsupported");
      if (Notification.permission === "denied") return setStatus("denied");
      setStatus((await currentSubscription()) ? "on" : "off");
    })().catch(() => setStatus("unsupported"));
  }, []);

  const enable = () =>
    start(async () => {
      setMsg(null);
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "off");
          return;
        }
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: VAPID_KEY_BYTES!,
          }));
        const json = sub.toJSON();
        const r = await savePushSubscription(
          { endpoint: json.endpoint ?? sub.endpoint, keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" } },
          navigator.userAgent,
        );
        if ("error" in r) {
          setMsg({ ok: false, text: r.error });
          return;
        }
        setStatus("on");
        setMsg({ ok: true, text: "Notificações ligadas neste celular." });
      } catch (e) {
        setMsg({ ok: false, text: e instanceof Error ? e.message : "Não foi possível ativar." });
      }
    });

  const disable = () =>
    start(async () => {
      setMsg(null);
      const sub = await currentSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
      setMsg({ ok: true, text: "Notificações desligadas neste celular." });
    });

  const test = () =>
    start(async () => {
      setMsg(null);
      const r = await sendTestPush();
      setMsg(
        "error" in r
          ? { ok: false, text: r.error }
          : { ok: true, text: `Teste enviado para ${r.sent} ${r.sent === 1 ? "aparelho" : "aparelhos"}.` },
      );
    });

  const button =
    "rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50";

  return (
    <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
      <h2 className="font-display text-lg font-semibold tracking-tight">Notificações no celular</h2>
      <p className="mt-1 text-sm text-foreground/60">
        Avisa quando uma categoria chega a 80%, 90% e 100% do limite do mês, e todo domingo lembra de
        subir os gastos da semana (repete todo dia até alguém importar o extrato).
      </p>

      <div className="mt-4">
        {status === "loading" && <p className="text-sm text-foreground/50">Verificando este aparelho…</p>}

        {status === "no-keys" && (
          <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
            As chaves de notificação não estão configuradas no servidor.
          </p>
        )}

        {status === "bad-key" && (
          <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
            A chave pública de notificação do servidor está com formato errado. Na Vercel, confira o valor
            de <strong>NEXT_PUBLIC_VAPID_PUBLIC_KEY</strong>: só a chave (87 caracteres), sem aspas nem o
            nome da variável. Depois faça um novo deploy.
          </p>
        )}

        {status === "ios-install" && (
          <p className="rounded-xl bg-accent-muted px-3 py-2.5 text-sm text-foreground/80">
            No iPhone, as notificações só funcionam com o app na tela de início: toque em{" "}
            <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>. Abra o
            app por lá e volte aqui.
          </p>
        )}

        {status === "unsupported" && (
          <p className="text-sm text-foreground/60">Este navegador não aceita notificações.</p>
        )}

        {status === "denied" && (
          <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            As notificações estão bloqueadas para este app. Libere nos ajustes do celular (Notificações →
            Bacon&apos;s Finance) e volte aqui.
          </p>
        )}

        {status === "off" && (
          <button type="button" onClick={enable} disabled={pending} className={`${button} bg-accent text-on-accent`}>
            {pending ? "Ativando…" : "Ativar notificações neste celular"}
          </button>
        )}

        {status === "on" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-semibold text-success">Ligadas neste celular</span>
            <button type="button" onClick={test} disabled={pending} className={`${button} bg-accent text-on-accent`}>
              Enviar teste
            </button>
            <button
              type="button"
              onClick={disable}
              disabled={pending}
              className={`${button} border border-border text-foreground/70 hover:border-foreground/30`}
            >
              Desligar
            </button>
          </div>
        )}
      </div>

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
