import {
  BarChart3,
  CalendarDays,
  CreditCard,
  Layers,
  LayoutDashboard,
  MapPin,
  PackageSearch,
  Percent,
  Settings,
  ShoppingBasket,
  ShoppingCart,
  Sparkles,
  UserCheck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Permissao } from "@/lib/role-permissions";

export type CategoriaNavegacao = "Navegação" | "Relatórios" | "Administração";

export interface ItemNavegacao {
  id: string;
  label: string;
  titulo: string;
  categoria: CategoriaNavegacao;
  href: string;
  icone: LucideIcon;
  permissao: Permissao;
  cor?: string;
}

export const itensGerais: ItemNavegacao[] = [
  { id: "dashboard", label: "Dashboard", titulo: "Dashboard Executivo", categoria: "Navegação", href: "/dashboard", icone: LayoutDashboard, permissao: "dashboard:visualizar" },
  { id: "vendas", label: "Vendas", titulo: "Consulta Analítica de Vendas", categoria: "Navegação", href: "/vendas", icone: ShoppingCart, permissao: "vendas:visualizar" },
  { id: "estoque", label: "Estoque", titulo: "Movimentações / Kardex", categoria: "Navegação", href: "/estoque", icone: PackageSearch, permissao: "estoque:visualizar" },
];

export const relatoriosVendas: ItemNavegacao[] = [
  { id: "curva-abc", label: "Curva ABC", titulo: "Curva ABC", categoria: "Relatórios", href: "/relatorios?aba=curva-abc", icone: Sparkles, cor: "text-amber-500", permissao: "relatorios:visualizar" },
  { id: "departamentos", label: "Departamentos", titulo: "Departamentos", categoria: "Relatórios", href: "/relatorios?aba=departamentos", icone: Layers, cor: "text-blue-500", permissao: "relatorios:visualizar" },
  { id: "clientes", label: "Clientes", titulo: "Clientes", categoria: "Relatórios", href: "/relatorios?aba=clientes", icone: UserCheck, cor: "text-emerald-500", permissao: "relatorios:visualizar" },
  { id: "descontos", label: "Descontos & Margem", titulo: "Descontos & Margem", categoria: "Relatórios", href: "/relatorios?aba=descontos", icone: Percent, cor: "text-rose-500", permissao: "relatorios:visualizar" },
  { id: "sazonalidade", label: "Sazonalidade & Evolução", titulo: "Sazonalidade & Evolução", categoria: "Relatórios", href: "/relatorios?aba=sazonalidade", icone: CalendarDays, cor: "text-indigo-500", permissao: "relatorios:visualizar" },
  { id: "vendedores", label: "Vendedores", titulo: "Vendedores", categoria: "Relatórios", href: "/relatorios?aba=vendedores", icone: Users, cor: "text-violet-500", permissao: "relatorios:visualizar" },
  { id: "geografico", label: "Cidade e UF", titulo: "Cidade e UF", categoria: "Relatórios", href: "/relatorios?aba=geografico", icone: MapPin, cor: "text-teal-500", permissao: "relatorios:visualizar" },
  { id: "financeiro", label: "Financeiro & Fiscal", titulo: "Financeiro & Formas de Pagto", categoria: "Relatórios", href: "/relatorios?aba=financeiro", icone: CreditCard, cor: "text-orange-500", permissao: "relatorios:visualizar" },
];

export const itensRelatorios: ItemNavegacao[] = [
  ...relatoriosVendas,
  { id: "compras", label: "Relatório de Compras", titulo: "Relatório de Compras", categoria: "Relatórios", href: "/relatorios/compras", icone: ShoppingBasket, permissao: "estoque:visualizar" },
];

export const itensAdministracao: ItemNavegacao[] = [
  { id: "usuarios", label: "Usuários", titulo: "Gestão de Usuários & Acessos", categoria: "Administração", href: "/usuarios", icone: UserCog, permissao: "usuarios:gerenciar" },
  { id: "configuracoes", label: "Configurações", titulo: "Configurações da API Syspro", categoria: "Administração", href: "/configuracoes", icone: Settings, permissao: "configuracoes:gerenciar" },
];

export const comandosNavegacao = [
  ...itensGerais,
  ...itensRelatorios,
  ...itensAdministracao,
];

// Mantém o ícone disponível para consumidores que exibem a central de relatórios.
export const iconeCentralRelatorios = BarChart3;
