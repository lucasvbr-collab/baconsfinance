"use client";

import { Wordmark } from "@/components/BrandMark";
import { Icon, type IconName } from "@/components/Icon";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string; short: string; icon: IconName };

export const primary: NavLink[] = [
  { href: "/dashboard", label: "Painel", short: "Painel", icon: "home" },
  { href: "/transactions", label: "Extrato", short: "Extrato", icon: "list" },
  { href: "/monthly", label: "Mês a mês", short: "Mensal", icon: "chart" },
  { href: "/categories", label: "Categorias", short: "Categorias", icon: "tag" },
  { href: "/transactions/import", label: "Importar extrato", short: "Importar", icon: "upload" },
];

/** Abas do celular (cabem 4 + o botão de nova transação); Importar fica no menu do topo. */
const mobileTabs = primary.filter((l) => l.href !== "/transactions/import");

export const secondary: NavLink[] = [
  { href: "/join", label: "Entrar num lar", short: "Lar", icon: "users" },
  { href: "/settings", label: "Configurações", short: "Ajustes", icon: "settings" },
];

export function isActive(href: string, path: string): boolean {
  if (href === "/transactions") {
    return (
      path === "/transactions" ||
      (path.startsWith("/transactions/") &&
        !path.startsWith("/transactions/new") &&
        !path.startsWith("/transactions/import"))
    );
  }
  return path === href || path.startsWith(`${href}/`);
}

/** Barra lateral ameixa (desktop) + abas inferiores (celular). O topo fica no TopBar. */
export function AppNav() {
  const path = usePathname() ?? "";

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-plum px-4 py-6 text-white lg:flex">
        <Link href="/dashboard" aria-label="Bacon's Finance, ir para o painel" className="px-2">
          <Wordmark size="md" />
        </Link>

        <Link
          href="/transactions/new"
          className="mx-1 mt-8 flex items-center justify-center gap-2 rounded-2xl bg-lime px-4 py-3 text-sm font-bold text-plum transition hover:brightness-105"
        >
          <Icon name="plus" className="h-4 w-4" />
          Nova transação
        </Link>

        <nav className="mt-8 flex flex-col gap-1" aria-label="Principal">
          {primary.map((l) => (
            <SideLink key={l.href} link={l} active={isActive(l.href, path)} />
          ))}
        </nav>

        <nav className="mt-auto flex flex-col gap-1" aria-label="Conta">
          {secondary.map((l) => (
            <SideLink key={l.href} link={l} active={isActive(l.href, path)} />
          ))}
        </nav>
      </aside>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
          {mobileTabs.slice(0, 2).map((l) => (
            <TabLink key={l.href} link={l} active={isActive(l.href, path)} />
          ))}
          <li className="flex justify-center">
            <Link
              href="/transactions/new"
              aria-label="Nova transação"
              className="-mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-plum text-lime shadow-plum"
            >
              <Icon name="plus" className="h-6 w-6" />
            </Link>
          </li>
          {mobileTabs.slice(2).map((l) => (
            <TabLink key={l.href} link={l} active={isActive(l.href, path)} />
          ))}
        </ul>
      </nav>
    </>
  );
}

function SideLink({ link, active }: { link: NavLink; active: boolean }) {
  return (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-white/10 text-white"
          : "text-white/65 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon
        name={link.icon}
        className={`h-5 w-5 ${active ? "text-lime" : ""}`}
      />
      {link.label}
    </Link>
  );
}

function TabLink({ link, active }: { link: NavLink; active: boolean }) {
  return (
    <li>
      <Link
        href={link.href}
        aria-current={active ? "page" : undefined}
        className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${
          active ? "text-accent" : "text-foreground/50"
        }`}
      >
        <Icon name={link.icon} />
        {link.short}
      </Link>
    </li>
  );
}
