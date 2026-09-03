"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HelpCircleIcon,
  LayoutDashboardIcon,
  ShoppingCartIcon,
  BarChart3Icon,
  UsersIcon,
  SettingsIcon,
} from "lucide-react";

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const isDashboard = pathname.startsWith("/dashboard") || pathname === "/";
  const isVendas = pathname.startsWith("/vendas");
  const isRelatorios = pathname.startsWith("/relatorios");
  const isUsuarios = pathname.startsWith("/usuarios");
  const isConfig = pathname.startsWith("/configuracoes");

  return (
    <nav className="hidden items-center gap-1 sm:flex text-sm font-medium">
      <Link
        href="/dashboard"
        className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
          isDashboard
            ? "text-primary font-bold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <LayoutDashboardIcon className="size-4" />
        Dashboard
        {isDashboard && (
          <span className="absolute bottom-[-10px] left-0 right-0 h-0.5 rounded-full bg-primary" />
        )}
      </Link>

      <Link
        href="/vendas"
        className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
          isVendas
            ? "text-primary font-bold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <ShoppingCartIcon className="size-4" />
        Vendas
        {isVendas && (
          <span className="absolute bottom-[-10px] left-0 right-0 h-0.5 rounded-full bg-primary" />
        )}
      </Link>

      <Link
        href="/relatorios"
        className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
          isRelatorios
            ? "text-primary font-bold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <BarChart3Icon className="size-4" />
        Relatórios
        {isRelatorios && (
          <span className="absolute bottom-[-10px] left-0 right-0 h-0.5 rounded-full bg-primary" />
        )}
      </Link>

      <Link
        href="https://ajuda.trilinksoftware.com.br/"
        target="_blank"
        className="inline-flex items-center gap-1 px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <HelpCircleIcon className="size-4" />
        Ajuda
      </Link>

      {isAdmin && (
        <>
          <Link
            href="/usuarios"
            className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
              isUsuarios
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UsersIcon className="size-4" />
            Usuários
            {isUsuarios && (
              <span className="absolute bottom-[-10px] left-0 right-0 h-0.5 rounded-full bg-primary" />
            )}
          </Link>

          <Link
            href="/configuracoes"
            className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
              isConfig
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <SettingsIcon className="size-4" />
            Configurações
            {isConfig && (
              <span className="absolute bottom-[-10px] left-0 right-0 h-0.5 rounded-full bg-primary" />
            )}
          </Link>
        </>
      )}
    </nav>
  );
}
