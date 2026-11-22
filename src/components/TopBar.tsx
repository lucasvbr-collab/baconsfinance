"use client";

import { isActive, primary, secondary, type NavLink } from "@/components/AppNav";
import { Wordmark } from "@/components/BrandMark";
import { Icon } from "@/components/Icon";
import { PigAvatar } from "@/components/PigAvatar";
import { signOut } from "@/lib/actions";
import type { AvatarConfig } from "@/lib/avatar";
import type { HeaderNotification } from "@/lib/header-data";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const SEEN_KEY = "bf:seen-alerts";

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function writeSeen(keys: string[]) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(keys));
  } catch {
    // Sem armazenamento (modo privado): o ponto vermelho só volta a aparecer.
  }
}

type Panel = "none" | "bell" | "avatar" | "search";

export function TopBar({
  avatar,
  hasAvatar,
  notifications,
}: {
  avatar: AvatarConfig;
  hasAvatar: boolean;
  notifications: HeaderNotification[];
}) {
  const path = usePathname() ?? "";
  const [drawer, setDrawer] = useState(false);
  const [panel, setPanel] = useState<Panel>("none");
  const [unseen, setUnseen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const seen = readSeen();
    setUnseen(notifications.some((n) => !seen.has(n.key)));
  }, [notifications]);

  // Fecha tudo ao trocar de página.
  useEffect(() => {
    setDrawer(false);
    setPanel("none");
  }, [path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanel("none");
        setDrawer(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setPanel("none");
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  function toggle(p: Panel) {
    setPanel((cur) => (cur === p ? "none" : p));
    if (p === "bell") {
      writeSeen(notifications.map((n) => n.key));
      setUnseen(false);
    }
  }

  const iconBtn = "relative rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white";

  return (
    <>
      <div
        ref={barRef}
        className="sticky top-0 z-30 bg-plum pt-[env(safe-area-inset-top)]"
      >
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:px-6 lg:px-10 lg:py-4">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setDrawer(true)}
            className={`${iconBtn} lg:hidden`}
          >
            <Icon name="menu" />
          </button>
          <Link href="/dashboard" aria-label="Bacon's Finance, ir para o painel" className="lg:hidden">
            <Wordmark size="sm" />
          </Link>

          <form action="/transactions" method="get" role="search" className="hidden flex-1 lg:block">
            <label className="flex max-w-md items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-white focus-within:bg-white focus-within:text-foreground">
              <Icon name="search" className="h-4 w-4 opacity-60" />
              <span className="sr-only">Buscar no extrato</span>
              <input
                name="q"
                placeholder="Buscar no extrato"
                className="w-full bg-transparent text-sm outline-none placeholder:text-current placeholder:opacity-60"
              />
            </label>
          </form>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              aria-label="Buscar no extrato"
              aria-expanded={panel === "search"}
              onClick={() => toggle("search")}
              className={`${iconBtn} lg:hidden`}
            >
              <Icon name="search" />
            </button>

            <div className="relative">
              <button
                type="button"
                aria-label={unseen ? "Avisos (há avisos novos)" : "Avisos"}
                aria-expanded={panel === "bell"}
                onClick={() => toggle("bell")}
                className={iconBtn}
              >
                <Icon name="bell" />
                {unseen && (
                  <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-plum" />
                )}
              </button>
              {panel === "bell" && <BellPanel notifications={notifications} />}
            </div>

            <div className="relative">
              <button
                type="button"
                aria-label="Menu da conta"
                aria-expanded={panel === "avatar"}
                onClick={() => toggle("avatar")}
                className="ml-1 rounded-full ring-2 ring-white/20"
              >
                <PigAvatar config={avatar} className="h-9 w-9" />
              </button>
              {panel === "avatar" && <AvatarPanel hasAvatar={hasAvatar} />}
            </div>
          </div>
        </div>

        {panel === "search" && (
          <form action="/transactions" method="get" role="search" className="px-3 pb-3 lg:hidden">
            <label className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5">
              <Icon name="search" className="h-4 w-4 text-foreground/45" />
              <span className="sr-only">Buscar no extrato</span>
              <input
                name="q"
                autoFocus
                placeholder="Buscar no extrato"
                className="w-full bg-transparent text-sm outline-none"
              />
            </label>
          </form>
        )}
      </div>

      {drawer && <Drawer path={path} onClose={() => setDrawer(false)} />}
    </>
  );
}

function BellPanel({ notifications }: { notifications: HeaderNotification[] }) {
  return (
    <div className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl bg-card text-foreground shadow-plum">
      <p className="border-b border-border px-5 py-3 font-display text-base font-bold">Avisos</p>
      {notifications.length === 0 ? (
        <div className="px-5 py-6 text-sm text-foreground/65">
          <p>Nenhum aviso agora.</p>
          <p className="mt-1">
            O sino avisa quando uma categoria chega a 100% do limite ou estoura.{" "}
            <Link href="/categories" className="font-semibold text-accent hover:underline">
              Definir limites
            </Link>
          </p>
        </div>
      ) : (
        <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
          {notifications.map((n) => (
            <li key={n.key}>
              <Link href={n.href} className="flex gap-3 px-5 py-3.5 hover:bg-background">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.tone === "danger" ? "bg-danger" : "bg-warn"}`}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{n.title}</span>
                  <span className="money mt-0.5 block text-xs text-foreground/60">{n.detail}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AvatarPanel({ hasAvatar }: { hasAvatar: boolean }) {
  const item = "flex w-full items-center gap-3 px-5 py-3 text-sm font-semibold hover:bg-background";
  return (
    <div className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-3xl bg-card py-1 text-foreground shadow-plum">
      <Link href="/settings/avatar" className={item}>
        <Icon name="users" className="h-5 w-5 text-foreground/50" />
        {hasAvatar ? "Editar avatar" : "Criar meu avatar"}
      </Link>
      <Link href="/settings" className={item}>
        <Icon name="settings" className="h-5 w-5 text-foreground/50" />
        Configurações
      </Link>
      <form action={signOut} className="border-t border-border">
        <button type="submit" className={`${item} text-danger`}>
          <Icon name="logout" className="h-5 w-5" />
          Sair
        </button>
      </form>
    </div>
  );
}

function Drawer({ path, onClose }: { path: string; onClose: () => void }) {
  const links: NavLink[] = [...primary, ...secondary];
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={onClose}
        className="absolute inset-0 bg-plum/50 backdrop-blur-sm"
      />
      <nav className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col bg-plum px-4 pb-6 pt-[calc(env(safe-area-inset-top)+1rem)] text-white shadow-plum">
        <div className="flex items-center justify-between px-1">
          <Wordmark size="sm" />
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={onClose}
            className="rounded-full p-2 text-white/70 hover:bg-white/10"
          >
            <Icon name="close" />
          </button>
        </div>
        <Link
          href="/transactions/new"
          className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-lime px-4 py-3 text-sm font-bold text-plum"
        >
          <Icon name="plus" className="h-4 w-4" />
          Nova transação
        </Link>
        <ul className="mt-6 flex flex-col gap-1">
          {links.map((l) => {
            const active = isActive(l.href, path);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${
                    active ? "bg-white/10 text-white" : "text-white/70"
                  }`}
                >
                  <Icon name={l.icon} className={`h-5 w-5 ${active ? "text-lime" : ""}`} />
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
