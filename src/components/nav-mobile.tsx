"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  ShoppingCart,
  Users,
  Settings,
  HelpCircle,
  Building2,
  User as UserIcon,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface EmpresaOption {
  id: string;
  cnpj: string;
  razaoSocial: string;
}

interface Props {
  isAdmin: boolean;
  userName: string;
  empresas: EmpresaOption[];
  empresaSelecionada?: string;
}

export function NavMobile({
  isAdmin,
  userName,
  empresas,
  empresaSelecionada,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isDashboard = pathname.startsWith("/dashboard") || pathname === "/";
  const isVendas = pathname.startsWith("/vendas");
  const isUsuarios = pathname.startsWith("/usuarios");
  const isConfig = pathname.startsWith("/configuracoes");

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
  }

  function handleTrocaEmpresa(e: React.ChangeEvent<HTMLSelectElement>) {
    const novaEmpresa = e.target.value;
    const url = new URL(window.location.href);
    if (novaEmpresa) {
      url.searchParams.set("empresa", novaEmpresa);
    } else {
      url.searchParams.delete("empresa");
    }
    router.push(url.pathname + url.search);
    setAberto(false);
  }

  return (
    <div className="flex items-center sm:hidden">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setAberto(!aberto)}
        aria-label="Abrir menu de navegação"
      >
        {aberto ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {aberto && (
        <div className="fixed inset-x-0 top-[53px] z-50 flex max-h-[calc(100vh-53px)] flex-col overflow-y-auto border-b bg-background/98 p-4 shadow-xl backdrop-blur-xl animate-in fade-in-0 slide-in-from-top-2">
          {empresas.length > 1 && (
            <div className="mb-4 space-y-1.5 rounded-lg border bg-muted/30 p-3">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Building2 className="size-3.5 text-primary" />
                Empresa Ativa
              </label>
              <select
                value={empresaSelecionada ?? empresas[0]?.id ?? ""}
                onChange={handleTrocaEmpresa}
                className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.razaoSocial} ({empresa.cnpj})
                  </option>
                ))}
              </select>
            </div>
          )}

          <nav className="flex flex-col gap-1 text-sm font-medium">
            <Link
              href="/dashboard"
              onClick={() => setAberto(false)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 transition-colors ${
                isDashboard
                  ? "bg-primary/10 font-bold text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <LayoutDashboard className="size-4" />
              Dashboard
            </Link>

            <Link
              href="/vendas"
              onClick={() => setAberto(false)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 transition-colors ${
                isVendas
                  ? "bg-primary/10 font-bold text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <ShoppingCart className="size-4" />
              Vendas
            </Link>

            {isAdmin && (
              <>
                <Link
                  href="/usuarios"
                  onClick={() => setAberto(false)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 transition-colors ${
                    isUsuarios
                      ? "bg-primary/10 font-bold text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Users className="size-4" />
                  Usuários
                </Link>

                <Link
                  href="/configuracoes"
                  onClick={() => setAberto(false)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 transition-colors ${
                    isConfig
                      ? "bg-primary/10 font-bold text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Settings className="size-4" />
                  Configurações
                </Link>
              </>
            )}

            <Link
              href="https://ajuda.trilinksoftware.com.br/"
              target="_blank"
              onClick={() => setAberto(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <HelpCircle className="size-4" />
              Ajuda / Suporte
            </Link>
          </nav>

          <div className="mt-4 flex flex-col gap-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <UserIcon className="size-3.5 text-muted-foreground" />
                <span>{userName}</span>
              </div>
              <ThemeToggle variant="switch" />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-center gap-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="size-3.5" />
              Sair da conta
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
