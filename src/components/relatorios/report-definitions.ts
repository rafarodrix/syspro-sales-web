import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  CalendarDays,
  CreditCard,
  Factory,
  Layers,
  MapPin,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";

export interface ReportDefinition {
  id:
    | "curva-abc"
    | "clientes"
    | "margens"
    | "sazonalidade"
    | "departamentos"
    | "vendedores"
    | "geografico"
    | "financeiro"
    | "fornecedores";
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
    cor: "text-muted-foreground",
    desc: "Pareto 80/15/5 de faturamento e volume de itens",
  },
  {
    id: "clientes",
    label: "Clientes",
    menuLabel: "Clientes",
    icone: UserCheck,
    cor: "text-muted-foreground",
    desc: "Recorrência, concentração e Pareto da base de clientes",
  },
  {
    id: "margens",
    label: "Vendas & Margem",
    menuLabel: "Vendas & Margem",
    icone: BadgeDollarSign,
    cor: "text-muted-foreground",
    desc: "Margem por produto, custo de reposição e impacto das EDVs",
  },
  {
    id: "sazonalidade",
    label: "Sazonalidade & Evolução",
    menuLabel: "Sazonalidade & Evolução",
    icone: CalendarDays,
    cor: "text-muted-foreground",
    desc: "Evolução diária e mensal, dias da semana e quinzenas",
  },
  {
    id: "departamentos",
    label: "Departamentos",
    menuLabel: "Departamentos",
    icone: Layers,
    cor: "text-muted-foreground",
    desc: "Faturamento por categoria com itens detalhados",
  },
  {
    id: "vendedores",
    label: "Equipe de Vendedores",
    menuLabel: "Vendedores",
    icone: Users,
    cor: "text-muted-foreground",
    desc: "Ranking de consultores, ticket médio e descontos",
  },
  {
    id: "geografico",
    label: "Cidade e UF",
    menuLabel: "Cidade e UF",
    icone: MapPin,
    cor: "text-muted-foreground",
    desc: "Distribuição por cidade ou UF, clientes atendidos e frete rateado",
  },
  {
    id: "fornecedores",
    label: "Análise de Fornecedores",
    menuLabel: "Fornecedores",
    icone: Factory,
    cor: "text-muted-foreground",
    desc: "Vendas, margem e concentração por fornecedor do produto",
  },
  {
    id: "financeiro",
    label: "Financeiro & Fiscal",
    menuLabel: "Financeiro & Fiscal",
    icone: CreditCard,
    cor: "text-muted-foreground",
    desc: "Formas de pagamento declaradas e documentos fiscais",
  },
] as const;

export const REPORT_DEFINITIONS_BY_ID = new Map(
  REPORT_DEFINITIONS.map((report) => [report.id, report]),
);
