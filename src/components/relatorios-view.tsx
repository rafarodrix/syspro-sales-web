"use client";

import { useState, useMemo, useEffect } from "react";
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
  dataInputParaSyspro,
} from "@/lib/vendas";
import {
  DateRangeFilter,
  periodoMesAtual,
  salvarPeriodoCookie,
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
import { ExportDropdown } from "@/components/export-dropdown";
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
    setLoading(true);
    setErro(null);
    salvarPeriodoCookie(periodo);

    try {
      const res = await buscarVendasApi(empresaId, periodo, {
        forcarAtualizacao: true,
      });
      setVendas(res);
      toast.success("Dados de relatórios atualizados com sucesso!");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar relatórios.");
      toast.error("Não foi possível carregar os relatórios.");
    } finally {
      setLoading(false);
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

  async function handleExportarPdf(modo: "download" | "imprimir" = "download") {
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
            {/* Título Estático & Descrição do Relatório Ativo */}
            <div className="flex items-center gap-3">
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/80 shadow-2xs ${
                  relatoriosOpcoes.find((r) => r.id === abaAtiva)?.cor ?? "text-primary"
                }`}
              >
                {(() => {
                  const IconeOp =
                    relatoriosOpcoes.find((r) => r.id === abaAtiva)?.icone ?? Sparkles;
                  return <IconeOp className="size-4.5" />;
                })()}
              </div>
              <div className="flex flex-col">
                <span className="text-base font-extrabold text-foreground tracking-tight">
                  {relatoriosOpcoes.find((r) => r.id === abaAtiva)?.label ?? "Relatório Analítico"}
                </span>
                <span className="text-xs text-muted-foreground">
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
            <div className="py-12 text-center text-xs text-muted-foreground">
              Nenhuma venda encontrada para o período selecionado.
            </div>
          ) : (
            <>
              {/* Painel "Como ler" — explicação do relatório ativo */}
              <PainelComoLer relatorioId={abaAtiva} />

              {/* Renderização condicional da aba ativa através de componentes modulares */}
              {abaAtiva === "curva-abc" && (
                <AbaCurvaABC
                  relatorioABC={relatorioABC}
                  itensFiltrados={itensAbcFiltrados}
                />
              )}

              {abaAtiva === "clientes" && (
                <AbaClientes
                  relatorioClientes={relatorioClientes}
                  clientesFiltrados={clientesFiltrados}
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
