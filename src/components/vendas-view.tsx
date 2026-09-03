"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  DownloadIcon,
  PrinterIcon,
  Search,
  SearchX,
  FilterX,
  LayoutList,
  AlignJustify,
  X,
  ChevronsUpDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Maximize2,
  Minimize2,
  FileText,
} from "lucide-react";
import type { VendaProduto, VendaComEmpresa } from "@/lib/syspro-api";
import {
  agruparVendasPorNota,
  dataInputParaSyspro,
  formatarDataInputParaBR,
  paraNumero,
  type VendaAgrupada,
} from "@/lib/vendas";
import {
  DateRangeFilter,
  periodoMesAtual,
  salvarPeriodoCookie,
  type Periodo,
} from "@/components/date-range-filter";
import { buscarVendasApi } from "@/lib/vendas-client";
import { exportarParaCSV } from "@/lib/exportar-csv";
import { exportarPdfVendas } from "@/lib/pdf-export";
import { formatarMoeda, formatarNumero } from "@/lib/formatters";
import { ExportDropdown } from "@/components/export-dropdown";
import { TablePagination } from "@/components/table-pagination";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  initialPeriod?: Periodo;
  initialVendas?: (VendaProduto | VendaComEmpresa)[];
  initialError?: string;
}

type CampoOrdenacao = "emissao" | "numero" | "cliente" | "quantidadeItens" | "total";
type DirecaoOrdenacao = "asc" | "desc";

export function VendasView({
  empresas,
  empresaInicial,
  initialPeriod,
  initialVendas = [],
  initialError,
}: Props) {
  const searchParams = useSearchParams();
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
  const [notasAbertas, setNotasAbertas] = useState<Set<string>>(new Set());

  // Densidade da tabela
  const [densidade, setDensidade] = useState<"compacto" | "confortavel">("confortavel");

  // Filtros
  const [buscaVenda, setBuscaVenda] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>("todos");
  const [filtroVendedor, setFiltroVendedor] = useState<string>("todos");
  const [filtroDepartamento, setFiltroDepartamento] = useState<string>("todos");
  const [filtroFormaPagto, setFiltroFormaPagto] = useState<string>("todos");
  const [filtroModelo, setFiltroModelo] = useState<string>("todos");

  // Ordenação
  const [campoOrdenacao, setCampoOrdenacao] = useState<CampoOrdenacao>("emissao");
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState<DirecaoOrdenacao>("desc");

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);

  // Inicializar filtros a partir dos parâmetros de busca da URL (Drill-down)
  useEffect(() => {
    const paramEmpresa = searchParams.get("empresa");
    const paramVendedor = searchParams.get("vendedor");
    const paramDepartamento = searchParams.get("departamento");
    const paramFormaPagto = searchParams.get("formaPagamento");
    const paramBusca = searchParams.get("busca");

    if (paramEmpresa) setFiltroEmpresa(paramEmpresa);
    if (paramVendedor) setFiltroVendedor(paramVendedor);
    if (paramDepartamento) setFiltroDepartamento(paramDepartamento);
    if (paramFormaPagto) setFiltroFormaPagto(paramFormaPagto);
    if (paramBusca) setBuscaVenda(paramBusca);
  }, [searchParams]);

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
            item.produto_id?.toLowerCase().includes(termo)
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
  ]);

  // Ordenação
  const notasOrdenadas = useMemo(() => {
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
  }, [notasFiltradas, campoOrdenacao, direcaoOrdenacao]);

  // Paginação
  const totalPaginas = Math.ceil(notasOrdenadas.length / itensPorPagina) || 1;
  const notasPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return notasOrdenadas.slice(inicio, inicio + itensPorPagina);
  }, [notasOrdenadas, paginaAtual, itensPorPagina]);

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
    return { faturamento, totalNotas, clientes: clientes.size, ticketMedio, itensTotal };
  }, [notasFiltradas]);

  function alternarOrdenacao(campo: CampoOrdenacao) {
    if (campoOrdenacao === campo) {
      setDirecaoOrdenacao((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setCampoOrdenacao(campo);
      setDirecaoOrdenacao("desc");
    }
    setPaginaAtual(1);
  }

  function alternarNota(id: string) {
    setNotasAbertas((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function expandirTodas() {
    setNotasAbertas(new Set(notasPaginadas.map((n) => n.id)));
  }

  function recolherTodas() {
    setNotasAbertas(new Set());
  }

  function limparTodosFiltros() {
    setBuscaVenda("");
    setFiltroEmpresa("todos");
    setFiltroVendedor("todos");
    setFiltroDepartamento("todos");
    setFiltroFormaPagto("todos");
    setFiltroModelo("todos");
    setPaginaAtual(1);
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
    salvarPeriodoCookie(periodoDaConsulta);
    setLoading(true);
    setErro(null);
    setNotasAbertas(new Set());
    try {
      const dados = await buscarVendasApi(empresaId, periodoDaConsulta);
      setVendas(dados);
      setPaginaAtual(1);
      toast.success("Vendas consultadas com sucesso!");
    } catch (causa) {
      const mensagem =
        causa instanceof Error ? causa.message : "Erro ao consultar as vendas.";
      setErro(mensagem);
      setVendas([]);
      toast.error(mensagem);
    } finally {
      setLoading(false);
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
        periodo,
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
    filtroModelo !== "todos";

  return (
    <div className="flex flex-col gap-6">
      {/* Painel de Consulta & Filtros */}
      <Card className="no-print border-border/60 shadow-sm backdrop-blur-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                Consulta de Vendas
              </CardTitle>
              <CardDescription className="text-xs">
                Selecione o período e aplique filtros para analisar notas fiscais e itens detalhados.
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
        <Card className="border-destructive/50 bg-destructive/5 shadow-xs">
          <CardContent className="pt-6 text-sm font-medium text-destructive">
            {erro}
          </CardContent>
        </Card>
      ) : null}

      {/* Tabela Principal de Vendas */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Notas Fiscais Emitidas
                </CardTitle>
                <CardDescription className="text-xs">
                  {notasFiltradas.length} nota(s) encontrada(s) no período filtrado.
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
                  onExportarCsv={() => exportarCsv(vendas)}
                  onImprimir={() => handleExportarPdf("imprimir")}
                  disabled={loading || vendas.length === 0}
                  label="Exportar"
                />
              </div>
            </div>

            {/* Barra de Busca e Filtros Combinados */}
            <div className="no-print flex flex-wrap items-center gap-2.5 rounded-lg border bg-muted/20 p-3">
              {/* Campo de Busca com Botão Limpar */}
              <div className="relative flex-1 min-w-[200px] sm:min-w-[240px]">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por NF, cliente, cidade ou produto..."
                  value={buscaVenda}
                  onChange={(e) => {
                    setBuscaVenda(e.target.value);
                    setPaginaAtual(1);
                  }}
                  className="h-9 w-full rounded-md border bg-background pl-8 pr-8 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
                {buscaVenda && (
                  <button
                    onClick={() => {
                      setBuscaVenda("");
                      setPaginaAtual(1);
                    }}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    title="Limpar busca"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Filtro Empresa (quando em modo consolidado) */}
              {opcoesFiltro.empresas.length > 1 && (
                <div className="w-44 sm:w-48">
                  <Select
                    value={filtroEmpresa}
                    onValueChange={(v) => {
                      setFiltroEmpresa(v);
                      setPaginaAtual(1);
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
                      setPaginaAtual(1);
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
                      setPaginaAtual(1);
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
                      setPaginaAtual(1);
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

              {temFiltrosAtivos && (
                <Button
                  onClick={limparTodosFiltros}
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpar filtros
                </Button>
              )}

              {/* Seletor de Densidade */}
              <div className="flex items-center gap-0.5 rounded-lg border bg-muted/20 p-0.5 ml-auto">
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
            </div>
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
              <div className="no-print mb-4 grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/20 p-3.5 sm:grid-cols-4">
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Faturado
                  </span>
                  <span className="font-mono text-base font-extrabold text-foreground">
                    {formatarMoeda(resumoBusca.faturamento)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Notas Fiscais
                  </span>
                  <span className="font-mono text-base font-extrabold text-foreground">
                    {formatarNumero(resumoBusca.totalNotas, 0)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Clientes Atendidos
                  </span>
                  <span className="font-mono text-base font-extrabold text-foreground">
                    {formatarNumero(resumoBusca.clientes, 0)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Ticket Médio
                  </span>
                  <span className="font-mono text-base font-extrabold text-foreground">
                    {formatarMoeda(resumoBusca.ticketMedio)}
                  </span>
                </div>
              </div>

              {/* Tabela com Ordenação */}
              <div className="overflow-x-auto rounded-md border">
                <div className="min-w-[820px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs font-bold">
                      <TableHead className="w-10" />
                      <TableHead
                        onClick={() => alternarOrdenacao("numero")}
                        className="cursor-pointer select-none hover:text-foreground"
                      >
                        <div className="flex items-center gap-1">
                          <span>NF</span>
                          <IconeOrdenacao
                            campo="numero"
                            campoAtual={campoOrdenacao}
                            direcao={direcaoOrdenacao}
                          />
                        </div>
                      </TableHead>
                      <TableHead
                        onClick={() => alternarOrdenacao("emissao")}
                        className="cursor-pointer select-none hover:text-foreground"
                      >
                        <div className="flex items-center gap-1">
                          <span>Emissão</span>
                          <IconeOrdenacao
                            campo="emissao"
                            campoAtual={campoOrdenacao}
                            direcao={direcaoOrdenacao}
                          />
                        </div>
                      </TableHead>
                      <TableHead
                        onClick={() => alternarOrdenacao("cliente")}
                        className="cursor-pointer select-none hover:text-foreground"
                      >
                        <div className="flex items-center gap-1">
                          <span>Cliente</span>
                          <IconeOrdenacao
                            campo="cliente"
                            campoAtual={campoOrdenacao}
                            direcao={direcaoOrdenacao}
                          />
                        </div>
                      </TableHead>
                      <TableHead className="hidden md:table-cell">Vendedor</TableHead>
                      <TableHead
                        onClick={() => alternarOrdenacao("quantidadeItens")}
                        className="cursor-pointer select-none text-right hover:text-foreground"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Itens</span>
                          <IconeOrdenacao
                            campo="quantidadeItens"
                            campoAtual={campoOrdenacao}
                            direcao={direcaoOrdenacao}
                          />
                        </div>
                      </TableHead>
                      <TableHead
                        onClick={() => alternarOrdenacao("total")}
                        className="cursor-pointer select-none text-right hover:text-foreground"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Total (R$)</span>
                          <IconeOrdenacao
                            campo="total"
                            campoAtual={campoOrdenacao}
                            direcao={direcaoOrdenacao}
                          />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notasPaginadas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                              <SearchX className="size-5" />
                            </div>
                            <span className="font-bold text-sm text-foreground">
                              Nenhuma nota encontrada
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Nenhum resultado corresponde aos filtros aplicados para este período.
                            </span>
                            {temFiltrosAtivos && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={limparTodosFiltros}
                                className="mt-2 text-xs font-semibold gap-1.5"
                              >
                                <FilterX className="size-3.5" />
                                Limpar filtros aplicados
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      notasPaginadas.map((nota) => (
                        <NotaRow
                          key={nota.id}
                          nota={nota}
                          aberta={notasAbertas.has(nota.id)}
                          onToggle={() => alternarNota(nota.id)}
                          densidade={densidade}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              </div>

              {/* Barra de Paginação Padrão */}
              <TablePagination
                paginaAtual={paginaAtual}
                totalItens={notasOrdenadas.length}
                itensPorPagina={itensPorPagina}
                onPaginaChange={setPaginaAtual}
                onItensPorPaginaChange={setItensPorPagina}
                labelItens="notas filtradas"
                opcoesItensPorPagina={[25, 50, 100]}
                className="mt-4 border-t border-border/60"
              />
            </>
          ) : !loading && !erro ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
              <BarChart3 className="size-8 text-muted-foreground/60" />
              <p className="font-semibold text-foreground">
                Nenhuma venda carregada para o período.
              </p>
              <p className="text-xs text-muted-foreground">
                Selecione um período acima e clique em &quot;Consultar Vendas&quot;.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function IconeOrdenacao({
  campo,
  campoAtual,
  direcao,
}: {
  campo: CampoOrdenacao;
  campoAtual: CampoOrdenacao;
  direcao: DirecaoOrdenacao;
}) {
  if (campo !== campoAtual) {
    return <ArrowUpDown className="size-3 text-muted-foreground/50" />;
  }
  return direcao === "asc" ? (
    <ArrowUp className="size-3 text-primary font-bold" />
  ) : (
    <ArrowDown className="size-3 text-primary font-bold" />
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
    "Modelo",
    "Forma de pagamento",
    "Código Produto",
    "Produto",
    "Departamento",
    "Unidade",
    "Quantidade",
    "Valor unitário",
    "Desconto",
    "Frete",
    "ICMS-ST",
    "Total",
  ];
  const linhas = vendas.map((venda) => [
    (venda as VendaComEmpresa).empresa_nome || "Empresa Principal",
    venda.nf_numero,
    venda.nf_dt_emissao,
    venda.cliente_nome,
    venda.cliente_cidade,
    venda.cliente_uf,
    venda.vendedor_nome,
    venda.nf_modelo,
    venda.nf_forma_pagto,
    venda.produto_id,
    venda.produto_descricao,
    venda.produto_departamento,
    venda.produto_un,
    paraNumero(venda.produto_qtde),
    paraNumero(venda.produto_vlr_item),
    paraNumero(venda.produto_vlr_desconto),
    paraNumero(venda.produto_vlr_frete),
    paraNumero(venda.produto_vlr_icms_stb),
    paraNumero(venda.produto_vlr_total_liquido),
  ]);
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
  link.download = `vendas-syspro-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function NotaRow({
  nota,
  aberta,
  onToggle,
  densidade = "confortavel",
}: {
  nota: VendaAgrupada;
  aberta: boolean;
  onToggle: () => void;
  densidade?: "compacto" | "confortavel";
}) {
  const isCompacto = densidade === "compacto";
  const cellPadding = isCompacto ? "py-1.5 px-3" : "py-3 px-4";

  return (
    <>
      <TableRow data-state={aberta ? "selected" : undefined} className="hover:bg-muted/25 transition-colors">
        <TableCell className={isCompacto ? "py-1 px-2 w-8" : "py-2.5 px-3 w-10"}>
          <Button
            aria-expanded={aberta}
            aria-label={`${aberta ? "Ocultar" : "Mostrar"} itens da nota ${nota.numero}`}
            onClick={onToggle}
            size="icon-sm"
            variant="ghost"
            className={isCompacto ? "size-6" : "size-7"}
          >
            {aberta ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </Button>
        </TableCell>
        <TableCell className={`font-mono font-bold text-xs text-foreground ${cellPadding}`}>
          <div className="flex flex-col">
            <span>{nota.numero}</span>
            {nota.empresaNome && (
              <span className="text-[10px] font-sans font-medium text-primary truncate max-w-[140px]" title={nota.empresaNome}>
                {nota.empresaNome}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className={`font-mono text-xs text-muted-foreground ${cellPadding}`}>{nota.emissao}</TableCell>
        <TableCell className={cellPadding}>
          <div className="font-semibold text-foreground text-xs truncate max-w-[240px]" title={nota.cliente}>{nota.cliente}</div>
          {nota.cidade || nota.uf ? (
            <div className="text-[10.5px] text-muted-foreground">
              {[nota.cidade, nota.uf].filter(Boolean).join(" · ")}
            </div>
          ) : null}
        </TableCell>
        <TableCell className={`hidden md:table-cell text-xs text-muted-foreground truncate max-w-[150px] ${cellPadding}`} title={nota.vendedor}>
          {nota.vendedor}
        </TableCell>
        <TableCell className={`text-right font-mono text-xs ${cellPadding}`}>
          {formatarNumero(nota.quantidadeItens, 2)}
        </TableCell>
        <TableCell className={`text-right font-mono font-bold text-xs text-foreground ${cellPadding}`}>
          {formatarMoeda(nota.total)}
        </TableCell>
      </TableRow>
      {aberta ? (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30 p-4">
            <TabelaItens itens={nota.itens} />
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

function TabelaItens({ itens }: { itens: VendaProduto[] }) {
  return (
    <div className="overflow-x-auto rounded-md border bg-background shadow-xs">
      <table className="w-full min-w-[760px] text-xs">
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
            <th className="p-2.5 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, indice) => (
            <tr
              key={`${item.produto_id}-${indice}`}
              className="border-b last:border-0 hover:bg-muted/20"
            >
              <td className="p-2.5 font-mono text-muted-foreground text-[11px]">
                {item.produto_id || "—"}
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
              <td className="p-2.5 text-right font-mono font-bold text-foreground">
                {formatarMoeda(paraNumero(item.produto_vlr_total_liquido || item.produto_vlr_total_item))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
