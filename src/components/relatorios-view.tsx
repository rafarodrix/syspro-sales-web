"use client";

import { useState, useMemo } from "react";
import {
  BarChart3,
  Search,
  X,
  Layers,
  Users,
  MapPin,
  CreditCard,
  Sparkles,
  Percent,
  CalendarDays,
  UserCheck,
  Building2,
} from "lucide-react";
import type { VendaProduto, VendaComEmpresa } from "@/lib/syspro-api";
import {
  calcularCurvaABC,
  analiseDepartamentos,
  analiseVendedores,
  analiseClientes,
  analiseDescontos,
  analiseSazonalidade,
  analiseGeografica,
  analiseFinanceira,
  analiseClientesNovosRecorrentes,
  calcularVariacoesPeriodo,
  calcularPeriodoAnterior,
  concentracaoTopN,
  maioresCrescimentosProdutos,
  resumoVendas,
  formatarDataInputParaBR,
} from "@/lib/vendas";
import {
  DateRangeFilter,
  periodoMesAtual,
  type Periodo,
} from "@/components/date-range-filter";
import { useConsultaVendas } from "@/hooks/use-consulta-vendas";
import { exportarPdfAnalitico } from "@/lib/pdf-export";
import { GlossarioRelatorio, GUIAS_RELATORIOS } from "@/components/relatorio-guia";
import {
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
} from "@/lib/formatters";
import { ExportDropdown } from "@/components/export-dropdown";
import { FeedbackState } from "@/components/feedback-state";
import { exportarParaCSV } from "@/lib/exportar-csv";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Subcomponentes modulares de abas
import { AbaCurvaABC } from "./relatorios/aba-curva-abc";
import { AbaClientes } from "./relatorios/aba-clientes";
import { AbaDescontos } from "./relatorios/aba-descontos";
import { AbaSazonalidade } from "./relatorios/aba-sazonalidade";
import { AbaDepartamentos } from "./relatorios/aba-departamentos";
import { AbaVendedores } from "./relatorios/aba-vendedores";
import { AbaGeografico } from "./relatorios/aba-geografico";
import { AbaFinanceiro } from "./relatorios/aba-financeiro";
import { PanoramaPeriodo } from "./relatorios/panorama-periodo";

interface EmpresaOption {
  id: string;
  cnpj: string;
  razaoSocial: string;
}

interface Props {
  empresas: EmpresaOption[];
  empresaInicial?: string;
  abaInicial?: string;
  initialPeriod?: Periodo;
  initialVendas?: (VendaProduto | VendaComEmpresa)[];
  initialPeriodoAnterior?: { inicial: string; final: string };
  initialVendasAnteriores?: (VendaProduto | VendaComEmpresa)[];
  initialError?: string;
}

const relatoriosOpcoes = [
  { id: "curva-abc", label: "Curva ABC (Produtos)", icone: Sparkles, cor: "text-amber-500", desc: "Pareto 80/15/5 de faturamento e volume de itens" },
  { id: "clientes", label: "Clientes & Concentração", icone: UserCheck, cor: "text-emerald-500", desc: "Concentração Top 5/10, recorrência e Pareto de clientes" },
  { id: "descontos", label: "Descontos & Margem", icone: Percent, cor: "text-rose-500", desc: "Taxa de desconto por vendedor e por departamento" },
  { id: "sazonalidade", label: "Sazonalidade & Dias", icone: CalendarDays, cor: "text-indigo-500", desc: "Vendas por dia da semana e comparativo quinzenal" },
  { id: "departamentos", label: "Departamentos & Mix", icone: Layers, cor: "text-blue-500", desc: "Faturamento por categoria com itens detalhados" },
  { id: "vendedores", label: "Equipe de Vendedores", icone: Users, cor: "text-violet-500", desc: "Ranking de consultores, ticket médio e descontos" },
  { id: "geografico", label: "Cidades & Praças", icone: MapPin, cor: "text-teal-500", desc: "Geolocalização, clientes atendidos e frete rateado" },
  { id: "financeiro", label: "Financeiro & Fiscal", icone: CreditCard, cor: "text-orange-500", desc: "Formas de pagamento, NF-e vs NFC-e e ICMS-ST" },
];

export function RelatoriosView({
  empresas,
  empresaInicial,
  abaInicial,
  initialPeriod,
  initialVendas = [],
  initialPeriodoAnterior,
  initialVendasAnteriores = [],
  initialError,
}: Props) {
  const [empresaId] = useState(
    empresaInicial === "todas" ||
    (empresaInicial && empresas.some((empresa) => empresa.id === empresaInicial))
      ? empresaInicial
      : (empresas[0]?.id ?? ""),
  );


  const [periodo, setPeriodo] = useState<Periodo>(
    initialPeriod ?? periodoMesAtual(),
  );
  const [periodoAnterior, setPeriodoAnterior] = useState<{ inicial: string; final: string } | null>(
    initialPeriodoAnterior ??
      (initialPeriod ? calcularPeriodoAnterior(initialPeriod.inicial, initialPeriod.final) : null),
  );
  const { vendas, vendasAnteriores, erro, loading, consultar: consultarVendas } =
    useConsultaVendas(initialVendas, initialError, initialVendasAnteriores);
  const [abaAtiva] = useState(abaInicial || "curva-abc");
  const relatorioAtivo = useMemo(
    () => relatoriosOpcoes.find((relatorio) => relatorio.id === abaAtiva),
    [abaAtiva],
  );

  // Comparativo do período (métricas centrais) — infraestrutura já usada no Dashboard.
  const variacoesPeriodo = useMemo(
    () => calcularVariacoesPeriodo(vendas, vendasAnteriores),
    [vendas, vendasAnteriores],
  );
  const rotuloPeriodoAnterior = useMemo(() => {
    if (!periodoAnterior?.inicial || !periodoAnterior?.final) return undefined;
    return `${formatarDataInputParaBR(periodoAnterior.inicial)} a ${formatarDataInputParaBR(periodoAnterior.final)}`;
  }, [periodoAnterior]);

  // Análise de clientes novos vs. recorrentes (exclui consumidor de balcão)
  const clientesNovosRecorrentes = useMemo(
    () => analiseClientesNovosRecorrentes(vendas, vendasAnteriores),
    [vendas, vendasAnteriores],
  );

  // Frequência média de compra: pedidos no período ÷ clientes cadastrados ativos
  const metricasBaseClientes = useMemo(() => {
    if (abaAtiva !== "clientes") return null;
    const resumo = resumoVendas(vendas);
    const ativosCadastrados = Math.max(1, clientesNovosRecorrentes.ativosAtual);
    return {
      pedidosNoPeriodo: resumo.notas,
      frequenciaMediaPedidosPorCliente: resumo.notas / ativosCadastrados,
    };
  }, [abaAtiva, vendas, clientesNovosRecorrentes]);

  // Produtos em alta vs. período anterior (comparáveis nos dois períodos)
  const produtosEmAlta = useMemo(
    () => maioresCrescimentosProdutos(vendas, vendasAnteriores, 5),
    [vendas, vendasAnteriores],
  );

  // Filtros internos
  const [busca, setBusca] = useState("");
  const [filtroClasseAbc, setFiltroClasseAbc] = useState<"todas" | "A" | "B" | "C">("todas");
  const [filtroClasseCli, setFiltroClasseCli] = useState<"todas" | "A" | "B" | "C">("todas");

  const empresaAtual = useMemo(
    () => empresas.find((e) => e.id === empresaId),
    [empresas, empresaId],
  );

  // Cálculos analíticos otimizados com Lazy Memoization por aba ativa
  const relatorioABC = useMemo(() => {
    if (abaAtiva !== "curva-abc") {
      return {
        itens: [],
        faturamentoTotal: 0,
        totalItens: 0,
        resumoA: { faturamento: 0, itens: 0, percentualFaturamento: 0, percentualItens: 0 },
        resumoB: { faturamento: 0, itens: 0, percentualFaturamento: 0, percentualItens: 0 },
        resumoC: { faturamento: 0, itens: 0, percentualFaturamento: 0, percentualItens: 0 },
      };
    }
    return calcularCurvaABC(vendas);
  }, [vendas, abaAtiva]);

  const relatorioDeptos = useMemo(() => {
    if (abaAtiva !== "departamentos") return [];
    return analiseDepartamentos(vendas);
  }, [vendas, abaAtiva]);

  const relatorioVendedores = useMemo(() => {
    if (abaAtiva !== "vendedores") return [];
    return analiseVendedores(vendas);
  }, [vendas, abaAtiva]);

  const relatorioClientes = useMemo(() => {
    if (abaAtiva !== "clientes") {
      return {
        itens: [],
        totalClientes: 0,
        clientesRecorrentes: 0,
        clientesPontuais: 0,
        taxaRecorrencia: 0,
        concentracaoTop5: 0,
        concentracaoTop10: 0,
        ticketMedioPorCliente: 0,
      };
    }
    return analiseClientes(vendas);
  }, [vendas, abaAtiva]);

  // Concentração Top 10/Top 20 de clientes e produtos (Pareto de dependência)
  const concentracaoClientesTop20 = useMemo(
    () => (abaAtiva === "clientes" ? concentracaoTopN(relatorioClientes.itens, 20) : null),
    [abaAtiva, relatorioClientes],
  );
  const concentracaoProdutosTop20 = useMemo(
    () =>
      abaAtiva === "curva-abc"
        ? concentracaoTopN(relatorioABC.itens.map((item) => ({ faturamento: item.total })), 20)
        : null,
    [abaAtiva, relatorioABC],
  );

  const relatorioDescontos = useMemo(() => {
    if (abaAtiva !== "descontos") {
      return {
        descontoTotal: 0,
        faturamentoBruto: 0,
        faturamentoLiquido: 0,
        taxaDescontoGlobal: 0,
        porVendedor: [],
        porDepartamento: [],
        porCliente: [],
      };
    }
    return analiseDescontos(vendas);
  }, [vendas, abaAtiva]);

  const relatorioSazonalidade = useMemo(() => {
    if (abaAtiva !== "sazonalidade") {
      return { porDiaSemana: [], porQuinzena: [] };
    }
    return analiseSazonalidade(vendas);
  }, [vendas, abaAtiva]);

  const relatorioGeografico = useMemo(() => {
    if (abaAtiva !== "geografico") return [];
    return analiseGeografica(vendas);
  }, [vendas, abaAtiva]);

  const relatorioFinanceiro = useMemo(() => {
    if (abaAtiva !== "financeiro") {
      return {
        formasPagamento: [],
        modelosDocumento: [],
        totaisFrete: 0,
        totaisIcmsSt: 0,
        totaisSeguro: 0,
        totaisOutros: 0,
      };
    }
    return analiseFinanceira(vendas);
  }, [vendas, abaAtiva]);

  // Itens ABC filtrados
  const itensAbcFiltrados = useMemo(() => {
    return relatorioABC.itens.filter((item) => {
      if (filtroClasseAbc !== "todas" && item.classe !== filtroClasseAbc) {
        return false;
      }
      if (busca.trim()) {
        const termo = busca.toLowerCase().trim();
        return (
          item.produto.toLowerCase().includes(termo) ||
          item.id.toLowerCase().includes(termo) ||
          item.departamento.toLowerCase().includes(termo)
        );
      }
      return true;
    });
  }, [relatorioABC.itens, filtroClasseAbc, busca]);

  // Clientes filtrados
  const clientesFiltrados = useMemo(() => {
    return relatorioClientes.itens.filter((item) => {
      if (filtroClasseCli !== "todas" && item.classe !== filtroClasseCli) {
        return false;
      }
      if (busca.trim()) {
        const termo = busca.toLowerCase().trim();
        return (
          item.nome.toLowerCase().includes(termo) ||
          item.cidade.toLowerCase().includes(termo) ||
          item.uf.toLowerCase().includes(termo)
        );
      }
      return true;
    });
  }, [relatorioClientes.itens, filtroClasseCli, busca]);

  // Vendedores filtrados
  const vendedoresFiltrados = useMemo(() => {
    if (!busca.trim()) return relatorioVendedores;
    const termo = busca.toLowerCase().trim();
    return relatorioVendedores.filter(
      (v) =>
        v.nome.toLowerCase().includes(termo) ||
        (v.principalProduto && v.principalProduto.toLowerCase().includes(termo)),
    );
  }, [relatorioVendedores, busca]);

  // Departamentos filtrados
  const deptosFiltrados = useMemo(() => {
    if (!busca.trim()) return relatorioDeptos;
    const termo = busca.toLowerCase().trim();
    return relatorioDeptos.filter((d) => d.nome.toLowerCase().includes(termo));
  }, [relatorioDeptos, busca]);

  // Cidades filtradas
  const cidadesFiltradas = useMemo(() => {
    if (!busca.trim()) return relatorioGeografico;
    const termo = busca.toLowerCase().trim();
    return relatorioGeografico.filter(
      (c) =>
        c.cidade.toLowerCase().includes(termo) ||
        c.uf.toLowerCase().includes(termo),
    );
  }, [relatorioGeografico, busca]);

  async function consultar() {
    const proximoAnterior = calcularPeriodoAnterior(periodo.inicial, periodo.final);
    setPeriodoAnterior(proximoAnterior);
    try {
      await consultarVendas({
        empresaId,
        periodo,
        periodoAnterior: proximoAnterior,
        forcarAtualizacao: true,
      });
      toast.success("Dados de relatórios atualizados com sucesso!");
    } catch {
      toast.error("Não foi possível carregar os relatórios.");
    }
  }

  function exportarCsvRelatorio() {
    if (vendas.length === 0) {
      toast.error("Não há dados para exportar no período selecionado.");
      return;
    }

    let nomeArquivo = "relatorio";
    let cabecalho: string[] = [];
    let linhas: (string | number)[][] = [];

    if (abaAtiva === "curva-abc") {
      nomeArquivo = "relatorio-curva-abc";
      cabecalho = [
        "Classe",
        "Código",
        "Descrição do Produto",
        "Departamento",
        "Unidade",
        "Qtd Vendida",
        "Preço Médio",
        "Total Faturado",
        "% Faturamento",
        "% Acumulado",
      ];
      linhas = itensAbcFiltrados.map((item) => [
        item.classe,
        item.id,
        item.produto,
        item.departamento,
        item.un,
        item.quantidade,
        item.precoMedio.toFixed(2),
        item.total.toFixed(2),
        `${item.percentual.toFixed(2)}%`,
        `${item.percentualAcumulado.toFixed(2)}%`,
      ]);
    } else if (abaAtiva === "clientes") {
      nomeArquivo = "relatorio-clientes-concentracao";
      cabecalho = [
        "Classe",
        "Razão Social / Nome",
        "Cidade",
        "UF",
        "Pedidos / NF",
        "Qtd Itens",
        "Ticket Médio",
        "Total Descontos",
        "Total Faturado",
        "% Faturamento",
        "% Acumulado",
      ];
      linhas = clientesFiltrados.map((c) => [
        c.classe,
        c.nome,
        c.cidade,
        c.uf,
        c.pedidos,
        c.quantidadeItens,
        c.ticketMedio.toFixed(2),
        c.descontos.toFixed(2),
        c.faturamento.toFixed(2),
        `${c.percentual.toFixed(2)}%`,
        `${c.percentualAcumulado.toFixed(2)}%`,
      ]);
    } else if (abaAtiva === "departamentos") {
      nomeArquivo = "relatorio-departamentos";
      cabecalho = [
        "Departamento",
        "Produtos Distintos (SKUs)",
        "Qtd Itens",
        "Ticket Médio / Item",
        "Faturamento Total",
        "% Participação",
      ];
      linhas = deptosFiltrados.map((d) => [
        d.nome,
        d.quantidadeProdutosDistintos,
        d.quantidadeItens,
        d.ticketMedioPorItem.toFixed(2),
        d.faturamento.toFixed(2),
        `${d.percentual.toFixed(2)}%`,
      ]);
    } else if (abaAtiva === "vendedores") {
      nomeArquivo = "relatorio-equipe-vendedores";
      cabecalho = [
        "Vendedor",
        "Faturamento Total",
        "% Participação",
        "Pedidos / NF",
        "Clientes Únicos",
        "Qtd Itens",
        "Ticket Médio",
        "Desconto Concedido",
        "Taxa Desconto",
        "Principal Produto",
      ];
      linhas = vendedoresFiltrados.map((v) => [
        v.nome,
        v.faturamento.toFixed(2),
        `${v.percentual.toFixed(2)}%`,
        v.pedidos,
        v.clientes,
        v.quantidadeItens,
        v.ticketMedio.toFixed(2),
        v.descontoConcedido.toFixed(2),
        `${v.taxaDesconto.toFixed(2)}%`,
        v.principalProduto ?? "—",
      ]);
    } else if (abaAtiva === "geografico") {
      nomeArquivo = "relatorio-geografico-pracas";
      cabecalho = [
        "Cidade",
        "UF",
        "Faturamento Total",
        "Frete Rateado",
        "% Faturamento",
        "Pedidos / NF",
        "Clientes Atendidos",
        "Ticket Médio",
      ];
      linhas = cidadesFiltradas.map((c) => [
        c.cidade,
        c.uf,
        c.faturamento.toFixed(2),
        c.frete.toFixed(2),
        `${c.percentual.toFixed(2)}%`,
        c.pedidos,
        c.clientes,
        c.ticketMedio.toFixed(2),
      ]);
    } else if (abaAtiva === "financeiro") {
      nomeArquivo = "relatorio-formas-pagamento-fiscal";
      cabecalho = ["Tipo / Descrição", "Faturamento Total", "% Participação", "Pedidos / NF", "Ticket Médio"];
      linhas = [
        ...relatorioFinanceiro.formasPagamento.map((fp) => [
          `Forma: ${fp.nome}`,
          fp.total.toFixed(2),
          `${fp.percentual.toFixed(2)}%`,
          fp.pedidos,
          fp.ticketMedio.toFixed(2),
        ]),
        ...relatorioFinanceiro.modelosDocumento.map((m) => [
          `Documento: ${m.nome}`,
          m.total.toFixed(2),
          `${m.percentual.toFixed(2)}%`,
          m.pedidos,
          m.ticketMedio.toFixed(2),
        ]),
      ];
    }

    exportarParaCSV(`${nomeArquivo}-${new Date().toISOString().slice(0, 10)}`, cabecalho, linhas);
    toast.success("Arquivo CSV gerado com sucesso!");
  }

  async function handleExportarPdf(modo: "download" | "imprimir" = "download") {
    if (vendas.length === 0) {
      toast.error("Não há dados para exportar no período selecionado.");
      return;
    }

    const titulo = relatorioAtivo?.label ?? "Relatório Analítico";

    const contexto = {
      empresaNome:
        empresaId === "todas"
          ? "Todas as Empresas (Consolidado)"
          : (empresaAtual?.razaoSocial ?? "Empresa Selecionada"),
      cnpj: empresaId === "todas" ? undefined : empresaAtual?.cnpj,
      periodo,
    };

    let colunas: string[] = [];
    let linhas: (string | number)[][] = [];

    if (abaAtiva === "curva-abc") {
      colunas = ["Classe", "Código", "Descrição do Produto", "Depto", "Qtd", "Total", "Preço Médio", "%"];
      linhas = itensAbcFiltrados.map((item) => [
        item.classe,
        item.id,
        item.produto,
        item.departamento,
        formatarNumero(item.quantidade, 2),
        formatarMoeda(item.total),
        formatarMoeda(item.precoMedio),
        formatarPercentual(item.percentual, 1),
      ]);
    } else if (abaAtiva === "clientes") {
      colunas = ["Classe", "Razão Social / Cliente", "Cidade/UF", "Pedidos", "Faturamento", "Ticket Médio", "%"];
      linhas = clientesFiltrados.map((c) => [
        c.classe,
        c.nome,
        [c.cidade, c.uf].filter(Boolean).join("/"),
        c.pedidos,
        formatarMoeda(c.faturamento),
        formatarMoeda(c.ticketMedio),
        formatarPercentual(c.percentual, 1),
      ]);
    } else if (abaAtiva === "vendedores") {
      colunas = ["Vendedor", "Faturamento", "% Part.", "Pedidos", "Clientes", "Itens", "Ticket Médio", "% Desc."];
      linhas = vendedoresFiltrados.map((v) => [
        v.nome,
        formatarMoeda(v.faturamento),
        formatarPercentual(v.percentual, 1),
        v.pedidos,
        v.clientes,
        formatarNumero(v.quantidadeItens, 2),
        formatarMoeda(v.ticketMedio),
        formatarPercentual(v.taxaDesconto, 1),
      ]);
    } else if (abaAtiva === "departamentos") {
      colunas = ["Departamento", "Faturamento", "% Part.", "Qtd Itens", "SKUs Distintos", "Preço Médio"];
      linhas = deptosFiltrados.map((d) => [
        d.nome,
        formatarMoeda(d.faturamento),
        formatarPercentual(d.percentual, 1),
        formatarNumero(d.quantidadeItens, 2),
        d.quantidadeProdutosDistintos,
        formatarMoeda(d.ticketMedioPorItem),
      ]);
    } else if (abaAtiva === "geografico") {
      colunas = ["Cidade", "UF", "Faturamento Total", "Frete Rateado", "% Faturamento", "Pedidos", "Ticket Médio"];
      linhas = cidadesFiltradas.map((c) => [
        c.cidade,
        c.uf,
        formatarMoeda(c.faturamento),
        formatarMoeda(c.frete),
        formatarPercentual(c.percentual, 1),
        c.pedidos,
        formatarMoeda(c.ticketMedio),
      ]);
    } else {
      colunas = ["Descrição", "Faturamento Total", "% Participação", "Pedidos", "Ticket Médio"];
      linhas = relatorioFinanceiro.formasPagamento.map((fp) => [
        fp.nome,
        formatarMoeda(fp.total),
        formatarPercentual(fp.percentual, 1),
        fp.pedidos,
        formatarMoeda(fp.ticketMedio),
      ]);
    }

    await exportarPdfAnalitico({
      titulo,
      contexto,
      colunas,
      linhas,
      modo,
    });
    if (modo === "download") {
      toast.success(`Relatório em PDF de ${titulo} gerado com sucesso!`);
    } else {
      toast.success(`Preparando impressão de ${titulo}...`);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Painel Superior de Período & Filtros */}
      <Card className="no-print border-border/60 shadow-sm backdrop-blur-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <BarChart3 className="size-5 text-primary" />
                <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                  {empresaId === "todas" ? "Central de Relatórios (Consolidado)" : "Central de Relatórios"}
                </CardTitle>
                {empresaId === "todas" && (
                  <Badge className="bg-primary/15 text-primary border border-primary/30 text-xs font-bold gap-1 px-2.5 py-0.5">
                    <Building2 className="size-3.5" />
                    <span>Visão Consolidada ({empresas.length} Empresas)</span>
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                {empresaId === "todas"
                  ? `Análise consolidada de ${empresas.length} empresas: Curva ABC, Clientes, Descontos, Sazonalidade, Departamentos e Vendedores.`
                  : "Análise estruturada de Curva ABC, Clientes, Descontos, Sazonalidade, Departamentos, Vendedores e Fiscal."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="border-t border-border/60 pt-4">
          <DateRangeFilter
            value={periodo}
            onChange={setPeriodo}
            onConsultar={consultar}
            loading={loading}
          />
        </CardContent>
      </Card>

      {erro ? (
        <FeedbackState
          variant="error"
          title="Não foi possível atualizar os relatórios"
          description={erro}
          onRetry={consultar}
        />
      ) : null}

      {/* Card Principal do Relatório Executivo */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Título Estático & Descrição do Relatório Ativo */}
            <div className="flex items-center gap-3">
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/80 shadow-2xs ${
                  relatorioAtivo?.cor ?? "text-primary"
                }`}
              >
                {(() => {
                  const IconeOp =
                    relatorioAtivo?.icone ?? Sparkles;
                  return <IconeOp className="size-4.5" />;
                })()}
              </div>
              <div className="flex flex-col">
                <span className="text-base font-extrabold text-foreground tracking-tight">
                  {relatorioAtivo?.label ?? "Relatório Analítico"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {relatorioAtivo?.desc}
                </span>
              </div>
            </div>

            {/* Ações da Direita: Busca + Filtros de Classe + Exportação */}
            <div className="no-print flex flex-wrap items-center gap-2">
              <div className="relative min-w-[170px] sm:min-w-[210px]">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Pesquisar registros..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="h-8 w-full rounded-md border bg-background pl-8 pr-7 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
                {busca && (
                  <button
                    onClick={() => setBusca("")}
                    aria-label="Limpar busca"
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {abaAtiva === "curva-abc" && (
                <div className="flex items-center gap-1">
                  {(["todas", "A", "B", "C"] as const).map((cls) => (
                    <Button
                      key={cls}
                      size="sm"
                      variant={filtroClasseAbc === cls ? "default" : "outline"}
                      onClick={() => setFiltroClasseAbc(cls)}
                      className="h-8 px-2 text-xs font-bold"
                    >
                      {cls === "todas" ? "Todas" : `Classe ${cls}`}
                    </Button>
                  ))}
                </div>
              )}

              {abaAtiva === "clientes" && (
                <div className="flex items-center gap-1">
                  {(["todas", "A", "B", "C"] as const).map((cls) => (
                    <Button
                      key={cls}
                      size="sm"
                      variant={filtroClasseCli === cls ? "default" : "outline"}
                      onClick={() => setFiltroClasseCli(cls)}
                      className="h-8 px-2 text-xs font-bold"
                    >
                      {cls === "todas" ? "Todas" : `Classe ${cls}`}
                    </Button>
                  ))}
                </div>
              )}

              <ExportDropdown
                onExportarPdf={() => handleExportarPdf("download")}
                onExportarCsv={exportarCsvRelatorio}
                onImprimir={() => handleExportarPdf("imprimir")}
                disabled={loading || vendas.length === 0}
                label="Exportar"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          ) : vendas.length === 0 ? (
            <FeedbackState
              variant="empty"
              title="Nenhuma venda encontrada"
              description="Ajuste o período ou selecione outra empresa para consultar os relatórios."
              onRetry={consultar}
              retryLabel="Consultar novamente"
            />
          ) : (
            <>
              {/* Panorama do período: variações vs. período anterior (métricas explicadas) */}
              <PanoramaPeriodo
                variacoes={variacoesPeriodo}
                rotuloPeriodoAnterior={rotuloPeriodoAnterior}
              />

              <div className="border-t border-border/60" />

              {/* Renderização condicional da aba ativa através de componentes modulares */}
              {abaAtiva === "curva-abc" && (
                <AbaCurvaABC
                  relatorioABC={relatorioABC}
                  itensFiltrados={itensAbcFiltrados}
                  concentracaoTop10={concentracaoProdutosTop20 ? concentracaoTopN(relatorioABC.itens.map((item) => ({ faturamento: item.total })), 10) : null}
                  concentracaoTop20={concentracaoProdutosTop20}
                  produtosEmAlta={produtosEmAlta}
                  temPeriodoAnterior={vendasAnteriores.length > 0}
                />
              )}

              {abaAtiva === "clientes" && (
                <AbaClientes
                  relatorioClientes={relatorioClientes}
                  clientesFiltrados={clientesFiltrados}
                  concentracaoTop20={concentracaoClientesTop20}
                  novosRecorrentes={clientesNovosRecorrentes}
                  temPeriodoAnterior={vendasAnteriores.length > 0}
                  frequenciaMediaPedidosPorCliente={metricasBaseClientes?.frequenciaMediaPedidosPorCliente}
                  pedidosNoPeriodo={metricasBaseClientes?.pedidosNoPeriodo}
                />
              )}

              {abaAtiva === "descontos" && (
                <AbaDescontos relatorioDescontos={relatorioDescontos} />
              )}

              {abaAtiva === "sazonalidade" && (
                <AbaSazonalidade relatorioSazonalidade={relatorioSazonalidade} />
              )}

              {abaAtiva === "departamentos" && (
                <AbaDepartamentos deptosFiltrados={deptosFiltrados} />
              )}

              {abaAtiva === "vendedores" && (
                <AbaVendedores vendedoresFiltrados={vendedoresFiltrados} />
              )}

              {abaAtiva === "geografico" && (
                <AbaGeografico cidadesFiltradas={cidadesFiltradas} />
              )}

              {abaAtiva === "financeiro" && (
                <AbaFinanceiro relatorioFinanceiro={relatorioFinanceiro} />
              )}

              {/* Ajuda consolidada no final do relatório ativo */}
              {GUIAS_RELATORIOS[abaAtiva] ? (
                <GlossarioRelatorio
                  itens={GUIAS_RELATORIOS[abaAtiva].glossario ?? []}
                  guia={GUIAS_RELATORIOS[abaAtiva]}
                  relatorioLabel={
                    relatorioAtivo?.label ?? ""
                  }
                />
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
