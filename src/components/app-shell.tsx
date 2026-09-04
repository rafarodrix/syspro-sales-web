"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  PackageSearch,
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
  Activity,
  Server,
} from "lucide-react";
import { EmpresaNavSelect } from "@/components/empresa-nav-select";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogOutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/command-palette";

type UserRole = "admin" | "gerente" | "gerencia" | "vendas" | "user" | string;

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

const relatoriosVendas = [
  { id: "curva-abc", label: "Curva ABC", icone: Sparkles, cor: "text-amber-500" },
  { id: "departamentos", label: "Departamentos & Mix", icone: Layers, cor: "text-blue-500" },
  { id: "clientes", label: "Clientes & Concentração", icone: UserCheck, cor: "text-emerald-500" },
  { id: "descontos", label: "Descontos & Margem", icone: Percent, cor: "text-rose-500" },
  { id: "sazonalidade", label: "Sazonalidade & Dias", icone: CalendarDays, cor: "text-indigo-500" },
  { id: "vendedores", label: "Vendedores", icone: Users, cor: "text-violet-500" },
  { id: "geografico", label: "Cidades / Praças", icone: MapPin, cor: "text-teal-500" },
  { id: "financeiro", label: "Financeiro & Fiscal", icone: CreditCard, cor: "text-orange-500" },
];

const relatoriosSubLinks = relatoriosVendas;

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
    if (pathname.startsWith("/vendas")) return { secao: "Comercial", pagina: "Consulta de Vendas" };
    if (pathname.startsWith("/estoque")) return { secao: "Estoque", pagina: "Movimentações / Kardex" };
    if (pathname.startsWith("/relatorios")) {
      const relatorio = relatoriosSubLinks.find((r) => r.id === abaAtiva);
      return { secao: "Relatórios", pagina: relatorio ? relatorio.label : "Central de Relatórios" };
    }
    if (pathname.startsWith("/usuarios")) return { secao: "Administração", pagina: "Gestão de Usuários" };
    if (pathname.startsWith("/configuracoes")) return { secao: "Administração", pagina: "Configurações da API" };
    return { secao: "Syspro ERP", pagina: "Visão Geral" };
  }, [pathname, abaAtiva]);

  const roleNormalizada = (userRole ?? "").toLowerCase();
  const isAdmin = roleNormalizada === "admin";
  const isGerencia = roleNormalizada === "gerente" || roleNormalizada === "gerencia";
  const podeVerRelatorios = isAdmin || isGerencia;
  const podeVerEstoque = isAdmin || isGerencia;
  const podeVerAdmin = isAdmin;

  function criarLinkComEmpresa(hrefBase: string) {
    if (!empresaSelecionada) return hrefBase;
    const [path, query] = hrefBase.split("?");
    const params = new URLSearchParams(query || "");
    params.set("empresa", empresaSelecionada);
    return `${path}?${params.toString()}`;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* ========================================================= */}
      {/* 1. SIDEBAR DESKTOP RETRÁTIL (Fixa na Viewport com Scroll Interno) */}
      {/* ========================================================= */}
      <aside
        className={`hidden lg:flex flex-col h-full border-r border-border/70 bg-card transition-all duration-300 ease-in-out select-none shrink-0 ${
          collapsed ? "w-[70px]" : "w-64"
        }`}
      >
        {/* Topo da Sidebar: Logo Oficial Trilink com Tag Syspro ERP */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-3.5">
          <Link
            href={criarLinkComEmpresa("/dashboard")}
            className={`flex items-center gap-2.5 transition-opacity hover:opacity-90 overflow-hidden ${
              collapsed ? "justify-center w-full" : ""
            }`}
          >
            {collapsed ? (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary font-black text-sm shadow-2xs">
                T
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src="/logo-escura.png"
                  alt="Trilink"
                  className="h-6 w-auto block dark:hidden object-contain shrink-0"
                />
                <img
                  src="/logo-clara.png"
                  alt="Trilink"
                  className="h-6 w-auto hidden dark:block object-contain shrink-0"
                />
                <Badge
                  variant="outline"
                  className="text-[9.5px] font-mono font-bold tracking-tight uppercase px-1.5 py-0 bg-muted/60 border-border/80 text-primary shrink-0"
                >
                  Syspro ERP
                </Badge>
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
              href={criarLinkComEmpresa("/dashboard")}
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
              href={criarLinkComEmpresa("/vendas")}
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

            {podeVerEstoque && (
              <Link
                href={criarLinkComEmpresa("/estoque")}
                title="Estoque / Kardex"
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  pathname === "/estoque"
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                } ${collapsed ? "justify-center px-2" : ""}`}
              >
                <PackageSearch className="size-4 shrink-0" />
                {!collapsed && <span>Estoque</span>}
              </Link>
            )}
          </div>

          {/* Grupo 2: Inteligência & Relatórios */}
          {podeVerRelatorios && (
            <div className="space-y-1">
              {!collapsed ? (
                <div
                  onClick={() => setRelatoriosOpen(!relatoriosOpen)}
                  className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 cursor-pointer hover:text-foreground transition-colors"
                >
                  <span>Relatórios</span>
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
                  href={criarLinkComEmpresa("/relatorios")}
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
                    <span className="px-2.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">Vendas</span>
                    {relatoriosVendas.map((item) => {
                      const Icone = item.icone;
                      const ativo = pathname === "/relatorios" && abaAtiva === item.id;
                      return <Link key={item.id} href={criarLinkComEmpresa(`/relatorios?aba=${item.id}`)} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-all ${ativo ? "bg-muted font-bold text-foreground shadow-2xs border-l-2 border-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}><Icone className={`size-3.5 shrink-0 ${ativo ? item.cor : "text-muted-foreground"}`} /><span className="truncate">{item.label}</span></Link>;
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
              <div className="flex items-center gap-2">
                <img
                  src="/logo-escura.png"
                  alt="Trilink"
                  className="h-6 w-auto block dark:hidden object-contain"
                />
                <img
                  src="/logo-clara.png"
                  alt="Trilink"
                  className="h-6 w-auto hidden dark:block object-contain"
                />
                <Badge
                  variant="outline"
                  className="text-[9.5px] font-mono font-bold tracking-tight uppercase px-1.5 py-0 bg-muted/60 border-border/80 text-primary shrink-0"
                >
                  Syspro ERP
                </Badge>
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
                  href={criarLinkComEmpresa("/dashboard")}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold ${
                    pathname === "/dashboard" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </Link>
                <Link
                  href={criarLinkComEmpresa("/vendas")}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold ${
                    pathname === "/vendas" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  <ShoppingCart className="size-4" />
                  Vendas
                </Link>
                {podeVerEstoque && (
                  <Link
                    href={criarLinkComEmpresa("/estoque")}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold ${
                      pathname === "/estoque" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <PackageSearch className="size-4" />
                    Estoque
                  </Link>
                )}
              </div>

              {podeVerRelatorios && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Relatórios</span>
                  {relatoriosSubLinks.map((item) => (
                    <Link
                      key={item.id}
                      href={criarLinkComEmpresa(`/relatorios?aba=${item.id}`)}
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
      {/* 3. CONTEÚDO PRINCIPAL + TOPBAR EXECUTIVA ANTI-SOBREPOSIÇÃO */}
      {/* ========================================================= */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        {/* Topbar Executiva com Layout Flex Protegido contra Colisões */}
        <header className="shrink-0 flex h-16 items-center justify-between gap-2 sm:gap-4 border-b border-border/60 bg-background/95 px-3 sm:px-6 backdrop-blur-md z-40">
          {/* Lado Esquerdo: Mobile Trigger + Breadcrumb + Status API */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
            <Button
              variant="outline"
              size="icon"
              className="size-8 shrink-0 lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-4" />
            </Button>

            {/* Breadcrumb Elegante com Truncate */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs min-w-0 truncate">
              <span className="font-semibold text-muted-foreground hidden md:inline shrink-0">
                {breadcrumb.secao}
              </span>
              <span className="text-muted-foreground/60 hidden md:inline shrink-0">/</span>
              <span className="font-bold text-foreground truncate" title={breadcrumb.pagina}>
                {breadcrumb.pagina}
              </span>
            </div>

            {/* Status da Conexão com Syspro ERP */}
            <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Syspro API Online</span>
            </div>
          </div>

          {/* Lado Direito: Command Palette + Seletor Multi-Empresa + Tema + Perfil */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <div className="shrink-0">
              <CommandPalette />
            </div>

            {empresas.length > 1 && (
              <div className="shrink min-w-0">
                <EmpresaNavSelect
                  empresas={empresas}
                  empresaSelecionada={empresaSelecionada}
                />
              </div>
            )}

            <div className="h-4 w-px bg-border/60 hidden sm:block shrink-0" />

            <div className="shrink-0">
              <ThemeToggle variant="switch" />
            </div>

            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-semibold text-foreground shrink-0">
              <ShieldCheck className="size-3.5 text-primary shrink-0" />
              <span className="capitalize">{userRole}</span>
            </div>
          </div>
        </header>

        {/* Área de Visualização do Conteúdo */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
          <div className="mx-auto max-w-7xl w-full flex-1">
            {children}
          </div>

          {/* Rodapé Corporativo Enterprise */}
          <footer className="mt-12 border-t border-border/60 pt-6 pb-2 text-xs text-muted-foreground">
            <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">SysproERP Reports</span>
                <span>·</span>
                <span>Trilink Software</span>
                <span>·</span>
                <span className="text-[11px] font-mono bg-muted/60 px-1.5 py-0.2 rounded border border-border/60">
                  v1.0.0 Enterprise
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span>Serviço Ativo</span>
                </div>
                <span>·</span>
                <span>Consulta Segura Multi-Filial</span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
