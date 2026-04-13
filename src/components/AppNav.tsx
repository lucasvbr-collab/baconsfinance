"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Painel" },
  { href: "/categories", label: "Categorias" },
  { href: "/transactions", label: "Extrato" },
  { href: "/transactions/new", label: "Nova transação" },
  { href: "/join", label: "Convite" },
  { href: "/settings", label: "Configurações" },
];

export function AppNav() {
  const currentPath = usePathname() ?? "";

  return (
    <header className="border-b border-border/80 bg-card/85 shadow-card backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link
          href="/dashboard"
          className="font-display text-lg font-semibold tracking-tight text-accent"
        >
          Bacon&apos;s Finance
        </Link>
        <nav className="flex flex-wrap gap-1">
          {links.map((l) => {
            let active = currentPath === l.href;
            if (l.href === "/transactions") {
              active =
                currentPath === "/transactions" ||
                (currentPath.startsWith("/transactions/") &&
                  !currentPath.startsWith("/transactions/new"));
            } else if (l.href === "/transactions/new") {
              active = currentPath.startsWith("/transactions/new");
            } else if (l.href === "/join") {
              active = currentPath === "/join" || currentPath.startsWith("/join/");
            } else if (l.href !== "/dashboard") {
              active =
                currentPath === l.href || currentPath.startsWith(`${l.href}/`);
            } else {
              active = currentPath === "/dashboard";
            }
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-accent text-black"
                    : "text-foreground/80 hover:bg-border hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
