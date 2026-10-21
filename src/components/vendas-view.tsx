"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  LayoutList,
  AlignJustify,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { VendaProduto, VendaComEmpresa } from "@/lib/syspro-api";
import {
  agruparVendasPorNota,
  resumirMargens,
  paraNumero,
  valorItem,
  type VendaAgrupada,
} from "@/lib/vendas";
import {
  DateRangeFilter,
  periodoMesAtual,
  type Periodo,
} from "@/components/date-range-filter";
import { useConsultaVendas } from "@/hooks/use-consulta-vendas";
import { exportarParaCSV } from "@/lib/exportar-csv";
import { exportarPdfVendas } from "@/lib/pdf-export";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import { calcularMargemItem } from "@/lib/metricas-negocio";
import { ExportDropdown } from "@/components/export-dropdown";
import { AnalysisQueryCard } from "@/components/analytics/analysis-query-card";
import { ReportTable } from "./relatorios/report-table";
import { MetricsStrip } from "@/components/analytics/metrics-strip";
import { DataFilterBar } from "@/components/data-filter-bar";
import { FeedbackState } from "@/components/feedback-state";
import { toast } from "sonner";
import { resolverEmpresaSelecionada } from "@/lib/empresa-selecao";
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
import { Skeleton } from "@/components/ui/skeleton";

interface EmpresaOption {
  id: string;
  cnpj: string;
  razaoSocial: string;
}

interface Props {
  empresas: EmpresaOption[];
  empresaInicial?: string;
  initialPeriod?: Periodo;
  initialVendas?: (VendaProduto | VendaComEmpresa)[];
  initialError?: string;
}

type CampoOrdenacao = "emissao" | "numero" | "cliente" | "quantidadeItens" | "total" | "margemBruta";
type DirecaoOrdenacao = "asc" | "desc";
type FiltroMargem = "todas" | "negativa" | "baixa" | "saudavel" | "custo-incompleto";

export function VendasView({
  empresas,
  empresaInicial,
  initialPeriod,
  initialVendas = [],
  initialError,
}: Props) {
  const searchParams = useSearchParams();
  const [empresaId] = useState(() => resolverEmpresaSelecionada(empresaInicial, empresas));

  const [periodo, setPeriodo] = useState<Periodo>(
    initialPeriod ?? periodoMesAtual(),
  );
  const [periodoConsultado, setPeriodoConsultado] = useState<Periodo>(initialPeriod ?? periodoMesAtual());
  const { vendas, erro, loading, consultar: consultarVendas } = useConsultaVendas(initialVendas, initialError);
  // Quando verdadeiro, todas as notas abrem o detalhe de itens (estado inicial da tabela).
  const [detalheTodos, setDetalheTodos] = useState(false);

  // Densidade da tabela
  const [densidade, setDensidade] = useState<"compacto" | "confortavel">("confortavel");

  // Filtros
  const [buscaVenda, setBuscaVenda] = useState(() => searchParams.get("busca") ?? "");
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>(() => searchParams.get("empresa") ?? "todos");
  const [filtroVendedor, setFiltroVendedor] = useState<string>(() => searchParams.get("vendedor") ?? "todos");
  const [filtroDepartamento, setFiltroDepartamento] = useState<string>(() => searchParams.get("departamento") ?? "todos");
  const [filtroFormaPagto, setFiltroFormaPagto] = useState<string>(() => searchParams.get("formaPagamento") ?? "todos");
  const [filtroModelo, setFiltroModelo] = useState<string>("todos");
  const [filtroMargem, setFiltroMargem] = useState<FiltroMargem>("todas");

  // Ordenação

  // Paginação

  // Inicializar filtros a partir dos parâmetros de busca da URL (Drill-down)
  const empresaAtual = useMemo(
    () => empresas.find((e) => e.id === empresaId),
    [empresas, empresaId],
  );

  const notas = useMemo(() => agruparVendasPorNota(vendas), [vendas]);

  // Opções para os selects de filtro
  const opcoesFiltro = useMemo(() => {
    const empresasMap = new Map<string, string>();
    const vendedores = new Set<string>();
    const departamentos = new Set<string>();
    const formasPagto = new Set<string>();
    const modelos = new Set<string>();

    for (const v of vendas) {
      const vEmp = v as VendaComEmpresa;
      if (vEmp.empresa_id && vEmp.empresa_nome) {
        empresasMap.set(vEmp.empresa_id, vEmp.empresa_nome);
      }
      if (v.vendedor_nome?.trim()) vendedores.add(v.vendedor_nome.trim());
      if (v.produto_departamento?.trim()) departamentos.add(v.produto_departamento.trim());
      if (v.nf_forma_pagto?.trim()) formasPagto.add(v.nf_forma_pagto.trim());
      if (v.nf_modelo?.trim()) modelos.add(v.nf_modelo.trim());
    }

    return {
      empresas: Array.from(empresasMap.entries()).map(([id, nome]) => ({ id, nome })),
      vendedores: Array.from(vendedores).sort(),
      departamentos: Array.from(departamentos).sort(),
      formasPagto: Array.from(formasPagto).sort(),
      modelos: Array.from(modelos).sort(),
    };
  }, [vendas]);

  // Filtragem
  const notasFiltradas = useMemo(() => {
    return notas.filter((n) => {
      // Filtro Empresa
      if (filtroEmpresa !== "todos" && n.empresaId && n.empresaId !== filtroEmpresa) {
        return false;
      }

      // Busca textual
      if (buscaVenda.trim()) {
        const termo = buscaVenda.toLowerCase().trim();
        const bateu =
          n.numero.toLowerCase().includes(termo) ||
          n.cliente.toLowerCase().includes(termo) ||
          n.cidade?.toLowerCase().includes(termo) ||
          (n.empresaNome && n.empresaNome.toLowerCase().includes(termo)) ||
          n.itens.some((item) =>
            item.produto_descricao?.toLowerCase().includes(termo) ||
            item.produto_codigo_auxiliar?.toLowerCase().includes(termo)
          );
        if (!bateu) return false;
      }

      // Filtro Vendedor
      if (filtroVendedor !== "todos" && n.vendedor !== filtroVendedor) {
        return false;
      }

      // Filtro Departamento
      if (
        filtroDepartamento !== "todos" &&
        !n.itens.some((i) => i.produto_departamento?.trim() === filtroDepartamento)
      ) {
        return false;
      }

      // Filtro Forma Pagamento
      if (filtroFormaPagto !== "todos" && n.formaPagamento !== filtroFormaPagto) {
        return false;
      }

      // Filtro Modelo
      if (filtroModelo !== "todos" && n.modelo !== filtroModelo) {
        return false;
      }

      if (filtroMargem === "custo-incompleto" && n.coberturaCusto >= 100) return false;
      if (filtroMargem === "negativa" && !(n.coberturaCusto > 0 && n.margemBruta < 0)) return false;
      if (filtroMargem === "baixa" && !(n.coberturaCusto > 0 && n.margemBruta >= 0 && n.margemBruta < 20)) return false;
      if (filtroMargem === "saudavel" && !(n.coberturaCusto > 0 && n.margemBruta >= 20)) return false;

      return true;
    });
  }, [
    notas,
    buscaVenda,
    filtroEmpresa,
    filtroVendedor,
    filtroDepartamento,
    filtroFormaPagto,
    filtroModelo,
    filtroMargem,
  ]);

  // Ordenação
  const notasOrdenadas = useMemo(() => {
    // Ordem base (emissão mais recente primeiro) usada pelo PDF; a tabela ordena por clique.
    const campoOrdenacao = "emissao" as CampoOrdenacao;
    const direcaoOrdenacao = "desc" as DirecaoOrdenacao;
    return [...notasFiltradas].sort((a, b) => {
      let valA: string | number = a[campoOrdenacao];
      let valB: string | number = b[campoOrdenacao];

      if (campoOrdenacao === "emissao") {
        const parseData = (d: string) => {
          const [dia, mes, ano] = d.split("/").map(Number);
          return Date.UTC(ano || 0, (mes || 1) - 1, dia || 1);
        };
        valA = parseData(a.emissao);
        valB = parseData(b.emissao);
      } else if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return direcaoOrdenacao === "asc" ? -1 : 1;
      if (valA > valB) return direcaoOrdenacao === "asc" ? 1 : -1;
      return 0;
    });
  }, [notasFiltradas]);

  // Resumo dos filtros aplicados
  const resumoBusca = useMemo(() => {
    let faturamento = 0;
    let itensTotal = 0;
    const clientes = new Set<string>();

    for (const n of notasFiltradas) {
      faturamento += n.total;
      itensTotal += n.quantidadeItens;
      if (n.cliente) clientes.add(n.cliente.toUpperCase());
    }
    const totalNotas = notasFiltradas.length;
    const ticketMedio = totalNotas ? faturamento / totalNotas : 0;
    const margens = resumirMargens(notasFiltradas.flatMap((nota) => nota.itens));
    return { faturamento, totalNotas, clientes: clientes.size, ticketMedio, itensTotal, ...margens };
  }, [notasFiltradas]);



  function expandirTodas() {
    setDetalheTodos(true);
  }

  function recolherTodas() {
    setDetalheTodos(false);
  }

  function limparTodosFiltros() {
    setBuscaVenda("");
    setFiltroEmpresa("todos");
    setFiltroVendedor("todos");
    setFiltroDepartamento("todos");
    setFiltroFormaPagto("todos");
    setFiltroModelo("todos");
    setFiltroMargem("todas");
  }

  async function consultar(periodoDaConsulta = periodo) {
    if (!empresaId || !periodoDaConsulta.inicial || !periodoDaConsulta.final) {
      toast.error("Preencha o período de consulta");
      return;
    }
    if (periodoDaConsulta.inicial > periodoDaConsulta.final) {
      toast.error("A data inicial deve ser anterior à data final");
      return;
    }
    try {
      await consultarVendas({ empresaId, periodo: periodoDaConsulta });
      setPeriodoConsultado(periodoDaConsulta);
      toast.success("Vendas consultadas com sucesso!");
    } catch (causa) {
      const mensagem =
        causa instanceof Error ? causa.message : "Erro ao consultar as vendas.";
      toast.error(mensagem);
    }
  }

  function handleExportarPdf(modo: "download" | "imprimir" = "download") {
    if (notasFiltradas.length === 0) {
      toast.error("Não há notas fiscais para exportar no período filtrado.");
      return;
    }
    exportarPdfVendas({
      contexto: {
        empresaNome: empresaId === "todas" ? "Todas as Empresas (Consolidado)" : (empresaAtual?.razaoSocial ?? "Empresa Selecionada"),
        cnpj: empresaId === "todas" ? undefined : empresaAtual?.cnpj,
        periodo: periodoConsultado,
      },
      notas: notasFiltradas,
      modo,
    });
    if (modo === "download") {
      toast.success("Relatório de Vendas em PDF gerado com sucesso!");
    } else {
      toast.success("Preparando documento para impressão...");
    }
  }

  const temFiltrosAtivos =
    Boolean(buscaVenda.trim()) ||
    filtroEmpresa !== "todos" ||
    filtroVendedor !== "todos" ||
    filtroDepartamento !== "todos" ||
    filtroFormaPagto !== "todos" ||
    filtroModelo !== "todos" ||
    filtroMargem !== "todas";

  return (
    <div className="flex flex-col gap-6">
      {/* Painel de Consulta & Filtros */}
      <AnalysisQueryCard
        icon={BarChart3}
        title="Consulta de Vendas"
        description="Selecione o período e aplique filtros para analisar notas fiscais e itens detalhados."
        footer={<>Dados exibidos: {periodoConsultado.inicial.split("-").reverse().join("/")} a {periodoConsultado.final.split("-").reverse().join("/")}.{periodo.inicial !== periodoConsultado.inicial || periodo.final !== periodoConsultado.final ? " Novo período ainda não consultado." : ""}</>}
      >
        <DateRangeFilter
          value={periodo}
          onChange={setPeriodo}
          onConsultar={consultar}
          loading={loading}
        />
      </AnalysisQueryCard>

      {erro ? (
        <FeedbackState
          variant="error"
          title="Não foi possível consultar as vendas"
          description={erro}
          onRetry={() => consultar()}
        />
      ) : null}

      {/* Tabela Principal de Vendas */}
      <Card className="shadow-2xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Notas Fiscais Emitidas
                </CardTitle>
                <CardDescription className="text-xs">
                  {notasFiltradas.length} de {notas.length} nota(s) do período consultado. Busca e filtros desta seção alteram indicadores e exportações de Vendas.
                </CardDescription>
              </div>

              {/* Botões de Ação e Exportação */}
              <div className="no-print flex flex-wrap items-center gap-2">
                <Button
                  onClick={expandirTodas}
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs font-semibold"
                  title="Expandir todas as notas da página"
                >
                  <Maximize2 className="size-3.5" />
                  Expandir todas
                </Button>
                <Button
                  onClick={recolherTodas}
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs font-semibold"
                  title="Recolher todas as notas"
                >
                  <Minimize2 className="size-3.5" />
                  Recolher todas
                </Button>

                <ExportDropdown
                  onExportarPdf={() => handleExportarPdf("download")}
                  onExportarCsv={() => exportarCsv(notasFiltradas.flatMap((nota) => nota.itens))}
                  onImprimir={() => handleExportarPdf("imprimir")}
                  disabled={loading || vendas.length === 0}
                  label="Exportar"
                />
              </div>
            </div>

            {/* Barra de Busca e Filtros Combinados */}
            <DataFilterBar
              busca={buscaVenda}
              onBuscaChange={(valor) => {
                setBuscaVenda(valor);
              }}
              placeholder="Buscar por NF, cliente, cidade ou produto..."
              onLimpar={limparTodosFiltros}
              temFiltrosAtivos={temFiltrosAtivos}
            >

              {/* Filtro Empresa (quando em modo consolidado) */}
              {opcoesFiltro.empresas.length > 1 && (
                <div className="w-44 sm:w-48">
                  <Select
                    value={filtroEmpresa}
                    onValueChange={(v) => {
                      setFiltroEmpresa(v);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs font-semibold">
                      <SelectValue placeholder="Empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos" className="font-bold text-primary">
                        🏢 Todas as Empresas
                      </SelectItem>
                      {opcoesFiltro.empresas.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id} className="text-xs">
                          {emp.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Filtro Vendedor */}
              {opcoesFiltro.vendedores.length > 0 && (
                <div className="w-40 sm:w-44">
                  <Select
                    value={filtroVendedor}
                    onValueChange={(v) => {
                      setFiltroVendedor(v);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Vendedores</SelectItem>
                      {opcoesFiltro.vendedores.map((vend) => (
                        <SelectItem key={vend} value={vend}>
                          {vend}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Filtro Departamento */}
              {opcoesFiltro.departamentos.length > 0 && (
                <div className="w-40 sm:w-44">
                  <Select
                    value={filtroDepartamento}
                    onValueChange={(d) => {
                      setFiltroDepartamento(d);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos Departamentos</SelectItem>
                      {opcoesFiltro.departamentos.map((dep) => (
                        <SelectItem key={dep} value={dep}>
                          {dep}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Filtro Forma de Pagamento */}
              {opcoesFiltro.formasPagto.length > 0 && (
                <div className="w-40 sm:w-44">
                  <Select
                    value={filtroFormaPagto}
                    onValueChange={(fp) => {
                      setFiltroFormaPagto(fp);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Forma Pagto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas as Formas</SelectItem>
                      {opcoesFiltro.formasPagto.map((fp) => (
                        <SelectItem key={fp} value={fp}>
                          {fp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {opcoesFiltro.modelos.length > 0 && (
                <div className="w-36 sm:w-40">
                  <Select
                    value={filtroModelo}
                    onValueChange={(modelo) => {
                      setFiltroModelo(modelo);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Modelo fiscal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Modelos</SelectItem>
                      {opcoesFiltro.modelos.map((modelo) => (
                        <SelectItem key={modelo} value={modelo}>
                          Modelo {modelo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="w-40 sm:w-44">
                <Select
                  value={filtroMargem}
                  onValueChange={(valor) => {
                    setFiltroMargem(valor as FiltroMargem);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Margem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as margens</SelectItem>
                    <SelectItem value="negativa">Margem negativa</SelectItem>
                    <SelectItem value="baixa">Margem baixa (0% a 20%)</SelectItem>
                    <SelectItem value="saudavel">Margem saudável (20%+)</SelectItem>
                    <SelectItem value="custo-incompleto">Custo incompleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor de Densidade */}
              <div className="ml-auto flex items-center gap-0.5 rounded-lg bg-muted/40 p-0.5">
                <Button
                  variant={densidade === "confortavel" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setDensidade("confortavel")}
                  className="h-7 px-2 text-[11px] gap-1 font-semibold"
                  title="Exibição Confortável"
                >
                  <LayoutList className="size-3" />
                  <span className="hidden md:inline">Confortável</span>
                </Button>
                <Button
                  variant={densidade === "compacto" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setDensidade("compacto")}
                  className="h-7 px-2 text-[11px] gap-1 font-semibold"
                  title="Exibição Compacta"
                >
                  <AlignJustify className="size-3" />
                  <span className="hidden md:inline">Compacto</span>
                </Button>
              </div>
            </DataFilterBar>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-3 py-4">
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : vendas.length > 0 ? (
            <>
              {/* Resumo Consolidado dos Filtros Aplicados */}
              <div className="no-print mb-4">
                <MetricsStrip
                  itens={[
                    {
                      rotulo: "Total faturado",
                      valor: formatarMoeda(resumoBusca.faturamento),
                      detalhe: `${formatarNumero(resumoBusca.itensTotal, 0)} itens`,
                      definicao:
                        "Soma do total das notas filtradas, com descontos abatidos e frete/seguro/outros somados.",
                    },
                    {
                      rotulo: "Notas fiscais",
                      valor: formatarNumero(resumoBusca.totalNotas, 0),
                      detalhe: `${formatarNumero(notasFiltradas.length, 0)} de ${formatarNumero(notas.length, 0)} consultadas`,
                      definicao: "Quantidade de notas fiscais que passaram pelos filtros desta seção.",
                    },
                    {
                      rotulo: "Clientes atendidos",
                      valor: formatarNumero(resumoBusca.clientes, 0),
                      definicao: "Clientes distintos nas notas filtradas (nome do cliente, sem diferenciar filial).",
                    },
                    {
                      rotulo: "Ticket médio",
                      valor: formatarMoeda(resumoBusca.ticketMedio),
                      detalhe: "por nota fiscal",
                      definicao: "Total faturado dividido pelo número de notas filtradas.",
                    },
                    {
                      rotulo: "Lucro bruto",
                      valor: formatarMoeda(resumoBusca.lucroBruto),
                      detalhe: "só itens com custo",
                      definicao:
                        "Receita dos itens com custo de reposição informado menos esse custo. Itens sem custo ficam fora.",
                    },
                    {
                      rotulo: "Margem bruta",
                      valor:
                        resumoBusca.faturamentoComCusto > 0
                          ? formatarPercentual(resumoBusca.margemBruta, 1)
                          : "—",
                      detalhe:
                        resumoBusca.faturamentoComCusto > 0
                          ? `cobertura ${formatarPercentual(resumoBusca.coberturaCusto, 1)}`
                          : "custos não informados",
                      definicao:
                        "Lucro bruto dividido pela receita dos itens com custo informado. A cobertura mostra quanto do faturamento entra no cálculo.",
                    },
                  ]}
                />
              </div>

              <div className="no-print min-w-0">
                <ReportTable<VendaAgrupada>
                  key={detalheTodos ? "aberto" : "fechado"}
                  label="notas filtradas"
                  caption="Notas fiscais emitidas"
                  data={notasOrdenadas}
                  rowKey={(nota) => nota.id}
                  showExport={false}
                  modoDetalhe={detalheTodos ? "aberto" : "fechado"}
                  renderDetalhe={(nota) => <TabelaItens itens={nota.itens} />}
                  columns={[
                    {
                      id: "numero",
                      header: <>NF</>,
                      kind: "name",
                      value: (nota) => nota.numero,
                      cell: (nota) => (
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-bold text-foreground">{nota.numero}</span>
                          {nota.empresaNome ? (
                            <span
                              className="max-w-[140px] truncate font-sans text-[10px] font-medium text-primary"
                              title={nota.empresaNome}
                            >
                              {nota.empresaNome}
                            </span>
                          ) : null}
                        </div>
                      ),
                    },
                    {
                      id: "emissao",
                      header: <>Emissão</>,
                      kind: "date",
                      value: (nota) => nota.emissao,
                      cell: (nota) => <span className="font-mono text-xs text-muted-foreground">{nota.emissao}</span>,
                    },
                    {
                      id: "cliente",
                      header: <>Cliente</>,
                      kind: "name",
                      value: (nota) => nota.cliente,
                      cell: (nota) => (
                        <>
                          <div className="max-w-[240px] truncate text-xs font-semibold text-foreground" title={nota.cliente}>
                            {nota.cliente}
                          </div>
                          {nota.cidade || nota.uf ? (
                            <div className="text-[10.5px] text-muted-foreground">
                              {[nota.cidade, nota.uf].filter(Boolean).join(" · ")}
                            </div>
                          ) : null}
                        </>
                      ),
                    },
                    {
                      id: "vendedor",
                      header: <>Vendedor</>,
                      kind: "name",
                      value: (nota) => nota.vendedor,
                      cell: (nota) => (
                        <span className="block max-w-[150px] truncate text-xs text-muted-foreground" title={nota.vendedor}>
                          {nota.vendedor}
                        </span>
                      ),
                    },
                    {
                      id: "itens",
                      header: <>Itens</>,
                      kind: "number",
                      value: (nota) => nota.quantidadeItens,
                      cell: (nota) => <>{formatarNumero(nota.quantidadeItens, 2)}</>,
                    },
                    {
                      id: "total",
                      header: <>Total (R$)</>,
                      kind: "currency",
                      value: (nota) => nota.total,
                      cell: (nota) => (
                        <span className="font-mono text-xs font-bold text-foreground">{formatarMoeda(nota.total)}</span>
                      ),
                    },
                    {
                      id: "margem",
                      header: <>Margem</>,
                      kind: "percent",
                      value: (nota) => (nota.coberturaCusto > 0 ? nota.margemBruta : null),
                      cell: (nota) => (
                        <>{nota.coberturaCusto > 0 ? `${formatarNumero(nota.margemBruta, 1)}%` : "—"}</>
                      ),
                    },
                  ]}
                />
              </div>
            </>
          ) : !loading && !erro ? (
            <FeedbackState
              variant="empty"
              title="Nenhuma venda carregada para o período"
              description="Selecione um período acima e clique em Consultar."
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}


function exportarCsv(vendas: VendaProduto[]) {
  const cabecalho = [
    "Empresa",
    "NF",
    "Emissão",
    "Cliente",
    "Cidade",
    "UF",
    "Vendedor",
    "Grupo fiscal",
    "Modelo",
    "Forma de pagamento",
    "Código",
    "Produto",
    "Departamento",
    "Unidade",
    "Quantidade",
    "Valor unitário",
    "Desconto",
    "Frete",
    "Seguro",
    "Outros acréscimos",
    "ICMS-ST",
    "Custo unitário de reposição",
    "Custo total de reposição",
    "Lucro bruto",
    "Margem bruta (%)",
    "Total",
  ];
  const linhas = vendas.map((venda) => {
    const margem = calcularMargemItem(venda);
    return [
    (venda as VendaComEmpresa).empresa_nome || "Empresa Principal",
    venda.nf_numero,
    venda.nf_dt_emissao,
    venda.cliente_nome,
    venda.cliente_cidade,
    venda.cliente_uf,
    venda.vendedor_nome,
    venda.nf_ds_grupo_documento || venda.nf_cd_grupo_documento || "",
    venda.nf_modelo,
    venda.nf_forma_pagto,
    venda.produto_codigo_auxiliar || "",
    venda.produto_descricao,
    venda.produto_departamento,
    venda.produto_un,
    paraNumero(venda.produto_qtde),
    paraNumero(venda.produto_vlr_item),
    paraNumero(venda.produto_vlr_desconto),
    paraNumero(venda.produto_vlr_frete),
    paraNumero(venda.produto_vlr_seguro),
    paraNumero(venda.produto_vlr_outros),
    paraNumero(venda.produto_vlr_icms_stb),
    margem.custoUnitario ?? "",
    margem.custoTotal ?? "",
    margem.lucro ?? "",
    margem.margemPercentual ?? "",
    valorItem(venda),
    ];
  });
  exportarParaCSV(`vendas-syspro-${new Date().toISOString().slice(0, 10)}`, cabecalho, linhas);
}


function TabelaItens({ itens }: { itens: VendaProduto[] }) {
  return (
    <div className="overflow-x-auto rounded-md border bg-background shadow-xs">
      <table className="w-full min-w-[1100px] text-xs">
        <thead className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
          <tr>
            <th className="p-2.5 font-semibold">Código</th>
            <th className="p-2.5 font-semibold">Produto</th>
            <th className="p-2.5 font-semibold">Departamento</th>
            <th className="p-2.5 font-semibold">Un.</th>
            <th className="p-2.5 text-right font-semibold">Qtd.</th>
            <th className="p-2.5 text-right font-semibold">Unitário</th>
            <th className="p-2.5 text-right font-semibold">Desconto</th>
            <th className="p-2.5 text-right font-semibold">Frete</th>
            <th className="p-2.5 text-right font-semibold">Custo reposição</th>
            <th className="p-2.5 text-right font-semibold">Margem bruta</th>
            <th className="p-2.5 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, indice) => {
            const margem = calcularMargemItem(item);
            return (
            <tr
              key={`${item.produto_id}-${indice}`}
              className="border-b last:border-0 hover:bg-muted/20"
            >
              <td className="p-2.5 font-mono text-muted-foreground text-[11px]">
                {item.produto_codigo_auxiliar || "—"}
              </td>
              <td className="p-2.5 font-semibold text-foreground">
                {item.produto_descricao}
              </td>
              <td className="p-2.5 text-muted-foreground">
                {item.produto_departamento || "—"}
              </td>
              <td className="p-2.5 text-muted-foreground">
                {item.produto_un || "—"}
              </td>
              <td className="p-2.5 text-right font-mono">
                {formatarNumero(paraNumero(item.produto_qtde), 2)}
              </td>
              <td className="p-2.5 text-right font-mono">
                {formatarMoeda(paraNumero(item.produto_vlr_item))}
              </td>
              <td className="p-2.5 text-right font-mono text-muted-foreground">
                {formatarMoeda(paraNumero(item.produto_vlr_desconto))}
              </td>
              <td className="p-2.5 text-right font-mono text-muted-foreground">
                {formatarMoeda(paraNumero(item.produto_vlr_frete))}
              </td>
              <td className="p-2.5 text-right font-mono text-muted-foreground">
                {margem.custoUnitario === null ? "—" : formatarMoeda(margem.custoUnitario)}
              </td>
              <td className="p-2.5 text-right font-mono font-semibold">
                {margem.margemPercentual === null ? "—" : `${formatarNumero(margem.margemPercentual, 1)}%`}
              </td>
              <td className="p-2.5 text-right font-mono font-bold text-foreground">
                {formatarMoeda(valorItem(item))}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
