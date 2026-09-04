"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  ShoppingCart,
  BarChart3,
  Users,
  Settings,
  HelpCircle,
  Building2,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Sparkles,
  UserCheck,
  Percent,
  CalendarDays,
  Layers,
  MapPin,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { temPermissao } from "@/lib/role-permissions";

interface EmpresaOption {
  id: string;
  cnpj: string;
  razaoSocial: string;
}

interface Props {
  userRole?: string;
  userName: string;
  empresas: EmpresaOption[];
  empresaSelecionada?: string;
}

export function NavMobile({
  userRole = "vendas",
  userName,
  empresas,
  empresaSelecionada,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [relatoriosAberto, setRelatoriosAberto] = useState(false);
  const [adminAberto, setAdminAberto] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const podeVerRelatorios = temPermissao(userRole, "relatorios:visualizar");
  const podeVerAdmin = temPermissao(userRole, "usuarios:gerenciar");

  const isDashboard = pathname.startsWith("/dashboard") || pathname === "/";
  const isVendas = pathname.startsWith("/vendas");
  const isRelatorios = pathname.startsWith("/relatorios");
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

            {/* Submenu Relatórios Mobile */}
            {podeVerRelatorios && (
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setRelatoriosAberto(!relatoriosAberto)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isRelatorios
                      ? "bg-primary/10 font-bold text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BarChart3 className="size-4" />
                    <span>Relatórios</span>
                  </div>
                  <ChevronDown
                    className={`size-4 transition-transform ${
                      relatoriosAberto || isRelatorios ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {(relatoriosAberto || isRelatorios) && (
                  <div className="ml-4 mt-1 flex flex-col gap-1 border-l-2 border-primary/30 pl-3 py-1 text-xs">
                    <Link
                      href="/relatorios"
                      onClick={() => setAberto(false)}
                      className="font-bold text-primary py-1"
                    >
                      Todos os Relatórios →
                    </Link>
                    <Link
                      href="/relatorios?aba=curva-abc"
                      onClick={() => setAberto(false)}
                      className="flex items-center gap-2 py-1 text-muted-foreground hover:text-foreground"
                    >
                      <Sparkles className="size-3.5 text-amber-500" />
                      Curva ABC (Produtos)
                    </Link>
                    <Link
                      href="/relatorios?aba=clientes"
                      onClick={() => setAberto(false)}
                      className="flex items-center gap-2 py-1 text-muted-foreground hover:text-foreground"
                    >
                      <UserCheck className="size-3.5 text-emerald-500" />
                      Clientes
                    </Link>
                    <Link
                      href="/relatorios?aba=descontos"
                      onClick={() => setAberto(false)}
                      className="flex items-center gap-2 py-1 text-muted-foreground hover:text-foreground"
                    >
                      <Percent className="size-3.5 text-rose-500" />
                      Descontos & Margem
                    </Link>
                    <Link
                      href="/relatorios?aba=sazonalidade"
                      onClick={() => setAberto(false)}
                      className="flex items-center gap-2 py-1 text-muted-foreground hover:text-foreground"
                    >
                      <CalendarDays className="size-3.5 text-indigo-500" />
                      Sazonalidade & Evolução
                    </Link>
                    <Link
                      href="/relatorios?aba=departamentos"
                      onClick={() => setAberto(false)}
                      className="flex items-center gap-2 py-1 text-muted-foreground hover:text-foreground"
                    >
                      <Layers className="size-3.5" />
                      Departamentos
                    </Link>
                    <Link
                      href="/relatorios?aba=vendedores"
                      onClick={() => setAberto(false)}
                      className="flex items-center gap-2 py-1 text-muted-foreground hover:text-foreground"
                    >
                      <Users className="size-3.5" />
                      Equipe de Vendedores
                    </Link>
                    <Link
                      href="/relatorios?aba=geografico"
                      onClick={() => setAberto(false)}
                      className="flex items-center gap-2 py-1 text-muted-foreground hover:text-foreground"
                    >
                      <MapPin className="size-3.5" />
                      Cidade e UF
                    </Link>
                    <Link
                      href="/relatorios?aba=financeiro"
                      onClick={() => setAberto(false)}
                      className="flex items-center gap-2 py-1 text-muted-foreground hover:text-foreground"
                    >
                      <CreditCard className="size-3.5" />
                      Financeiro & Fiscal
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Submenu Administração Mobile */}
            {podeVerAdmin && (
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setAdminAberto(!adminAberto)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isUsuarios || isConfig
                      ? "bg-primary/10 font-bold text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="size-4" />
                    <span>Administração</span>
                  </div>
                  <ChevronDown
                    className={`size-4 transition-transform ${
                      adminAberto || isUsuarios || isConfig ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {(adminAberto || isUsuarios || isConfig) && (
                  <div className="ml-4 mt-1 flex flex-col gap-1 border-l-2 border-primary/30 pl-3 py-1 text-xs">
                    <Link
                      href="/usuarios"
                      onClick={() => setAberto(false)}
                      className="flex items-center gap-2 py-1 text-muted-foreground hover:text-foreground"
                    >
                      <Users className="size-3.5" />
                      Usuários & Permissões
                    </Link>
                    <Link
                      href="/configuracoes"
                      onClick={() => setAberto(false)}
                      className="flex items-center gap-2 py-1 text-muted-foreground hover:text-foreground"
                    >
                      <Settings className="size-3.5" />
                      Configurações da API
                    </Link>
                  </div>
                )}
              </div>
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
