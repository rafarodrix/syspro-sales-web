"use client";

import { useState, useMemo } from "react";
import {
  BarChart3,
  DownloadIcon,
  PrinterIcon,
  Search,
  X,
  Layers,
  Award,
  Users,
  MapPin,
  CreditCard,
  Building2,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { VendaProduto } from "@/lib/syspro-api";
import {
  calcularCurvaABC,
  analiseDepartamentos,
  analiseVendedores,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  initialVendas?: VendaProduto[];
  initialError?: string;
}

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function RelatoriosView({
  empresas,
  empresaInicial,
  initialPeriod,
  initialVendas = [],
  initialError,
}: Props) {
  const [empresaId] = useState(
    empresaInicial && empresas.some((empresa) => empresa.id === empresaInicial)
      ? empresaInicial
      : (empresas[0]?.id ?? ""),
  );
  const [periodo, setPeriodo] = useState<Periodo>(
    initialPeriod ?? periodoMesAtual(),
  );
  const [loading, setLoading] = useState(false);
  const [vendas, setVendas] = useState<VendaProduto[]>(initialVendas);
  const [erro, setErro] = useState<string | null>(initialError ?? null);
  const [abaAtiva, setAbaAtiva] = useState("curva-abc");

  // Filtros internos
  const [busca, setBusca] = useState("");
  const [filtroClasseAbc, setFiltroClasseAbc] = useState<"todas" | "A" | "B" | "C">("todas");
  const [departamentoAberto, setDepartamentoAberto] = useState<string | null>(null);

  const empresaAtual = useMemo(
    () => empresas.find((e) => e.id === empresaId),
    [empresas, empresaId],
  );

  // Cálculos analíticos
  const relatorioABC = useMemo(() => calcularCurvaABC(vendas), [vendas]);
  const relatorioDeptos = useMemo(() => analiseDepartamentos(vendas), [vendas]);
  const relatorioVendedores = useMemo(() => analiseVendedores(vendas), [vendas]);
  const relatorioGeografico = useMemo(() => analiseGeografica(vendas), [vendas]);
  const relatorioFinanceiro = useMemo(() => analiseFinanceira(vendas), [vendas]);

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
      const resposta = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          dtInicial: dataInputParaSyspro(periodoDaConsulta.inicial),
          dtFinal: dataInputParaSyspro(periodoDaConsulta.final),
        }),
      });
      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        throw new Error(json.error ?? "Erro ao consultar relatórios.");
      }
      setVendas(json.vendas as VendaProduto[]);
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
        v.principalProduto ?? "—",
      ]);
    } else if (abaAtiva === "geografico") {
      nomeArquivo = "relatorio-geografico-pracas";
      cabecalho = [
        "Cidade",
        "UF",
        "Faturamento Total",
        "% Faturamento",
        "Pedidos / NF",
        "Clientes Atendidos",
        "Ticket Médio",
      ];
      linhas = cidadesFiltradas.map((c) => [
        c.cidade,
        c.uf,
        c.faturamento.toFixed(2),
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
              <div className="flex items-center gap-2">
                <BarChart3 className="size-5 text-primary" />
                <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                  Central de Relatórios & Inteligência
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Análise estruturada de Curva ABC, Departamentos, Vendedores, Praças e Financeiro.
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

      {/* Estrutura de Abas dos Relatórios */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Tabs
                value={abaAtiva}
                onValueChange={(v) => {
                  setAbaAtiva(v);
                  setBusca("");
                  setFiltroClasseAbc("todas");
                }}
                className="w-full sm:w-auto"
              >
                <TabsList className="grid grid-cols-2 sm:flex sm:flex-wrap h-auto p-1 gap-1">
                  <TabsTrigger value="curva-abc" className="text-xs font-bold gap-1.5 py-1.5">
                    <Sparkles className="size-3.5" />
                    Curva ABC (Produtos)
                  </TabsTrigger>
                  <TabsTrigger value="departamentos" className="text-xs font-bold gap-1.5 py-1.5">
                    <Layers className="size-3.5" />
                    Departamentos
                  </TabsTrigger>
                  <TabsTrigger value="vendedores" className="text-xs font-bold gap-1.5 py-1.5">
                    <Users className="size-3.5" />
                    Vendedores
                  </TabsTrigger>
                  <TabsTrigger value="geografico" className="text-xs font-bold gap-1.5 py-1.5">
                    <MapPin className="size-3.5" />
                    Cidades / Praças
                  </TabsTrigger>
                  <TabsTrigger value="financeiro" className="text-xs font-bold gap-1.5 py-1.5">
                    <CreditCard className="size-3.5" />
                    Financeiro & Fiscal
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="no-print flex items-center gap-2">
                <Button
                  onClick={exportarCsvRelatorio}
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs font-semibold"
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

            {/* Barra de Busca e Filtros de Linha */}
            <div className="no-print flex flex-wrap items-center gap-2.5 rounded-lg border bg-muted/20 p-2.5">
              <div className="relative flex-1 min-w-[200px] sm:min-w-[260px]">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Pesquisar registros neste relatório..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="h-8 w-full rounded-md border bg-background pl-8 pr-8 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
                {busca && (
                  <button
                    onClick={() => setBusca("")}
                    className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {abaAtiva === "curva-abc" && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground">Classe:</span>
                  {(["todas", "A", "B", "C"] as const).map((cls) => (
                    <Button
                      key={cls}
                      size="sm"
                      variant={filtroClasseAbc === cls ? "default" : "outline"}
                      onClick={() => setFiltroClasseAbc(cls)}
                      className="h-7 px-2.5 text-xs font-bold"
                    >
                      {cls === "todas" ? "Todas" : `Classe ${cls}`}
                    </Button>
                  ))}
                </div>
              )}
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
                          {relatorioABC.resumoA.percentualFaturamento.toFixed(1)}% Faturamento
                        </span>
                      </div>
                      <div className="mt-2 font-mono font-extrabold text-lg text-emerald-950 dark:text-emerald-200">
                        {moeda.format(relatorioABC.resumoA.faturamento)}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {relatorioABC.resumoA.itens} itens ({relatorioABC.resumoA.percentualItens.toFixed(1)}% do catálogo)
                      </div>
                    </div>

                    <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3.5">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-blue-600 font-bold text-white">Classe B</Badge>
                        <span className="font-mono text-xs font-bold text-blue-800 dark:text-blue-300">
                          {relatorioABC.resumoB.percentualFaturamento.toFixed(1)}% Faturamento
                        </span>
                      </div>
                      <div className="mt-2 font-mono font-extrabold text-lg text-blue-950 dark:text-blue-200">
                        {moeda.format(relatorioABC.resumoB.faturamento)}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {relatorioABC.resumoB.itens} itens ({relatorioABC.resumoB.percentualItens.toFixed(1)}% do catálogo)
                      </div>
                    </div>

                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-amber-600 font-bold text-white">Classe C</Badge>
                        <span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-300">
                          {relatorioABC.resumoC.percentualFaturamento.toFixed(1)}% Faturamento
                        </span>
                      </div>
                      <div className="mt-2 font-mono font-extrabold text-lg text-amber-950 dark:text-amber-200">
                        {moeda.format(relatorioABC.resumoC.faturamento)}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {relatorioABC.resumoC.itens} itens ({relatorioABC.resumoC.percentualItens.toFixed(1)}% do catálogo)
                      </div>
                    </div>
                  </div>

                  {/* Tabela Curva ABC */}
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-xs">
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
                              {numero.format(item.quantidade)} {item.un}
                            </td>
                            <td className="p-3 text-right font-mono text-muted-foreground">
                              {moeda.format(item.precoMedio)}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-foreground">
                              {moeda.format(item.total)}
                            </td>
                            <td className="p-3 text-right font-mono">{item.percentual.toFixed(2)}%</td>
                            <td className="p-3 text-right font-mono font-semibold text-primary">
                              {item.percentualAcumulado.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* ABA 2: DEPARTAMENTOS & PRODUTOS */}
              {/* ========================================================= */}
              {abaAtiva === "departamentos" && (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-xs">
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
                                  {numero.format(dep.quantidadeItens)}
                                </td>
                                <td className="p-3 text-right font-mono text-muted-foreground">
                                  {moeda.format(dep.ticketMedioPorItem)}
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-foreground">
                                  {moeda.format(dep.faturamento)}
                                </td>
                                <td className="p-3 text-right font-mono font-semibold text-primary">
                                  {dep.percentual.toFixed(1)}%
                                </td>
                              </tr>

                              {aberto && (
                                <tr key={`${dep.nome}-itens`}>
                                  <td colSpan={7} className="bg-muted/20 p-4">
                                    <div className="rounded-md border bg-background overflow-hidden">
                                      <div className="bg-muted/40 p-2.5 font-bold text-xs text-foreground border-b">
                                        Produtos no Departamento: {dep.nome} ({dep.produtos.length} itens)
                                      </div>
                                      <table className="w-full text-xs">
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
                                              <td className="p-2.5 text-right font-mono">{numero.format(prod.quantidade)} {prod.un}</td>
                                              <td className="p-2.5 text-right font-mono text-muted-foreground">{moeda.format(prod.precoMedio)}</td>
                                              <td className="p-2.5 text-right font-mono font-bold text-foreground">{moeda.format(prod.total)}</td>
                                              <td className="p-2.5 text-right font-mono text-primary font-semibold">{prod.percentual.toFixed(1)}%</td>
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
              {/* ABA 3: VENDEDORES & EQUIPE */}
              {/* ========================================================= */}
              {abaAtiva === "vendedores" && (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
                        <th className="p-3">Vendedor</th>
                        <th className="p-3 text-right">Pedidos / NF</th>
                        <th className="p-3 text-right">Clientes Únicos</th>
                        <th className="p-3 text-right">Qtd Itens</th>
                        <th className="p-3 text-right">Ticket Médio / Pedido</th>
                        <th className="p-3 text-right">Faturamento Total</th>
                        <th className="p-3 text-right">% Participação</th>
                        <th className="p-3">Principal Produto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendedoresFiltrados.map((v) => (
                        <tr key={v.nome} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-3 font-bold text-sm text-foreground">{v.nome}</td>
                          <td className="p-3 text-right font-mono">{numero.format(v.pedidos)}</td>
                          <td className="p-3 text-right font-mono">{numero.format(v.clientes)}</td>
                          <td className="p-3 text-right font-mono text-muted-foreground">
                            {numero.format(v.quantidadeItens)}
                          </td>
                          <td className="p-3 text-right font-mono text-muted-foreground">
                            {moeda.format(v.ticketMedio)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-foreground">
                            {moeda.format(v.faturamento)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-primary">
                            {v.percentual.toFixed(1)}%
                          </td>
                          <td className="p-3 text-muted-foreground truncate max-w-[200px]" title={v.principalProduto}>
                            {v.principalProduto ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ========================================================= */}
              {/* ABA 4: CIDADES & PRAÇAS */}
              {/* ========================================================= */}
              {abaAtiva === "geografico" && (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
                        <th className="p-3">Cidade</th>
                        <th className="p-3">UF</th>
                        <th className="p-3 text-right">Pedidos / NF</th>
                        <th className="p-3 text-right">Clientes Atendidos</th>
                        <th className="p-3 text-right">Ticket Médio</th>
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
                          <td className="p-3 text-right font-mono">{numero.format(c.pedidos)}</td>
                          <td className="p-3 text-right font-mono">{numero.format(c.clientes)}</td>
                          <td className="p-3 text-right font-mono text-muted-foreground">
                            {moeda.format(c.ticketMedio)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-foreground">
                            {moeda.format(c.faturamento)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-primary">
                            {c.percentual.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ========================================================= */}
              {/* ABA 5: FINANCEIRO & FISCAL */}
              {/* ========================================================= */}
              {abaAtiva === "financeiro" && (
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold">Formas de Pagamento Declaradas</CardTitle>
                      <CardDescription className="text-xs">Distribuição do faturamento por meio de recebimento.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <table className="w-full text-xs">
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
                              <td className="p-2.5 text-right font-mono">{fp.pedidos}</td>
                              <td className="p-2.5 text-right font-mono text-muted-foreground">{moeda.format(fp.ticketMedio)}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-foreground">{moeda.format(fp.total)}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-primary">{fp.percentual.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>

                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold">Modelos de Documentos Fiscais</CardTitle>
                      <CardDescription className="text-xs">Divisão entre NF-e (Modelo 55) e NFC-e (Modelo 65).</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <table className="w-full text-xs">
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
                              <td className="p-2.5 text-right font-mono">{m.pedidos}</td>
                              <td className="p-2.5 text-right font-mono text-muted-foreground">{moeda.format(m.ticketMedio)}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-foreground">{moeda.format(m.total)}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-primary">{m.percentual.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
