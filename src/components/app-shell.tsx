"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  BarChart3,
  Sparkles,
  UserCheck,
  Percent,
  CalendarDays,
  Layers,
  Users,
  MapPin,
  CreditCard,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Building2,
  CheckCircle2,
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
} from "lucide-react";
import { EmpresaNavSelect } from "@/components/empresa-nav-select";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogOutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type UserRole = "admin" | "gerente" | "vendas" | "user" | string;

interface Empresa {
  id: string;
  cnpj: string;
  razaoSocial: string;
}

interface AppShellProps {
  userName: string;
  userRole: UserRole;
  empresas: Empresa[];
  empresaSelecionada?: string;
  children: React.ReactNode;
}

const relatoriosSubLinks = [
  { id: "curva-abc", label: "Curva ABC (Produtos)", icone: Sparkles, cor: "text-amber-500" },
  { id: "clientes", label: "Clientes & Concentração", icone: UserCheck, cor: "text-emerald-500" },
  { id: "descontos", label: "Descontos & Margem", icone: Percent, cor: "text-rose-500" },
  { id: "sazonalidade", label: "Sazonalidade & Dias", icone: CalendarDays, cor: "text-indigo-500" },
  { id: "departamentos", label: "Departamentos", icone: Layers, cor: "text-blue-500" },
  { id: "vendedores", label: "Vendedores", icone: Users, cor: "text-violet-500" },
  { id: "geografico", label: "Cidades / Praças", icone: MapPin, cor: "text-teal-500" },
  { id: "financeiro", label: "Financeiro & Fiscal", icone: CreditCard, cor: "text-orange-500" },
];

function extrairIniciais(nome: string): string {
  if (!nome) return "US";
  const partes = nome.trim().split(" ").filter(Boolean);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function AppShell({
  userName,
  userRole,
  empresas,
  empresaSelecionada,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const abaAtiva = searchParams.get("aba") || "curva-abc";

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [relatoriosOpen, setRelatoriosOpen] = useState(true);

  // Carregar preferência salva
  useEffect(() => {
    const saved = localStorage.getItem("syspro_sidebar_collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    }
  }, []);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("syspro_sidebar_collapsed", String(next));
  }

  // Fechar gaveta mobile em mudança de rota
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, searchParams]);

  // Determinar breadcrumb da página atual
  const breadcrumb = useMemo(() => {
    if (pathname.startsWith("/dashboard")) return { secao: "Visão Geral", pagina: "Dashboard Executivo" };
    if (pathname.startsWith("/vendas")) return { secao: "Comercial", pagina: "Consulta Analítica de Vendas" };
    if (pathname.startsWith("/relatorios")) {
      const relatorio = relatoriosSubLinks.find((r) => r.id === abaAtiva);
      return { secao: "Relatórios & BI", pagina: relatorio ? relatorio.label : "Central de Relatórios" };
    }
    if (pathname.startsWith("/usuarios")) return { secao: "Administração", pagina: "Gestão de Usuários" };
    if (pathname.startsWith("/configuracoes")) return { secao: "Administração", pagina: "Configurações da API" };
    return { secao: "Syspro ERP", pagina: "Visão Geral" };
  }, [pathname, abaAtiva]);

  const roleNormalizada = (userRole ?? "").toLowerCase();
  const isAdmin = roleNormalizada === "admin";
  const isGerencia = roleNormalizada === "gerente" || roleNormalizada === "gerencia";
  const podeVerRelatorios = isAdmin || isGerencia;
  const podeVerAdmin = isAdmin;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* ========================================================= */}
      {/* 1. SIDEBAR DESKTOP RETRÁTIL */}
      {/* ========================================================= */}
      <aside
        className={`hidden lg:flex flex-col border-r border-border/70 bg-card transition-all duration-300 ease-in-out select-none ${
          collapsed ? "w-[70px]" : "w-64"
        }`}
      >
        {/* Topo da Sidebar: Logo Trilink Syspro ERP */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-4">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 transition-opacity hover:opacity-90 overflow-hidden ${
              collapsed ? "justify-center w-full" : ""
            }`}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
              <svg
                viewBox="0 0 24 24"
                className="size-5 fill-current"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight animate-in fade-in duration-200">
                <span className="text-base font-extrabold tracking-tight text-foreground">
                  TRILINK
                </span>
                <span className="text-[10.5px] font-semibold text-muted-foreground">
                  Syspro Sales Web
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Links de Navegação */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-5">
          {/* Grupo 1: Geral */}
          <div className="space-y-1">
            {!collapsed && (
              <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Geral
              </span>
            )}
            <Link
              href="/dashboard"
              title="Dashboard"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                pathname === "/dashboard"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              } ${collapsed ? "justify-center px-2" : ""}`}
            >
              <LayoutDashboard className="size-4 shrink-0" />
              {!collapsed && <span>Dashboard</span>}
            </Link>

            <Link
              href="/vendas"
              title="Vendas"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                pathname === "/vendas"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              } ${collapsed ? "justify-center px-2" : ""}`}
            >
              <ShoppingCart className="size-4 shrink-0" />
              {!collapsed && <span>Vendas</span>}
            </Link>
          </div>

          {/* Grupo 2: Inteligência & Relatórios */}
          {podeVerRelatorios && (
            <div className="space-y-1">
              {!collapsed ? (
                <div
                  onClick={() => setRelatoriosOpen(!relatoriosOpen)}
                  className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 cursor-pointer hover:text-foreground transition-colors"
                >
                  <span>Relatórios & BI</span>
                  <ChevronDown
                    className={`size-3 transition-transform duration-200 ${
                      relatoriosOpen ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                </div>
              ) : (
                <div className="my-2 border-t border-border/50" />
              )}

              {/* Se a sidebar estiver colapsada, exibe o link geral de relatórios */}
              {collapsed ? (
                <Link
                  href="/relatorios"
                  title="Central de Relatórios"
                  className={`flex items-center justify-center rounded-lg p-2 text-xs font-semibold transition-all ${
                    pathname.startsWith("/relatorios")
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  <BarChart3 className="size-4 shrink-0" />
                </Link>
              ) : (
                relatoriosOpen && (
                  <div className="space-y-0.5 pl-1 animate-in fade-in duration-150">
                    {relatoriosSubLinks.map((item) => {
                      const Icone = item.icone;
                      const ativo = pathname === "/relatorios" && abaAtiva === item.id;

                      return (
                        <Link
                          key={item.id}
                          href={`/relatorios?aba=${item.id}`}
                          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-all ${
                            ativo
                              ? "bg-muted font-bold text-foreground shadow-2xs border-l-2 border-primary"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          }`}
                        >
                          <Icone className={`size-3.5 shrink-0 ${ativo ? item.cor : "text-muted-foreground"}`} />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}

          {/* Grupo 3: Administração */}
          {podeVerAdmin && (
            <div className="space-y-1">
              {!collapsed ? (
                <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  Administração
                </span>
              ) : (
                <div className="my-2 border-t border-border/50" />
              )}

              <Link
                href="/usuarios"
                title="Usuários & Permissões"
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  pathname === "/usuarios"
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                } ${collapsed ? "justify-center px-2" : ""}`}
              >
                <UserCog className="size-4 shrink-0" />
                {!collapsed && <span>Usuários</span>}
              </Link>

              <Link
                href="/configuracoes"
                title="Configurações da API"
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  pathname === "/configuracoes"
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                } ${collapsed ? "justify-center px-2" : ""}`}
              >
                <Settings className="size-4 shrink-0" />
                {!collapsed && <span>Configurações</span>}
              </Link>
            </div>
          )}
        </div>

        {/* Rodapé da Sidebar: Perfil + Botão Colapsar */}
        <div className="border-t border-border/60 p-3 space-y-2">
          {/* Card do Usuário */}
          <div
            className={`flex items-center gap-2.5 rounded-xl bg-muted/40 p-2 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 font-mono text-xs font-bold text-primary">
              {extrairIniciais(userName)}
            </div>
            {!collapsed && (
              <div className="flex flex-1 flex-col min-w-0 leading-tight">
                <span className="truncate text-xs font-bold text-foreground" title={userName}>
                  {userName}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {userRole}
                </span>
              </div>
            )}
            {!collapsed && <LogOutButton />}
          </div>

          {/* Botão de Colapsar / Expandir */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className={`w-full h-8 text-xs font-semibold text-muted-foreground hover:text-foreground ${
              collapsed ? "px-0 justify-center" : "justify-between px-2.5"
            }`}
          >
            {!collapsed && <span>Recolher menu</span>}
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. DRAWER MOBILE (Para Celulares e Tablets) */}
      {/* ========================================================= */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Overlay escuro */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in"
            onClick={() => setMobileOpen(false)}
          />

          {/* Gaveta */}
          <div className="relative flex w-72 flex-col bg-card border-r border-border p-4 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                  S
                </div>
                <span className="font-extrabold text-sm">TRILINK Syspro</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setMobileOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Geral</span>
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold ${
                    pathname === "/dashboard" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </Link>
                <Link
                  href="/vendas"
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold ${
                    pathname === "/vendas" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  <ShoppingCart className="size-4" />
                  Vendas
                </Link>
              </div>

              {podeVerRelatorios && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Relatórios</span>
                  {relatoriosSubLinks.map((item) => (
                    <Link
                      key={item.id}
                      href={`/relatorios?aba=${item.id}`}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                    >
                      <item.icone className={`size-3.5 ${item.cor}`} />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}

              {podeVerAdmin && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Administração</span>
                  <Link
                    href="/usuarios"
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
                  >
                    <UserCog className="size-4" />
                    Usuários
                  </Link>
                  <Link
                    href="/configuracoes"
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
                  >
                    <Settings className="size-4" />
                    Configurações
                  </Link>
                </div>
              )}
            </div>

            <div className="border-t pt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <div className="flex size-7 items-center justify-center rounded-full bg-primary/20 text-primary font-bold">
                  {extrairIniciais(userName)}
                </div>
                <span>{userName}</span>
              </div>
              <LogOutButton />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. CONTEÚDO PRINCIPAL + TOPBAR EXECUTIVA */}
      {/* ========================================================= */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Topbar Executiva Glassmorphic */}
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-background/95 px-4 backdrop-blur-md sm:px-6">
          {/* Lado Esquerdo: Mobile Trigger + Breadcrumb + Status API */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Button
              variant="outline"
              size="icon"
              className="size-8 lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-4" />
            </Button>

            {/* Breadcrumb Elegante */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-muted-foreground hidden sm:inline">
                {breadcrumb.secao}
              </span>
              <span className="text-muted-foreground/60 hidden sm:inline">/</span>
              <span className="font-bold text-foreground">
                {breadcrumb.pagina}
              </span>
            </div>

            {/* Status da Conexão com Syspro ERP */}
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 md:flex">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Syspro API Online</span>
            </div>
          </div>

          {/* Lado Direito: Seletor Multi-Empresa + Tema + Perfil */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {empresas.length > 1 && (
              <div className="max-w-[200px] sm:max-w-[260px]">
                <EmpresaNavSelect
                  empresas={empresas}
                  empresaSelecionada={empresaSelecionada}
                />
              </div>
            )}

            <div className="h-4 w-px bg-border/60 hidden sm:block" />

            <ThemeToggle variant="switch" />

            <div className="hidden lg:flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs font-semibold text-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              <span>{userRole}</span>
            </div>
          </div>
        </header>

        {/* Área de Visualização do Conteúdo */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
