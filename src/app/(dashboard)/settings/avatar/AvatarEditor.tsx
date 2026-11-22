"use client";

import { PigAvatar } from "@/components/PigAvatar";
import { saveAvatar } from "@/lib/actions";
import {
  AVATAR_OPTIONS,
  defaultAvatar,
  type AvatarConfig,
  type AvatarStyle,
} from "@/lib/avatar";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Field = "color" | "accessory" | "background";

const SECTIONS: { field: Field; label: string }[] = [
  { field: "color", label: "Cor" },
  { field: "accessory", label: "Acessório" },
  { field: "background", label: "Fundo" },
];

export function AvatarEditor({ initial }: { initial: AvatarConfig }) {
  const router = useRouter();
  const [config, setConfig] = useState<AvatarConfig>(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function setStyle(style: AvatarStyle) {
    // Trocar o estilo traz o acessório típico dele, mantendo cor e fundo.
    setConfig((c) => ({ ...c, style, accessory: defaultAvatar(style).accessory }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-plum px-6 py-8 shadow-plum">
        <PigAvatar config={config} className="h-36 w-36" title="Prévia do seu avatar" />
        <div className="flex rounded-full bg-white/10 p-1" role="radiogroup" aria-label="Estilo">
          {AVATAR_OPTIONS.style.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={config.style === s.id}
              onClick={() => setStyle(s.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                config.style === s.id ? "bg-lime text-plum" : "text-white/75 hover:text-white"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {SECTIONS.map(({ field, label }) => (
        <fieldset key={field} className="rounded-3xl bg-card p-5 shadow-card">
          <legend className="sr-only">{label}</legend>
          <p aria-hidden className="font-display text-lg font-bold tracking-tight">
            {label}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {AVATAR_OPTIONS[field].map((opt) => {
              const preview = { ...config, [field]: opt.id } as AvatarConfig;
              const active = config[field] === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setConfig(preview)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-2 text-xs font-semibold transition ${
                    active
                      ? "border-accent bg-accent-muted text-accent"
                      : "border-transparent text-foreground/65 hover:bg-background"
                  }`}
                >
                  <PigAvatar config={preview} className="h-12 w-12" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {msg && (
        <p
          className={`rounded-xl px-3 py-2 text-sm ${msg.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}
        >
          {msg.text}
        </p>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          start(async () => {
            const r = await saveAvatar(config);
            if ("error" in r) setMsg({ ok: false, text: r.error });
            else {
              setMsg({ ok: true, text: "Avatar salvo." });
              router.refresh();
            }
          });
        }}
        className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-on-accent disabled:opacity-50"
      >
        {pending ? "Salvando…" : "Salvar avatar"}
      </button>
    </div>
  );
}
