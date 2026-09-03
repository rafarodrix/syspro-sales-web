"use client";

import { useState, useMemo, useEffect } from "react";
import {
  BarChart3,
  DownloadIcon,
  PrinterIcon,
  Search,
  X,
  Layers,
  Users,
  MapPin,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Percent,
  CalendarDays,
  UserCheck,
  TrendingDown,
  Truck,
  ShieldCheck,
  Building2,
  FileText,
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
  dataInputParaSyspro,
  formatarDataInputParaBR,
  type ItemCurvaABC,
} from "@/lib/vendas";
import {
  DateRangeFilter,
  periodoMesAtual,
  type Periodo,
} from "@/components/date-range-filter";
import { buscarVendasApi } from "@/lib/vendas-client";
import { exportarPdfAnalitico } from "@/lib/pdf-export";
import { PainelComoLer, GlossarioRelatorio, GUIAS_RELATORIOS } from "@/components/relatorio-guia";
import {
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
} from "@/lib/formatters";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
  initialError,
}: Props) {
  const [empresaId, setEmpresaId] = useState(
    empresaInicial === "todas" ||
    (empresaInicial && empresas.some((empresa) => empresa.id === empresaInicial))
      ? empresaInicial
      : (empresas[0]?.id ?? ""),
  );

  useEffect(() => {
    if (empresaInicial) {
      setEmpresaId(empresaInicial);
    }
  }, [empresaInicial]);

  const [periodo, setPeriodo] = useState<Periodo>(
    initialPeriod ?? periodoMesAtual(),
  );
  const [loading, setLoading] = useState(false);
  const [vendas, setVendas] = useState<(VendaProduto | VendaComEmpresa)[]>(initialVendas);
  const [erro, setErro] = useState<string | null>(initialError ?? null);
  const [abaAtiva, setAbaAtiva] = useState(abaInicial || "curva-abc");

  // Filtros internos
  const [busca, setBusca] = useState("");
  const [filtroClasseAbc, setFiltroClasseAbc] = useState<"todas" | "A" | "B" | "C">("todas");
  const [filtroClasseCli, setFiltroClasseCli] = useState<"todas" | "A" | "B" | "C">("todas");
  const [departamentoAberto, setDepartamentoAberto] = useState<string | null>(null);

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
  }, [relatorioABC, filtroClasseAbc, busca]);

  // Clientes filtrados
  const clientesFiltrados = useMemo(() => {
    return relatorioClientes.itens.filter((c) => {
      if (filtroClasseCli !== "todas" && c.classe !== filtroClasseCli) {
        return false;
      }
      if (busca.trim()) {
        const termo = busca.toLowerCase().trim();
        return (
          c.nome.toLowerCase().includes(termo) ||
          c.cidade.toLowerCase().includes(termo) ||
          c.uf.toLowerCase().includes(termo)
        );
      }
      return true;
    });
  }, [relatorioClientes, filtroClasseCli, busca]);

  // Departamentos filtrados
  const deptosFiltrados = useMemo(() => {
    if (!busca.trim()) return relatorioDeptos;
    const termo = busca.toLowerCase().trim();
    return relatorioDeptos.filter(
      (d) =>
        d.nome.toLowerCase().includes(termo) ||
        d.produtos.some((p) => p.produto.toLowerCase().includes(termo) || p.id.toLowerCase().includes(termo)),
    );
  }, [relatorioDeptos, busca]);

  // Vendedores filtrados
  const vendedoresFiltrados = useMemo(() => {
    if (!busca.trim()) return relatorioVendedores;
    const termo = busca.toLowerCase().trim();
    return relatorioVendedores.filter((v) => v.nome.toLowerCase().includes(termo));
  }, [relatorioVendedores, busca]);

  // Cidades filtradas
  const cidadesFiltradas = useMemo(() => {
    if (!busca.trim()) return relatorioGeografico;
    const termo = busca.toLowerCase().trim();
    return relatorioGeografico.filter(
      (g) => g.cidade.toLowerCase().includes(termo) || g.uf.toLowerCase().includes(termo),
    );
  }, [relatorioGeografico, busca]);

  async function consultar(periodoDaConsulta = periodo) {
    if (!empresaId || !periodoDaConsulta.inicial || !periodoDaConsulta.final) {
      toast.error("Preencha o período de consulta");
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const dados = await buscarVendasApi(empresaId, periodoDaConsulta);
      setVendas(dados);
      toast.success("Relatórios atualizados com sucesso!");
    } catch (causa) {
      const mensagem =
        causa instanceof Error ? causa.message : "Erro ao carregar dados.";
      setErro(mensagem);
      toast.error(mensagem);
    } finally {
      setLoading(false);
    }
  }

  function exportarCsvRelatorio() {
    let cabecalho: string[] = [];
    let linhas: (string | number)[][] = [];
    let nomeArquivo = "relatorio-syspro";

    if (abaAtiva === "curva-abc") {
      nomeArquivo = "relatorio-curva-abc-produtos";
      cabecalho = [
        "Classe",
        "Código",
        "Produto",
        "Departamento",
        "Unidade",
        "Qtd Vendida",
        "Preço Médio",
        "Faturamento Total",
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
      nomeArquivo = "relatorio-curva-abc-clientes";
      cabecalho = [
        "Classe",
        "Cliente",
        "Cidade",
        "UF",
        "Pedidos",
        "Qtd Itens",
        "Ticket Médio",
        "Faturamento Total",
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
        c.faturamento.toFixed(2),
        `${c.percentual.toFixed(2)}%`,
        `${c.percentualAcumulado.toFixed(2)}%`,
      ]);
    } else if (abaAtiva === "descontos") {
      nomeArquivo = "relatorio-descontos-comerciais";
      cabecalho = ["Categoria/Entidade", "Nome", "Faturamento Bruto", "Faturamento Líquido", "Desconto Concedido", "% Taxa Desconto"];
      linhas = [
        ...relatorioDescontos.porVendedor.map((v) => ["Vendedor", v.nome, v.faturamentoBruto.toFixed(2), v.faturamentoLiquido.toFixed(2), v.desconto.toFixed(2), `${v.taxaDesconto.toFixed(2)}%`]),
        ...relatorioDescontos.porDepartamento.map((d) => ["Departamento", d.nome, d.faturamentoBruto.toFixed(2), d.faturamentoLiquido.toFixed(2), d.desconto.toFixed(2), `${d.taxaDesconto.toFixed(2)}%`]),
        ...relatorioDescontos.porCliente.map((c) => ["Cliente", c.nome, c.faturamentoBruto.toFixed(2), c.faturamentoLiquido.toFixed(2), c.desconto.toFixed(2), `${c.taxaDesconto.toFixed(2)}%`]),
      ];
    } else if (abaAtiva === "sazonalidade") {
      nomeArquivo = "relatorio-sazonalidade-temporal";
      cabecalho = ["Tipo", "Período / Dia", "Faturamento Total", "Pedidos / NF", "Ticket Médio", "% Representatividade"];
      linhas = [
        ...relatorioSazonalidade.porDiaSemana.map((d) => ["Dia da Semana", d.dia, d.faturamento.toFixed(2), d.pedidos, d.ticketMedio.toFixed(2), `${d.percentual.toFixed(2)}%`]),
        ...relatorioSazonalidade.porQuinzena.map((q) => ["Quinzena", q.quinzena, q.faturamento.toFixed(2), q.pedidos, q.ticketMedio.toFixed(2), `${q.percentual.toFixed(2)}%`]),
      ];
    } else if (abaAtiva === "departamentos") {
      nomeArquivo = "relatorio-departamentos-itens";
      cabecalho = [
        "Departamento",
        "Código Produto",
        "Produto",
        "Unidade",
        "Qtd Vendida",
        "Preço Médio",
        "Total Faturado",
        "% Participação no Depto",
      ];
      linhas = [];
      for (const d of deptosFiltrados) {
        for (const p of d.produtos) {
          linhas.push([
            d.nome,
            p.id,
            p.produto,
            p.un,
            p.quantidade,
            p.precoMedio.toFixed(2),
            p.total.toFixed(2),
            `${p.percentual.toFixed(2)}%`,
          ]);
        }
      }
    } else if (abaAtiva === "vendedores") {
      nomeArquivo = "relatorio-equipe-vendedores";
      cabecalho = [
        "Vendedor",
        "Faturamento Total",
        "% Faturamento",
        "Pedidos / NF",
        "Clientes Atendidos",
        "Qtd Itens",
        "Ticket Médio",
        "Desconto Concedido",
        "% Desconto",
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

    const csv = [cabecalho, ...linhas]
      .map((linha) =>
        linha
          .map((valor) => `"${String(valor ?? "").replaceAll('"', '""')}"`)
          .join(";"),
      )
      .join("\n");

    const arquivo = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${nomeArquivo}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo CSV gerado com sucesso!");
  }

  function handleExportarPdf() {
    if (vendas.length === 0) {
      toast.error("Não há dados para exportar no período selecionado.");
      return;
    }

    const op = relatoriosOpcoes.find((r) => r.id === abaAtiva);
    const titulo = op ? op.label : "Relatório Analítico";

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

    exportarPdfAnalitico({
      titulo,
      contexto,
      colunas,
      linhas,
    });
    toast.success(`Relatório em PDF de ${titulo} gerado com sucesso!`);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header de Impressão */}
      <div className="print-only mb-4 border-b pb-3">
        <h1 className="text-xl font-bold uppercase tracking-wide text-black">
          Relatórios Analíticos de Vendas — Syspro ERP
        </h1>
        <p className="text-xs text-slate-700">
          Empresa: {empresaAtual?.razaoSocial ?? "Empresa"} | CNPJ: {empresaAtual?.cnpj} | Período:{" "}
          {formatarDataInputParaBR(periodo.inicial)} a {formatarDataInputParaBR(periodo.final)}
        </p>
      </div>

      {/* Painel Superior de Período & Filtros */}
      <Card className="no-print border-border/60 shadow-sm backdrop-blur-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <BarChart3 className="size-5 text-primary" />
                <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                  {empresaId === "todas" ? "Central de Relatórios (Consolidado)" : "Central de Relatórios & Inteligência"}
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
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 text-sm font-medium text-destructive">
            {erro}
          </CardContent>
        </Card>
      ) : null}

      {/* Card Principal do Relatório Executivo */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Seletor Dinâmico do Relatório Ativo */}
            <div className="flex items-center gap-2.5">
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/80 ${
                  relatoriosOpcoes.find((r) => r.id === abaAtiva)?.cor ?? "text-primary"
                }`}
              >
                {(() => {
                  const IconeOp =
                    relatoriosOpcoes.find((r) => r.id === abaAtiva)?.icone ?? Sparkles;
                  return <IconeOp className="size-4" />;
                })()}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <Select
                    value={abaAtiva}
                    onValueChange={(v) => {
                      setAbaAtiva(v);
                      setBusca("");
                      setFiltroClasseAbc("todas");
                      setFiltroClasseCli("todas");
                      const url = new URL(window.location.href);
                      url.searchParams.set("aba", v);
                      window.history.replaceState({}, "", url.toString());
                    }}
                  >
                    <SelectTrigger className="h-7 border-none bg-transparent p-0 text-sm font-extrabold text-foreground shadow-none hover:bg-muted/40 px-1.5 rounded-md cursor-pointer">
                      <SelectValue placeholder="Selecione o relatório" />
                    </SelectTrigger>
                    <SelectContent>
                      {relatoriosOpcoes.map((op) => {
                        const IconeOp = op.icone;
                        return (
                          <SelectItem key={op.id} value={op.id} className="text-xs font-semibold">
                            <div className="flex items-center gap-2">
                              <IconeOp className={`size-3.5 ${op.cor}`} />
                              <span>{op.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {relatoriosOpcoes.find((r) => r.id === abaAtiva)?.desc}
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

              <Button
                onClick={handleExportarPdf}
                disabled={loading || vendas.length === 0}
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs font-semibold text-primary"
                title="Exportar Relatório Analítico em PDF"
              >
                <FileText className="size-3.5" />
                Exportar PDF
              </Button>
              <Button
                onClick={exportarCsvRelatorio}
                disabled={loading || vendas.length === 0}
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs font-semibold"
                title="Exportar Dados em CSV"
              >
                <DownloadIcon className="size-3.5" />
                Exportar CSV
              </Button>
              <Button
                onClick={() => window.print()}
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                <PrinterIcon className="size-3.5" />
                Imprimir
              </Button>
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
            <div className="py-12 text-center text-xs text-muted-foreground">
              Nenhuma venda encontrada para o período selecionado.
            </div>
          ) : (
            <>
              {/* Painel "Como ler" — explicação do relatório ativo */}
              <PainelComoLer relatorioId={abaAtiva} />

              {/* ========================================================= */}
              {/* ABA 1: CURVA ABC DE PRODUTOS */}
              {/* ========================================================= */}
              {abaAtiva === "curva-abc" && (
                <div className="space-y-4">
                  {/* Cards Síntese ABC (Pareto) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-emerald-600 font-bold text-white">Classe A</Badge>
                        <span className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          {formatarPercentual(relatorioABC.resumoA.percentualFaturamento, 1)} Faturamento
                        </span>
                      </div>
                      <div className="mt-2 font-mono font-extrabold text-lg text-emerald-950 dark:text-emerald-200">
                        {formatarMoeda(relatorioABC.resumoA.faturamento)}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {relatorioABC.resumoA.itens} itens ({formatarPercentual(relatorioABC.resumoA.percentualItens, 1)} do catálogo)
                      </div>
                    </div>

                    <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3.5">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-blue-600 font-bold text-white">Classe B</Badge>
                        <span className="font-mono text-xs font-bold text-blue-800 dark:text-blue-300">
                          {formatarPercentual(relatorioABC.resumoB.percentualFaturamento, 1)} Faturamento
                        </span>
                      </div>
                      <div className="mt-2 font-mono font-extrabold text-lg text-blue-950 dark:text-blue-200">
                        {formatarMoeda(relatorioABC.resumoB.faturamento)}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {relatorioABC.resumoB.itens} itens ({formatarPercentual(relatorioABC.resumoB.percentualItens, 1)} do catálogo)
                      </div>
                    </div>

                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-amber-600 font-bold text-white">Classe C</Badge>
                        <span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-300">
                          {formatarPercentual(relatorioABC.resumoC.percentualFaturamento, 1)} Faturamento
                        </span>
                      </div>
                      <div className="mt-2 font-mono font-extrabold text-lg text-amber-950 dark:text-amber-200">
                        {formatarMoeda(relatorioABC.resumoC.faturamento)}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {relatorioABC.resumoC.itens} itens ({formatarPercentual(relatorioABC.resumoC.percentualItens, 1)} do catálogo)
                      </div>
                    </div>
                  </div>

                  {/* Tabela Curva ABC */}
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[640px] text-xs">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
                          <th className="p-3 w-16 text-center">Classe</th>
                          <th className="p-3">Código</th>
                          <th className="p-3">Produto</th>
                          <th className="p-3">Departamento</th>
                          <th className="p-3 text-right">Qtd Vendida</th>
                          <th className="p-3 text-right">Preço Médio</th>
                          <th className="p-3 text-right">Total Faturado</th>
                          <th className="p-3 text-right">% Fat.</th>
                          <th className="p-3 text-right">% Acumulado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itensAbcFiltrados.map((item, idx) => (
                          <tr key={`${item.id}-${idx}`} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="p-3 text-center">
                              <Badge
                                variant={
                                  item.classe === "A"
                                    ? "default"
                                    : item.classe === "B"
                                      ? "secondary"
                                      : "outline"
                                }
                                className={`font-bold ${
                                  item.classe === "A"
                                    ? "bg-emerald-600 text-white"
                                    : item.classe === "B"
                                      ? "bg-blue-600 text-white"
                                      : "text-amber-700 dark:text-amber-400 border-amber-500/40"
                                }`}
                              >
                                {item.classe}
                              </Badge>
                            </td>
                            <td className="p-3 font-mono text-muted-foreground">{item.id}</td>
                            <td className="p-3 font-semibold text-foreground">{item.produto}</td>
                            <td className="p-3 text-muted-foreground">{item.departamento}</td>
                            <td className="p-3 text-right font-mono">
                              {formatarNumero(item.quantidade, 2)} {item.un}
                            </td>
                            <td className="p-3 text-right font-mono text-muted-foreground">
                              {formatarMoeda(item.precoMedio)}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-foreground">
                              {formatarMoeda(item.total)}
                            </td>
                            <td className="p-3 text-right font-mono">{formatarPercentual(item.percentual, 2)}</td>
                            <td className="p-3 text-right font-mono font-semibold text-primary">
                              {formatarPercentual(item.percentualAcumulado, 1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* ABA 2: CLIENTES & CONCENTRAÇÃO (PARETO DE CLIENTES) */}
              {/* ========================================================= */}
              {abaAtiva === "clientes" && (
                <div className="space-y-4">
                  {/* Cards Síntese de Clientes */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Total de Clientes
                      </span>
                      <div className="mt-1 font-mono font-extrabold text-lg text-foreground">
                        {formatarNumero(relatorioClientes.totalClientes, 0)}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Ticket médio: {formatarMoeda(relatorioClientes.ticketMedioPorCliente)}
                      </span>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-3">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Clientes Recorrentes
                      </span>
                      <div className="mt-1 font-mono font-extrabold text-lg text-primary">
                        {formatarPercentual(relatorioClientes.taxaRecorrencia, 1)}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {relatorioClientes.clientesRecorrentes} compraram 2x ou mais
                      </span>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-3">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Concentração Top 5
                      </span>
                      <div className="mt-1 font-mono font-extrabold text-lg text-foreground">
                        {formatarPercentual(relatorioClientes.concentracaoTop5, 1)}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        do faturamento total da empresa
                      </span>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-3">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Concentração Top 10
                      </span>
                      <div className="mt-1 font-mono font-extrabold text-lg text-foreground">
                        {formatarPercentual(relatorioClientes.concentracaoTop10, 1)}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        dos 10 maiores compradores
                      </span>
                    </div>
                  </div>

                  {/* Tabela de Clientes */}
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[640px] text-xs">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
                          <th className="p-3 w-16 text-center">Classe</th>
                          <th className="p-3">Cliente</th>
                          <th className="p-3">Praça (Cidade/UF)</th>
                          <th className="p-3 text-right">Pedidos / NF</th>
                          <th className="p-3 text-right">Qtd Itens</th>
                          <th className="p-3 text-right">Ticket Médio</th>
                          <th className="p-3 text-right">Descontos</th>
                          <th className="p-3 text-right">Total Faturado</th>
                          <th className="p-3 text-right">% Fat.</th>
                          <th className="p-3 text-right">% Acum.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientesFiltrados.map((cli, idx) => (
                          <tr key={`${cli.nome}-${idx}`} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="p-3 text-center">
                              <Badge
                                variant={
                                  cli.classe === "A"
                                    ? "default"
                                    : cli.classe === "B"
                                      ? "secondary"
                                      : "outline"
                                }
                                className={`font-bold ${
                                  cli.classe === "A"
                                    ? "bg-emerald-600 text-white"
                                    : cli.classe === "B"
                                      ? "bg-blue-600 text-white"
                                      : "text-amber-700 dark:text-amber-400 border-amber-500/40"
                                }`}
                              >
                                {cli.classe}
                              </Badge>
                            </td>
                            <td className="p-3 font-semibold text-foreground">{cli.nome}</td>
                            <td className="p-3 text-muted-foreground">{cli.cidade} / {cli.uf}</td>
                            <td className="p-3 text-right font-mono">{formatarNumero(cli.pedidos, 0)}</td>
                            <td className="p-3 text-right font-mono text-muted-foreground">{formatarNumero(cli.quantidadeItens, 2)}</td>
                            <td className="p-3 text-right font-mono text-muted-foreground">{formatarMoeda(cli.ticketMedio)}</td>
                            <td className="p-3 text-right font-mono text-muted-foreground">{formatarMoeda(cli.descontos)}</td>
                            <td className="p-3 text-right font-mono font-bold text-foreground">{formatarMoeda(cli.faturamento)}</td>
                            <td className="p-3 text-right font-mono">{formatarPercentual(cli.percentual, 2)}</td>
                            <td className="p-3 text-right font-mono font-semibold text-primary">{formatarPercentual(cli.percentualAcumulado, 1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* ABA 3: DESCONTOS & POLÍTICA COMERCIAL */}
              {/* ========================================================= */}
              {abaAtiva === "descontos" && (
                <div className="space-y-6">
                  {/* Síntese de Descontos */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border bg-muted/20 p-3.5">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Faturamento Bruto
                      </span>
                      <div className="mt-1 font-mono font-extrabold text-lg text-foreground">
                        {formatarMoeda(relatorioDescontos.faturamentoBruto)}
                      </div>
                      <span className="text-[11px] text-muted-foreground">Valor de tabela dos itens</span>
                    </div>

                    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5">
                      <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                        Total de Descontos Concedidos
                      </span>
                      <div className="mt-1 font-mono font-extrabold text-lg text-rose-950 dark:text-rose-200">
                        {formatarMoeda(relatorioDescontos.descontoTotal)}
                      </div>
                      <span className="text-[11px] text-rose-700/80 dark:text-rose-400">
                        Taxa global: {formatarPercentual(relatorioDescontos.taxaDescontoGlobal, 2)}
                      </span>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-3.5">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Faturamento Líquido
                      </span>
                      <div className="mt-1 font-mono font-extrabold text-lg text-foreground">
                        {formatarMoeda(relatorioDescontos.faturamentoLiquido)}
                      </div>
                      <span className="text-[11px] text-muted-foreground">Efetivamente faturado</span>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Descontos por Vendedor */}
                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold">Desconto Concedido por Vendedor</CardTitle>
                        <CardDescription className="text-xs">Avaliação de concessão e taxa de desconto por consultor.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[640px] text-xs">
                          <thead>
                            <tr className="border-b text-left font-semibold text-muted-foreground">
                              <th className="p-2.5">Vendedor</th>
                              <th className="p-2.5 text-right">Fat. Líquido</th>
                              <th className="p-2.5 text-right">Desconto (R$)</th>
                              <th className="p-2.5 text-right">% Desconto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {relatorioDescontos.porVendedor.map((v) => (
                              <tr key={v.nome} className="border-b last:border-0 hover:bg-muted/20">
                                <td className="p-2.5 font-bold text-foreground">{v.nome}</td>
                                <td className="p-2.5 text-right font-mono text-muted-foreground">{formatarMoeda(v.faturamentoLiquido)}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">{formatarMoeda(v.desconto)}</td>
                                <td className="p-2.5 text-right font-mono font-bold">{formatarPercentual(v.taxaDesconto, 1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Descontos por Departamento */}
                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold">Desconto por Departamento / Categoria</CardTitle>
                        <CardDescription className="text-xs">Categorias com maior pressão de desconto comercial.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[640px] text-xs">
                          <thead>
                            <tr className="border-b text-left font-semibold text-muted-foreground">
                              <th className="p-2.5">Departamento</th>
                              <th className="p-2.5 text-right">Fat. Líquido</th>
                              <th className="p-2.5 text-right">Desconto (R$)</th>
                              <th className="p-2.5 text-right">% Desconto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {relatorioDescontos.porDepartamento.map((d) => (
                              <tr key={d.nome} className="border-b last:border-0 hover:bg-muted/20">
                                <td className="p-2.5 font-bold text-foreground">{d.nome}</td>
                                <td className="p-2.5 text-right font-mono text-muted-foreground">{formatarMoeda(d.faturamentoLiquido)}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">{formatarMoeda(d.desconto)}</td>
                                <td className="p-2.5 text-right font-mono font-bold">{formatarPercentual(d.taxaDesconto, 1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* ABA 4: SAZONALIDADE & DIAS DA SEMANA */}
              {/* ========================================================= */}
              {abaAtiva === "sazonalidade" && (
                <div className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Vendas por Dia da Semana */}
                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold">Faturamento por Dia da Semana</CardTitle>
                        <CardDescription className="text-xs">Distribuição de receita e pedidos de Segunda a Domingo.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[640px] text-xs">
                          <thead>
                            <tr className="border-b text-left font-semibold text-muted-foreground">
                              <th className="p-2.5">Dia da Semana</th>
                              <th className="p-2.5 text-right">Pedidos</th>
                              <th className="p-2.5 text-right">Ticket Médio</th>
                              <th className="p-2.5 text-right">Faturamento</th>
                              <th className="p-2.5 text-right">% Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {relatorioSazonalidade.porDiaSemana.map((d) => (
                              <tr key={d.dia} className="border-b last:border-0 hover:bg-muted/20">
                                <td className="p-2.5 font-bold text-foreground">{d.dia}</td>
                                <td className="p-2.5 text-right font-mono">{formatarNumero(d.pedidos, 0)}</td>
                                <td className="p-2.5 text-right font-mono text-muted-foreground">{formatarMoeda(d.ticketMedio)}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-foreground">{formatarMoeda(d.faturamento)}</td>
                                <td className="p-2.5 text-right font-mono font-semibold text-primary">{formatarPercentual(d.percentual, 1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Comparativo Quinzenal */}
                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold">Comparativo Quinzenal</CardTitle>
                        <CardDescription className="text-xs">Início de mês (1 a 15) vs. Segunda quinzena (16+).</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[640px] text-xs">
                          <thead>
                            <tr className="border-b text-left font-semibold text-muted-foreground">
                              <th className="p-2.5">Quinzena</th>
                              <th className="p-2.5 text-right">Pedidos</th>
                              <th className="p-2.5 text-right">Ticket Médio</th>
                              <th className="p-2.5 text-right">Faturamento</th>
                              <th className="p-2.5 text-right">% Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {relatorioSazonalidade.porQuinzena.map((q) => (
                              <tr key={q.quinzena} className="border-b last:border-0 hover:bg-muted/20">
                                <td className="p-2.5 font-bold text-foreground">{q.quinzena}</td>
                                <td className="p-2.5 text-right font-mono">{formatarNumero(q.pedidos, 0)}</td>
                                <td className="p-2.5 text-right font-mono text-muted-foreground">{formatarMoeda(q.ticketMedio)}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-foreground">{formatarMoeda(q.faturamento)}</td>
                                <td className="p-2.5 text-right font-mono font-semibold text-primary">{formatarPercentual(q.percentual, 1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* ABA 5: DEPARTAMENTOS & PRODUTOS */}
              {/* ========================================================= */}
              {abaAtiva === "departamentos" && (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[640px] text-xs">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
                          <th className="p-3 w-10" />
                          <th className="p-3">Departamento</th>
                          <th className="p-3 text-right">Produtos Distintos</th>
                          <th className="p-3 text-right">Qtd Total Itens</th>
                          <th className="p-3 text-right">Preço Médio / Item</th>
                          <th className="p-3 text-right">Faturamento Total</th>
                          <th className="p-3 text-right">% Participação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deptosFiltrados.map((dep) => {
                          const aberto = departamentoAberto === dep.nome;
                          return (
                            <>
                              <tr
                                key={dep.nome}
                                className={`border-b hover:bg-muted/20 ${aberto ? "bg-muted/30" : ""}`}
                              >
                                <td className="p-3">
                                  <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    onClick={() =>
                                      setDepartamentoAberto(aberto ? null : dep.nome)
                                    }
                                  >
                                    {aberto ? <ChevronDown /> : <ChevronRight />}
                                  </Button>
                                </td>
                                <td className="p-3 font-bold text-sm text-foreground">
                                  {dep.nome}
                                </td>
                                <td className="p-3 text-right font-mono">
                                  {dep.quantidadeProdutosDistintos}
                                </td>
                                <td className="p-3 text-right font-mono">
                                  {formatarNumero(dep.quantidadeItens, 2)}
                                </td>
                                <td className="p-3 text-right font-mono text-muted-foreground">
                                  {formatarMoeda(dep.ticketMedioPorItem)}
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-foreground">
                                  {formatarMoeda(dep.faturamento)}
                                </td>
                                <td className="p-3 text-right font-mono font-semibold text-primary">
                                  {formatarPercentual(dep.percentual, 1)}
                                </td>
                              </tr>

                              {aberto && (
                                <tr key={`${dep.nome}-itens`}>
                                  <td colSpan={7} className="bg-muted/20 p-4">
                                    <div className="rounded-md border bg-background overflow-hidden">
                                      <div className="bg-muted/40 p-2.5 font-bold text-xs text-foreground border-b">
                                        Produtos no Departamento: {dep.nome} ({dep.produtos.length} itens)
                                      </div>
                                      <table className="w-full min-w-[640px] text-xs">
                                        <thead>
                                          <tr className="border-b text-left text-muted-foreground font-semibold">
                                            <th className="p-2.5">Código</th>
                                            <th className="p-2.5">Descrição</th>
                                            <th className="p-2.5 text-right">Qtd</th>
                                            <th className="p-2.5 text-right">Preço Médio</th>
                                            <th className="p-2.5 text-right">Faturamento</th>
                                            <th className="p-2.5 text-right">% do Depto</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {dep.produtos.map((prod) => (
                                            <tr key={prod.id} className="border-b last:border-0 hover:bg-muted/10">
                                              <td className="p-2.5 font-mono text-muted-foreground">{prod.id}</td>
                                              <td className="p-2.5 font-medium text-foreground">{prod.produto}</td>
                                              <td className="p-2.5 text-right font-mono">{formatarNumero(prod.quantidade, 2)} {prod.un}</td>
                                              <td className="p-2.5 text-right font-mono text-muted-foreground">{formatarMoeda(prod.precoMedio)}</td>
                                              <td className="p-2.5 text-right font-mono font-bold text-foreground">{formatarMoeda(prod.total)}</td>
                                              <td className="p-2.5 text-right font-mono text-primary font-semibold">{formatarPercentual(prod.percentual, 1)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* ABA 6: VENDEDORES & EQUIPE */}
              {/* ========================================================= */}
              {abaAtiva === "vendedores" && (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[640px] text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
                        <th className="p-3">Vendedor</th>
                        <th className="p-3 text-right">Pedidos / NF</th>
                        <th className="p-3 text-right">Clientes Únicos</th>
                        <th className="p-3 text-right">Qtd Itens</th>
                        <th className="p-3 text-right">Ticket Médio</th>
                        <th className="p-3 text-right">Desconto (R$)</th>
                        <th className="p-3 text-right">% Desconto</th>
                        <th className="p-3 text-right">Faturamento Total</th>
                        <th className="p-3 text-right">% Participação</th>
                        <th className="p-3">Principal Produto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendedoresFiltrados.map((v) => (
                        <tr key={v.nome} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-3 font-bold text-sm text-foreground">{v.nome}</td>
                          <td className="p-3 text-right font-mono">{formatarNumero(v.pedidos, 0)}</td>
                          <td className="p-3 text-right font-mono">{formatarNumero(v.clientes, 0)}</td>
                          <td className="p-3 text-right font-mono text-muted-foreground">
                            {formatarNumero(v.quantidadeItens, 2)}
                          </td>
                          <td className="p-3 text-right font-mono text-muted-foreground">
                            {formatarMoeda(v.ticketMedio)}
                          </td>
                          <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400">
                            {formatarMoeda(v.descontoConcedido)}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {formatarPercentual(v.taxaDesconto, 1)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-foreground">
                            {formatarMoeda(v.faturamento)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-primary">
                            {formatarPercentual(v.percentual, 1)}
                          </td>
                          <td className="p-3 text-muted-foreground truncate max-w-[180px]" title={v.principalProduto}>
                            {v.principalProduto ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ========================================================= */}
              {/* ABA 7: CIDADES & PRAÇAS */}
              {/* ========================================================= */}
              {abaAtiva === "geografico" && (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[640px] text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
                        <th className="p-3">Cidade</th>
                        <th className="p-3">UF</th>
                        <th className="p-3 text-right">Pedidos / NF</th>
                        <th className="p-3 text-right">Clientes Atendidos</th>
                        <th className="p-3 text-right">Ticket Médio</th>
                        <th className="p-3 text-right">Frete Rateado</th>
                        <th className="p-3 text-right">Faturamento Total</th>
                        <th className="p-3 text-right">% Participação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cidadesFiltradas.map((c, i) => (
                        <tr key={`${c.cidade}-${c.uf}-${i}`} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-3 font-semibold text-foreground text-sm">{c.cidade}</td>
                          <td className="p-3 font-mono font-bold">
                            <Badge variant="outline">{c.uf}</Badge>
                          </td>
                          <td className="p-3 text-right font-mono">{formatarNumero(c.pedidos, 0)}</td>
                          <td className="p-3 text-right font-mono">{formatarNumero(c.clientes, 0)}</td>
                          <td className="p-3 text-right font-mono text-muted-foreground">
                            {formatarMoeda(c.ticketMedio)}
                          </td>
                          <td className="p-3 text-right font-mono text-muted-foreground">
                            {formatarMoeda(c.frete)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-foreground">
                            {formatarMoeda(c.faturamento)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-primary">
                            {formatarPercentual(c.percentual, 1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ========================================================= */}
              {/* ABA 8: FINANCEIRO & FISCAL */}
              {/* ========================================================= */}
              {abaAtiva === "financeiro" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Total Frete
                      </span>
                      <div className="mt-1 font-mono font-extrabold text-lg text-foreground">
                        {formatarMoeda(relatorioFinanceiro.totaisFrete)}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Total ICMS-ST
                      </span>
                      <div className="mt-1 font-mono font-extrabold text-lg text-foreground">
                        {formatarMoeda(relatorioFinanceiro.totaisIcmsSt)}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold">Formas de Pagamento Declaradas</CardTitle>
                        <CardDescription className="text-xs">Distribuição do faturamento por meio de recebimento.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[640px] text-xs">
                          <thead>
                            <tr className="border-b text-left font-semibold text-muted-foreground">
                              <th className="p-2.5">Forma</th>
                              <th className="p-2.5 text-right">Pedidos</th>
                              <th className="p-2.5 text-right">Ticket Médio</th>
                              <th className="p-2.5 text-right">Total</th>
                              <th className="p-2.5 text-right">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {relatorioFinanceiro.formasPagamento.map((fp) => (
                              <tr key={fp.nome} className="border-b last:border-0 hover:bg-muted/20">
                                <td className="p-2.5 font-medium text-foreground">{fp.nome}</td>
                                <td className="p-2.5 text-right font-mono">{formatarNumero(fp.pedidos, 0)}</td>
                                <td className="p-2.5 text-right font-mono text-muted-foreground">{formatarMoeda(fp.ticketMedio)}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-foreground">{formatarMoeda(fp.total)}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-primary">{formatarPercentual(fp.percentual, 1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold">Modelos de Documentos Fiscais</CardTitle>
                        <CardDescription className="text-xs">Divisão entre NF-e (Modelo 55) e NFC-e (Modelo 65).</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[640px] text-xs">
                          <thead>
                            <tr className="border-b text-left font-semibold text-muted-foreground">
                              <th className="p-2.5">Modelo</th>
                              <th className="p-2.5 text-right">Notas Emitidas</th>
                              <th className="p-2.5 text-right">Ticket Médio</th>
                              <th className="p-2.5 text-right">Total</th>
                              <th className="p-2.5 text-right">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {relatorioFinanceiro.modelosDocumento.map((m) => (
                              <tr key={m.nome} className="border-b last:border-0 hover:bg-muted/20">
                                <td className="p-2.5 font-medium text-foreground">{m.nome}</td>
                                <td className="p-2.5 text-right font-mono">{formatarNumero(m.pedidos, 0)}</td>
                                <td className="p-2.5 text-right font-mono text-muted-foreground">{formatarMoeda(m.ticketMedio)}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-foreground">{formatarMoeda(m.total)}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-primary">{formatarPercentual(m.percentual, 1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Glossário — termos do relatório ativo */}
              {GUIAS_RELATORIOS[abaAtiva]?.glossario ? (
                <GlossarioRelatorio
                  itens={GUIAS_RELATORIOS[abaAtiva].glossario ?? []}
                  relatorioLabel={
                    relatoriosOpcoes.find((r) => r.id === abaAtiva)?.label ?? ""
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
