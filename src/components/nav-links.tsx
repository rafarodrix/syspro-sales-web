"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  BarChart3,
  ChevronDown,
  Sparkles,
  UserCheck,
  Percent,
  CalendarDays,
  Layers,
  Users,
  MapPin,
  CreditCard,
  ShieldCheck,
  Settings,
  HelpCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { temPermissao } from "@/lib/role-permissions";

export function NavLinks({ userRole = "vendas" }: { userRole?: string }) {
  const pathname = usePathname();

  const podeVerRelatorios = temPermissao(userRole, "relatorios:visualizar");
  const podeVerAdmin = temPermissao(userRole, "usuarios:gerenciar");

  const isDashboard = pathname.startsWith("/dashboard") || pathname === "/";
  const isVendas = pathname.startsWith("/vendas");
  const isRelatorios = pathname.startsWith("/relatorios");
  const isUsuarios = pathname.startsWith("/usuarios");
  const isConfig = pathname.startsWith("/configuracoes");
  const isAdministracao = isUsuarios || isConfig;

  return (
    <nav className="hidden items-center gap-1 sm:flex text-sm font-medium">
      {/* 1. Dashboard */}
      <Link
        href="/dashboard"
        className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
          isDashboard
            ? "bg-primary/10 text-primary font-bold"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        }`}
      >
        <LayoutDashboard className="size-3.5" />
        Dashboard
        {isDashboard && (
          <span className="absolute bottom-[-9px] left-2 right-2 h-0.5 rounded-full bg-primary" />
        )}
      </Link>

      {/* 2. Vendas */}
      <Link
        href="/vendas"
        className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
          isVendas
            ? "bg-primary/10 text-primary font-bold"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        }`}
      >
        <ShoppingCart className="size-3.5" />
        Vendas
        {isVendas && (
          <span className="absolute bottom-[-9px] left-2 right-2 h-0.5 rounded-full bg-primary" />
        )}
      </Link>

      {/* 3. Dropdown Enterprise: Relatórios Analíticos */}
      {podeVerRelatorios && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer outline-none ${
              isRelatorios
                ? "bg-primary/10 text-primary font-bold"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <BarChart3 className="size-3.5" />
            <span>Relatórios</span>
            <ChevronDown className="size-3 opacity-60" />
            {isRelatorios && (
              <span className="absolute bottom-[-9px] left-2 right-2 h-0.5 rounded-full bg-primary" />
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            sideOffset={8}
            className="w-[480px] p-2.5 shadow-xl border-border/80 bg-popover/98 backdrop-blur-xl animate-in fade-in-0 zoom-in-95"
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <div>
                <DropdownMenuLabel className="p-0 text-xs font-extrabold text-foreground">
                  Central de Relatórios & Inteligência
                </DropdownMenuLabel>
                <p className="text-[11px] text-muted-foreground">
                  Análises de Pareto, clientes, margem, equipe e finanças
                </p>
              </div>
              <Link
                href="/relatorios"
                className="text-[11px] font-bold text-primary hover:underline"
              >
                Abrir Central →
              </Link>
            </div>

            <DropdownMenuSeparator className="my-2" />

            <div className="grid grid-cols-2 gap-1">
              {/* Coluna 1 */}
              <div className="flex flex-col gap-0.5">
                <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                  <Link
                    href="/relatorios?aba=curva-abc"
                    className="flex items-start gap-2.5 rounded-md p-2 hover:bg-muted/60 transition-colors"
                  >
                    <div className="mt-0.5 flex size-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Sparkles className="size-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Curva ABC</div>
                      <div className="text-[10.5px] text-muted-foreground">Pareto 80/15/5 de produtos</div>
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                  <Link
                    href="/relatorios?aba=clientes"
                    className="flex items-start gap-2.5 rounded-md p-2 hover:bg-muted/60 transition-colors"
                  >
                    <div className="mt-0.5 flex size-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <UserCheck className="size-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Clientes & Carteira</div>
                      <div className="text-[10.5px] text-muted-foreground">Pareto e recorrência</div>
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                  <Link
                    href="/relatorios?aba=descontos"
                    className="flex items-start gap-2.5 rounded-md p-2 hover:bg-muted/60 transition-colors"
                  >
                    <div className="mt-0.5 flex size-6 items-center justify-center rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <Percent className="size-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Descontos & Margem</div>
                      <div className="text-[10.5px] text-muted-foreground">Taxa de desconto comercial</div>
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                  <Link
                    href="/relatorios?aba=sazonalidade"
                    className="flex items-start gap-2.5 rounded-md p-2 hover:bg-muted/60 transition-colors"
                  >
                    <div className="mt-0.5 flex size-6 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <CalendarDays className="size-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Sazonalidade</div>
                      <div className="text-[10.5px] text-muted-foreground">Dias da semana e quinzenas</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </div>

              {/* Coluna 2 */}
              <div className="flex flex-col gap-0.5">
                <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                  <Link
                    href="/relatorios?aba=departamentos"
                    className="flex items-start gap-2.5 rounded-md p-2 hover:bg-muted/60 transition-colors"
                  >
                    <div className="mt-0.5 flex size-6 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Layers className="size-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Departamentos</div>
                      <div className="text-[10.5px] text-muted-foreground">Mix e itens por categoria</div>
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                  <Link
                    href="/relatorios?aba=vendedores"
                    className="flex items-start gap-2.5 rounded-md p-2 hover:bg-muted/60 transition-colors"
                  >
                    <div className="mt-0.5 flex size-6 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
                      <Users className="size-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Equipe Comercial</div>
                      <div className="text-[10.5px] text-muted-foreground">Vendedores e tickets médios</div>
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                  <Link
                    href="/relatorios?aba=geografico"
                    className="flex items-start gap-2.5 rounded-md p-2 hover:bg-muted/60 transition-colors"
                  >
                    <div className="mt-0.5 flex size-6 items-center justify-center rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      <MapPin className="size-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Cidade e UF</div>
                      <div className="text-[10.5px] text-muted-foreground">Geolocalização e frete</div>
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                  <Link
                    href="/relatorios?aba=financeiro"
                    className="flex items-start gap-2.5 rounded-md p-2 hover:bg-muted/60 transition-colors"
                  >
                    <div className="mt-0.5 flex size-6 items-center justify-center rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400">
                      <CreditCard className="size-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Financeiro & Fiscal</div>
                      <div className="text-[10.5px] text-muted-foreground">Meios de pgto e ICMS-ST</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* 4. Dropdown Administração (Apenas Admin) */}
      {podeVerAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer outline-none ${
              isAdministracao
                ? "bg-primary/10 text-primary font-bold"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <ShieldCheck className="size-3.5" />
            <span>Administração</span>
            <ChevronDown className="size-3 opacity-60" />
            {isAdministracao && (
              <span className="absolute bottom-[-9px] left-2 right-2 h-0.5 rounded-full bg-primary" />
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            sideOffset={8}
            className="w-64 p-2 shadow-xl border-border/80 bg-popover/98 backdrop-blur-xl"
          >
            <DropdownMenuLabel className="px-2 py-1 text-xs font-extrabold text-foreground">
              Gestão do Sistema
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1.5" />

            <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
              <Link
                href="/usuarios"
                className="flex items-start gap-2.5 rounded-md p-2 hover:bg-muted/60 transition-colors"
              >
                <div className="mt-0.5 flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Users className="size-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">Usuários & Acessos</div>
                  <div className="text-[10.5px] text-muted-foreground">Perfis, permissões e CNPJs</div>
                </div>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
              <Link
                href="/configuracoes"
                className="flex items-start gap-2.5 rounded-md p-2 hover:bg-muted/60 transition-colors"
              >
                <div className="mt-0.5 flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Settings className="size-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">Configurações API</div>
                  <div className="text-[10.5px] text-muted-foreground">Syspro ERP e empresas</div>
                </div>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* 5. Link de Ajuda */}
      <Link
        href="https://ajuda.trilinksoftware.com.br/"
        target="_blank"
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      >
        <HelpCircle className="size-3.5" />
        Ajuda
      </Link>
    </nav>
  );
}
