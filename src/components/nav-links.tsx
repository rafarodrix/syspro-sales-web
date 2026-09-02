"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDownIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  ShoppingCartIcon,
  UsersIcon,
  SettingsIcon,
} from "lucide-react";

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const isDashboard = pathname.startsWith("/dashboard") || pathname === "/";
  const isVendas = pathname.startsWith("/vendas");
  const isUsuarios = pathname.startsWith("/usuarios");
  const isConfig = pathname.startsWith("/configuracoes");

  return (
    <nav className="hidden items-center gap-1 sm:flex text-sm font-medium">
      <Link
        href="/dashboard"
        className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
          isDashboard
            ? "text-blue-600 dark:text-blue-400 font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <LayoutDashboardIcon className="size-4" />
        Dashboard
        {isDashboard && (
          <span className="absolute bottom-[-10px] left-0 right-0 h-0.5 rounded-full bg-blue-600 dark:bg-blue-500" />
        )}
      </Link>

      <Link
        href="/vendas"
        className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
          isVendas
            ? "text-blue-600 dark:text-blue-400 font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <ShoppingCartIcon className="size-4" />
        Vendas
        <ChevronDownIcon className="size-3.5 opacity-60" />
        {isVendas && (
          <span className="absolute bottom-[-10px] left-0 right-0 h-0.5 rounded-full bg-blue-600 dark:bg-blue-500" />
        )}
      </Link>

      <Link
        href="https://ajuda.trilinksoftware.com.br/"
        target="_blank"
        className="inline-flex items-center gap-1 px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <HelpCircleIcon className="size-4" />
        Ajuda
        <ChevronDownIcon className="size-3.5 opacity-60" />
      </Link>

      {isAdmin && (
        <>
          <Link
            href="/usuarios"
            className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
              isUsuarios
                ? "text-blue-600 dark:text-blue-400 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UsersIcon className="size-4" />
            Usuários
            {isUsuarios && (
              <span className="absolute bottom-[-10px] left-0 right-0 h-0.5 rounded-full bg-blue-600 dark:bg-blue-500" />
            )}
          </Link>

          <Link
            href="/configuracoes"
            className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
              isConfig
                ? "text-blue-600 dark:text-blue-400 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <SettingsIcon className="size-4" />
            Configurações
            {isConfig && (
              <span className="absolute bottom-[-10px] left-0 right-0 h-0.5 rounded-full bg-blue-600 dark:bg-blue-500" />
            )}
          </Link>
        </>
      )}
    </nav>
  );
}
