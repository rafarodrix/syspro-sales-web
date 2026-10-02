import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CreditCard,
  Layers,
  MapPin,
  Percent,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";

export interface ReportDefinition {
  id:
    | "curva-abc"
    | "clientes"
    | "descontos"
    | "sazonalidade"
    | "departamentos"
    | "vendedores"
    | "geografico"
    | "financeiro";
  label: string;
  menuLabel: string;
  icone: LucideIcon;
  cor: string;
  desc: string;
}

export const REPORT_DEFINITIONS: readonly ReportDefinition[] = [
  {
    id: "curva-abc",
    label: "Curva ABC (Produtos)",
    menuLabel: "Curva ABC",
    icone: Sparkles,
    cor: "text-amber-500",
    desc: "Pareto 80/15/5 de faturamento e volume de itens",
  },
  {
    id: "clientes",
    label: "Clientes",
    menuLabel: "Clientes",
    icone: UserCheck,
    cor: "text-emerald-500",
    desc: "Recorrência, concentração e Pareto da base de clientes",
  },
  {
    id: "descontos",
    label: "Descontos & Margem",
    menuLabel: "Descontos & Margem",
    icone: Percent,
    cor: "text-rose-500",
    desc: "Descontos por vendedor, departamento e forma de pagamento",
  },
  {
    id: "sazonalidade",
    label: "Sazonalidade & Evolução",
    menuLabel: "Sazonalidade & Evolução",
    icone: CalendarDays,
    cor: "text-indigo-500",
    desc: "Evolução diária e mensal, dias da semana e quinzenas",
  },
  {
    id: "departamentos",
    label: "Departamentos",
    menuLabel: "Departamentos",
    icone: Layers,
    cor: "text-blue-500",
    desc: "Faturamento por categoria com itens detalhados",
  },
  {
    id: "vendedores",
    label: "Equipe de Vendedores",
    menuLabel: "Vendedores",
    icone: Users,
    cor: "text-violet-500",
    desc: "Ranking de consultores, ticket médio e descontos",
  },
  {
    id: "geografico",
    label: "Cidade e UF",
    menuLabel: "Cidade e UF",
    icone: MapPin,
    cor: "text-teal-500",
    desc: "Distribuição por cidade ou UF, clientes atendidos e frete rateado",
  },
  {
    id: "financeiro",
    label: "Financeiro & Fiscal",
    menuLabel: "Financeiro & Fiscal",
    icone: CreditCard,
    cor: "text-orange-500",
    desc: "Formas de pagamento declaradas e documentos fiscais",
  },
] as const;

export const REPORT_DEFINITIONS_BY_ID = new Map(
  REPORT_DEFINITIONS.map((report) => [report.id, report]),
);
