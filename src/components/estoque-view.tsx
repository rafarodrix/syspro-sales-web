"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeftRight, PackageSearch, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { MovimentoKardexPublico } from "@/lib/kardex";
import type { PosicaoEstoque, ResumoSaudeEstoque, SituacaoEstoque } from "@/lib/estoque-saude";
import type { LimitesEstoque } from "@/lib/estoque-saude";
import { dataInputParaSyspro } from "@/lib/vendas";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import { exportarParaCSV } from "@/lib/exportar-csv";
import { useTablePagination } from "@/hooks/use-table-pagination";
import { AnalysisQueryCard } from "@/components/analytics/analysis-query-card";
import { DataFilterBar } from "@/components/data-filter-bar";
import { DateRangeFilter, periodoMesAtual, type Periodo } from "@/components/date-range-filter";
import { EstoqueMetricas } from "@/components/estoque/estoque-metricas";
import { ExportDropdown } from "@/components/export-dropdown";
import { ReportTable } from "./relatorios/report-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EmpresaOption {
  id: string;
  cnpj: string;
  razaoSocial: string;
  coberturaCriticaDias: number;
  coberturaAtencaoDias: number;
  coberturaExcessoDias: number;
}
interface RespostaEstoque {
  movimentos: MovimentoKardexPublico[];
  posicoes: PosicaoEstoque[];
  resumo: ResumoSaudeEstoque;
  limites: LimitesEstoque;
}
type FiltroSituacao = SituacaoEstoque | "todas" | "baixa_cobertura";

const rotulosSituacao: Record<SituacaoEstoque, string> = {
  ruptura: "Ruptura", critico: "Crítico", atencao: "Atenção", saudavel: "Saudável", excesso: "Excesso", sem_giro: "Sem saída",
};
const classesSituacao: Record<SituacaoEstoque, string> = {
  ruptura: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400",
  critico: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  atencao: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  saudavel: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  excesso: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  sem_giro: "border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-400",
};

function SituacaoBadge({ situacao }: { situacao: SituacaoEstoque }) {
  return <Badge variant="outline" className={classesSituacao[situacao]}>{rotulosSituacao[situacao]}</Badge>;
}

function dataVisual(valor: string | null): string {
  if (!valor) return "—";
  const partes = valor.slice(0, 10).split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : valor;
}

function coberturaVisual(valor: number | null, demanda: number): string {
  if (valor !== null) return `${formatarNumero(valor, 1)} dias`;
  return demanda <= 0 ? "Sem demanda" : "—";
}

export function EstoqueView({ empresas, empresaInicial }: { empresas: EmpresaOption[]; empresaInicial?: string }) {
  const [empresaId, setEmpresaId] = useState(empresaInicial && empresas.some((empresa) => empresa.id === empresaInicial) ? empresaInicial : (empresas[0]?.id ?? ""));
  const empresaAtual = empresas.find((empresa) => empresa.id === empresaId);
  const [periodo, setPeriodo] = useState<Periodo>(periodoMesAtual());
  const [movimentos, setMovimentos] = useState<MovimentoKardexPublico[]>([]);
  const [posicoes, setPosicoes] = useState<PosicaoEstoque[]>([]);
  const [resumoSaude, setResumoSaude] = useState<ResumoSaudeEstoque | null>(null);
  const [limites, setLimites] = useState<LimitesEstoque>(() => ({
    criticoDias: empresaAtual?.coberturaCriticaDias ?? 7,
    atencaoDias: empresaAtual?.coberturaAtencaoDias ?? 15,
    excessoDias: empresaAtual?.coberturaExcessoDias ?? 90,
  }));
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroDirecao, setFiltroDirecao] = useState("todas");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroGrupo, setFiltroGrupo] = useState("todos");
  const [filtroSituacao, setFiltroSituacao] = useState<FiltroSituacao>("todas");
  const [aba, setAba] = useState("visao-geral");

  useEffect(() => {
    if (!empresaInicial) return;
    const frame = requestAnimationFrame(() => setEmpresaId(empresaInicial));
    return () => cancelAnimationFrame(frame);
  }, [empresaInicial]);

  async function consultar() {
    if (!empresaId) { toast.error("Selecione uma empresa."); return; }
    setLoading(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/estoque", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId, dtInicial: dataInputParaSyspro(periodo.inicial), dtFinal: dataInputParaSyspro(periodo.final) }),
      });
      const dados = await resposta.json().catch(() => ({})) as Partial<RespostaEstoque> & { error?: string };
      if (!resposta.ok) throw new Error(dados.error || "Erro ao consultar o estoque.");
      setMovimentos(dados.movimentos ?? []);
      setPosicoes(dados.posicoes ?? []);
      setResumoSaude(dados.resumo ?? null);
      if (dados.limites) setLimites(dados.limites);
      movimentosPaginacao.reiniciar();
      posicoesPaginacao.reiniciar();
      devolucoesPaginacao.reiniciar();
      transferenciasPaginacao.reiniciar();
      setAba("visao-geral");
      toast.success(`${dados.posicoes?.length ?? 0} produtos e ${dados.movimentos?.length ?? 0} movimentações carregados.`);
    } catch (causa) {
      const mensagem = causa instanceof Error ? causa.message : "Erro ao consultar o estoque.";
      setErro(mensagem); setMovimentos([]); setPosicoes([]); setResumoSaude(null); toast.error(mensagem);
    } finally { setLoading(false); }
  }

  const gruposDisponiveis = useMemo(() => Array.from(new Set(movimentos.map((item) => item.grupoDocumento).filter(Boolean))).sort(), [movimentos]);
  const movimentosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return movimentos.filter((item) => {
      const textoBate = !termo || [item.produtoCodigoAuxiliar, item.produtoDescricao, item.documento, item.participante, item.grupoDocumento, item.descricaoGrupoDocumento].some((campo) => campo.toLowerCase().includes(termo));
      return textoBate && (filtroDirecao === "todas" || item.direcao === filtroDirecao) && (filtroCategoria === "todas" || item.classificacao.categoria === filtroCategoria) && (filtroGrupo === "todos" || item.grupoDocumento === filtroGrupo);
    });
  }, [busca, filtroDirecao, filtroCategoria, filtroGrupo, movimentos]);
  const posicoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return posicoes.filter((item) => {
      const textoBate = !termo || [item.codigo, item.produto, item.marca]
        .some((campo) => campo.toLowerCase().includes(termo));
      const situacaoBate = filtroSituacao === "todas"
        || item.situacao === filtroSituacao
        || (filtroSituacao === "baixa_cobertura"
          && (item.situacao === "critico" || item.situacao === "atencao"));
      return textoBate && situacaoBate;
    });
  }, [busca, filtroSituacao, posicoes]);
  const alertas = useMemo(() => posicoesFiltradas.filter((item) => item.situacao !== "saudavel").slice(0, 20), [posicoesFiltradas]);
  const devolucoes = useMemo(() => movimentosFiltrados.filter((item) => item.classificacao.categoria === "devolucao_venda" || item.classificacao.categoria === "devolucao_compra"), [movimentosFiltrados]);
  const transferencias = useMemo(() => movimentosFiltrados.filter((item) => item.classificacao.categoria === "transferencia"), [movimentosFiltrados]);
  const movimentosPaginacao = useTablePagination(movimentosFiltrados);
  const posicoesPaginacao = useTablePagination(posicoesFiltradas);
  const devolucoesPaginacao = useTablePagination(devolucoes);
  const transferenciasPaginacao = useTablePagination(transferencias);
  const totalVisaoAtual = aba === "visao-geral"
    ? posicoesFiltradas.filter((item) => item.situacao !== "saudavel").length
    : aba === "posicao"
      ? posicoesFiltradas.length
      : aba === "devolucoes"
        ? devolucoes.length
        : aba === "transferencias"
          ? transferencias.length
          : movimentosFiltrados.length;

  function reiniciarPaginacoes() {
    movimentosPaginacao.reiniciar();
    posicoesPaginacao.reiniciar();
    devolucoesPaginacao.reiniciar();
    transferenciasPaginacao.reiniciar();
  }

  function abrirKardex(item: PosicaoEstoque) {
    setBusca(item.codigo === "Sem código" ? item.produto : item.codigo);
    setFiltroDirecao("todas"); setFiltroCategoria("todas"); setFiltroGrupo("todos"); movimentosPaginacao.reiniciar(); setAba("movimentacoes");
  }
  function abrirPosicaoComSituacao(situacao: FiltroSituacao) {
    setFiltroSituacao(situacao);
    posicoesPaginacao.reiniciar();
    setAba("posicao");
  }
  function abrirDevolucoesVenda() {
    setFiltroDirecao("todas");
    setFiltroCategoria("devolucao_venda");
    setFiltroGrupo("todos");
    devolucoesPaginacao.reiniciar();
    setAba("devolucoes");
  }
  function exportarVisaoAtual() {
    const nomeEmpresa = (empresaAtual?.razaoSocial ?? "empresa")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .toLowerCase();
    const sufixo = `${periodo.inicial}-a-${periodo.final}`;

    if (aba === "visao-geral" || aba === "posicao") {
      const itens = aba === "visao-geral"
        ? posicoesFiltradas.filter((item) => item.situacao !== "saudavel")
        : posicoesFiltradas;
      exportarParaCSV(
        `estoque-${aba}-${nomeEmpresa}-${sufixo}`,
        ["Código auxiliar", "Produto", "Marca", "Situação", "Estoque", "Venda", "EDV", "Demanda líquida", "Cobertura (dias)", "Custo aquisição", "Custo reposição", "Valor reposição", "Último movimento"],
        itens.map((item) => [
          item.codigo,
          item.produto,
          item.marca,
          rotulosSituacao[item.situacao],
          item.estoqueAtual,
          item.quantidadeVendida,
          item.quantidadeDevolvida,
          item.demandaLiquida,
          item.coberturaDias,
          item.custoAquisicaoMedio,
          item.custoReposicaoMedio,
          item.valorReposicao,
          dataVisual(item.ultimoMovimento),
        ]),
      );
      toast.success(`${itens.length} produto(s) exportado(s).`);
      return;
    }

    const itens = aba === "devolucoes"
      ? devolucoes
      : aba === "transferencias"
        ? transferencias
        : movimentosFiltrados;
    exportarParaCSV(
      `estoque-${aba}-${nomeEmpresa}-${sufixo}`,
      ["Data", "Código auxiliar", "Produto", "Documento", "Grupo", "Categoria", "Participante", "Direção", "Quantidade", "Saldo", "Valor"],
      itens.map((item) => [
        dataVisual(item.dataMovimento),
        item.produtoCodigoAuxiliar,
        item.produtoDescricao,
        item.documento,
        item.grupoDocumento,
        item.classificacao.rotulo,
        item.participante,
        item.direcao,
        Math.abs(item.quantidadeMovimentada),
        item.saldo,
        Math.abs(item.valorTotal),
      ]),
    );
    toast.success(`${itens.length} movimento(s) exportado(s).`);
  }
  const filtrosAtivos = Boolean(busca) || filtroDirecao !== "todas" || filtroCategoria !== "todas" || filtroGrupo !== "todos" || filtroSituacao !== "todas";
  function limparFiltros() { setBusca(""); setFiltroDirecao("todas"); setFiltroCategoria("todas"); setFiltroGrupo("todos"); setFiltroSituacao("todas"); reiniciarPaginacoes(); }

  return (
    <div className="flex flex-col gap-6">
      <AnalysisQueryCard
        icon={PackageSearch}
        title="Posição e Saúde do Estoque"
        description="Saldo, demanda líquida, custos, cobertura e movimentações por empresa. Período máximo de 31 dias."
        actions={<ExportDropdown onExportarCsv={exportarVisaoAtual} disabled={loading || !resumoSaude || totalVisaoAtual === 0} label="Exportar visão" />}
        footer={`Parâmetros da empresa: crítico abaixo de ${limites.criticoDias} dias · atenção abaixo de ${limites.atencaoDias} dias · excesso acima de ${limites.excessoDias} dias.`}
      >
        <DateRangeFilter value={periodo} onChange={setPeriodo} onConsultar={consultar} loading={loading} maximoDias={31} />
      </AnalysisQueryCard>

      {erro ? <Card className="border-destructive/50 bg-destructive/5"><CardContent className="pt-6 text-sm font-medium text-destructive">{erro}</CardContent></Card> : null}

      {resumoSaude ? <>
        <EstoqueMetricas
          resumo={resumoSaude}
          limites={limites}
          onRupturas={() => abrirPosicaoComSituacao("ruptura")}
          onBaixaCobertura={() => abrirPosicaoComSituacao("baixa_cobertura")}
          onExcesso={() => abrirPosicaoComSituacao("excesso")}
          onDevolucoes={abrirDevolucoesVenda}
        />
        {resumoSaude.movimentosSemProdutoId > 0 ? <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300" role="alert"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><span>{formatarNumero(resumoSaude.movimentosSemProdutoId)} movimentação(ões) sem ID de produto ficaram fora dos agrupamentos, para evitar vínculos incorretos.</span></div> : null}
        {resumoSaude.saldosNegativos > 0 ? <div className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-800 dark:text-rose-300" role="alert"><ShieldAlert className="mt-0.5 size-4 shrink-0" /><span>{formatarNumero(resumoSaude.saldosNegativos)} produto(s) apresentam saldo negativo e precisam de conferência no Kardex.</span></div> : null}
      </> : null}

      <Tabs value={aba} onValueChange={setAba} className="gap-4">
        <div className="overflow-x-auto pb-1"><TabsList className="min-w-max"><TabsTrigger value="visao-geral">Visão geral</TabsTrigger><TabsTrigger value="posicao">Posição por produto</TabsTrigger><TabsTrigger value="movimentacoes">Movimentações</TabsTrigger><TabsTrigger value="devolucoes">Devoluções</TabsTrigger><TabsTrigger value="transferencias">Transferências</TabsTrigger></TabsList></div>

        <DataFilterBar busca={busca} onBuscaChange={(valor) => { setBusca(valor); reiniciarPaginacoes(); }} placeholder="Buscar código, produto, marca, documento ou participante..." temFiltrosAtivos={filtrosAtivos} onLimpar={limparFiltros}>
          {aba === "visao-geral" || aba === "posicao" ? <div className="w-40 sm:w-44"><Select value={filtroSituacao} onValueChange={(valor) => { setFiltroSituacao(valor as FiltroSituacao); posicoesPaginacao.reiniciar(); }}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Situação" /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as situações</SelectItem><SelectItem value="baixa_cobertura">Baixa cobertura</SelectItem>{Object.entries(rotulosSituacao).map(([valor, rotulo]) => <SelectItem key={valor} value={valor}>{rotulo}</SelectItem>)}</SelectContent></Select></div> : <>
            <div className="w-40 sm:w-44"><Select value={filtroDirecao} onValueChange={(valor) => { setFiltroDirecao(valor); movimentosPaginacao.reiniciar(); devolucoesPaginacao.reiniciar(); transferenciasPaginacao.reiniciar(); }}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Entrada / saída" /></SelectTrigger><SelectContent><SelectItem value="todas">Entradas e saídas</SelectItem><SelectItem value="entrada">Somente entradas</SelectItem><SelectItem value="saida">Somente saídas</SelectItem></SelectContent></Select></div>
            <div className="w-40 sm:w-44"><Select value={filtroCategoria} onValueChange={(valor) => { setFiltroCategoria(valor); movimentosPaginacao.reiniciar(); devolucoesPaginacao.reiniciar(); transferenciasPaginacao.reiniciar(); }}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as categorias</SelectItem><SelectItem value="venda">Vendas</SelectItem><SelectItem value="devolucao_venda">Devoluções de venda</SelectItem><SelectItem value="compra">Compras</SelectItem><SelectItem value="devolucao_compra">Devoluções de compra</SelectItem><SelectItem value="transferencia">Transferências</SelectItem><SelectItem value="bonificacao">Bonificações</SelectItem><SelectItem value="fiscal">Emissões fiscais (NF-e)</SelectItem><SelectItem value="outros">Outros movimentos</SelectItem></SelectContent></Select></div>
            <div className="w-40 sm:w-44"><Select value={filtroGrupo} onValueChange={(valor) => { setFiltroGrupo(valor); movimentosPaginacao.reiniciar(); devolucoesPaginacao.reiniciar(); transferenciasPaginacao.reiniciar(); }}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Grupo" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os grupos</SelectItem>{gruposDisponiveis.map((grupo) => <SelectItem key={grupo} value={grupo}>{grupo}</SelectItem>)}</SelectContent></Select></div>
          </>}
        </DataFilterBar>

        <TabsContent value="visao-geral">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fila de atenção</CardTitle>
              <CardDescription>
                Produtos priorizados por ruptura, baixa cobertura, ausência de saída e excesso.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-3 pb-3">
                <ReportTable<PosicaoEstoque>
                  label="produtos em atenção"
                  caption="Fila de atenção do estoque"
                  data={alertas}
                  rowKey={(item) => `${item.codigo}-${item.produto}`}
                  showExport={false}
                  columns={[
                    {
                      id: "produto",
                      header: <>Produto</>,
                      kind: "name",
                      value: (item) => item.produto,
                      cell: (item) => (
                        <>
                          <p className="text-xs font-medium">{item.produto}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{item.codigo}</p>
                        </>
                      ),
                    },
                    {
                      id: "situacao",
                      header: <>Situação</>,
                      kind: "name",
                      value: (item) => item.situacao,
                      cell: (item) => <SituacaoBadge situacao={item.situacao} />,
                    },
                    {
                      id: "estoque",
                      header: <>Estoque</>,
                      kind: "number",
                      value: (item) => item.estoqueAtual,
                      cell: (item) => <span className="font-semibold">{formatarNumero(item.estoqueAtual, 2)}</span>,
                    },
                    {
                      id: "demanda",
                      header: <>Demanda líquida</>,
                      kind: "number",
                      value: (item) => item.demandaLiquida,
                      cell: (item) => <>{formatarNumero(item.demandaLiquida, 2)}</>,
                    },
                    {
                      id: "cobertura",
                      header: <>Cobertura</>,
                      kind: "number",
                      value: (item) => item.coberturaDias,
                      cell: (item) => <>{coberturaVisual(item.coberturaDias, item.demandaLiquida)}</>,
                    },
                    {
                      id: "reposicao",
                      header: <>Reposição</>,
                      kind: "currency",
                      value: (item) => item.valorReposicao,
                      cell: (item) => <>{item.valorReposicao === null ? "—" : formatarMoeda(item.valorReposicao)}</>,
                    },
                    {
                      id: "acoes",
                      header: <></>,
                      cell: (item) => (
                        <Button variant="ghost" size="sm" onClick={() => abrirKardex(item)}>
                          Kardex
                        </Button>
                      ),
                    },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posicao">
          <Card><CardHeader><CardTitle className="text-base">Posição por produto</CardTitle><CardDescription>{posicoesFiltradas.length} produto(s). Custos médios consideram apenas itens com custo informado no período.</CardDescription></CardHeader>
            <CardContent className="p-0">
              <div className="px-3 pb-3">
                <ReportTable<PosicaoEstoque>
                  label="produtos"
                  caption="Posição por produto"
                  data={posicoesFiltradas}
                  rowKey={(item) => `${item.codigo}-${item.produto}`}
                  acoesExtras={
                    <ExportDropdown
                      onExportarCsv={exportarVisaoAtual}
                      disabled={loading || posicoesFiltradas.length === 0}
                      label="Exportar visão"
                    />
                  }
                  columns={[
                    {
                      id: "produto",
                      header: <>Produto</>,
                      kind: "name",
                      value: (item) => item.produto,
                      cell: (item) => (
                        <>
                          <p className="text-xs font-medium">{item.produto}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{item.codigo}</p>
                        </>
                      ),
                    },
                    {
                      id: "marca",
                      header: <>Marca</>,
                      kind: "name",
                      value: (item) => item.marca ?? "",
                      cell: (item) => <span className="text-xs">{item.marca}</span>,
                    },
                    {
                      id: "situacao",
                      header: <>Situação</>,
                      kind: "name",
                      value: (item) => item.situacao,
                      cell: (item) => <SituacaoBadge situacao={item.situacao} />,
                    },
                    {
                      id: "estoque",
                      header: <>Estoque</>,
                      kind: "number",
                      value: (item) => item.estoqueAtual,
                      cell: (item) => <span className="font-semibold">{formatarNumero(item.estoqueAtual, 2)}</span>,
                    },
                    {
                      id: "venda",
                      header: <>Venda</>,
                      kind: "number",
                      value: (item) => item.quantidadeVendida,
                      cell: (item) => <>{formatarNumero(item.quantidadeVendida, 2)}</>,
                    },
                    {
                      id: "edv",
                      header: <>EDV</>,
                      kind: "number",
                      value: (item) => item.quantidadeDevolvida,
                      cell: (item) => (
                        <span
                          className="whitespace-nowrap text-amber-600"
                          title={`Valor devolvido: ${formatarMoeda(item.valorDevolvido)} (${formatarPercentual(item.taxaDevolucaoValor)})`}
                        >
                          {formatarNumero(item.quantidadeDevolvida, 2)} · {formatarPercentual(item.taxaDevolucaoQuantidade)}
                        </span>
                      ),
                    },
                    {
                      id: "demanda",
                      header: <>Demanda líquida</>,
                      kind: "number",
                      value: (item) => item.demandaLiquida,
                      cell: (item) => <span className="font-medium">{formatarNumero(item.demandaLiquida, 2)}</span>,
                    },
                    {
                      id: "cobertura",
                      header: <>Cobertura</>,
                      kind: "number",
                      value: (item) => item.coberturaDias,
                      cell: (item) => <>{coberturaVisual(item.coberturaDias, item.demandaLiquida)}</>,
                    },
                    {
                      id: "custoAquisicao",
                      header: <>Custo aquisição</>,
                      kind: "currency",
                      value: (item) => item.custoAquisicaoMedio,
                      cell: (item) => <>{item.custoAquisicaoMedio === null ? "—" : formatarMoeda(item.custoAquisicaoMedio)}</>,
                    },
                    {
                      id: "custoReposicao",
                      header: <>Custo reposição</>,
                      kind: "currency",
                      value: (item) => item.custoReposicaoMedio,
                      cell: (item) => <>{item.custoReposicaoMedio === null ? "—" : formatarMoeda(item.custoReposicaoMedio)}</>,
                    },
                    {
                      id: "valorReposicao",
                      header: <>Valor reposição</>,
                      kind: "currency",
                      value: (item) => item.valorReposicao,
                      cell: (item) => (
                        <span className="font-medium">
                          {item.valorReposicao === null ? "—" : formatarMoeda(item.valorReposicao)}
                        </span>
                      ),
                    },
                    {
                      id: "ultimoMovimento",
                      header: <>Último movimento</>,
                      kind: "date",
                      value: (item) => item.ultimoMovimento,
                      cell: (item) => <span className="whitespace-nowrap text-xs">{dataVisual(item.ultimoMovimento)}</span>,
                    },
                    {
                      id: "acoes",
                      header: <></>,
                      cell: (item) => (
                        <Button variant="ghost" size="sm" onClick={() => abrirKardex(item)}>
                          Kardex
                        </Button>
                      ),
                    },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimentacoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kardex detalhado</CardTitle>
              <CardDescription>{movimentosFiltrados.length} movimento(s) no período filtrado.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-3 pb-3">
                <ReportTable<MovimentoKardexPublico>
                  label="movimentos"
                  caption="Kardex detalhado"
                  data={movimentosFiltrados}
                  rowKey={(item) => `${item.documento}-${item.dataMovimento}-${item.produtoCodigoAuxiliar}`}
                  showExport={false}
                  columns={[
                    {
                      id: "data",
                      header: <>Data</>,
                      kind: "date",
                      value: (item) => item.dataMovimento,
                      cell: (item) => <span className="text-xs">{dataVisual(item.dataMovimento)}</span>,
                    },
                    {
                      id: "produto",
                      header: <>Produto</>,
                      kind: "name",
                      value: (item) => item.produtoDescricao,
                      cell: (item) => (
                        <>
                          <p className="text-xs font-medium">{item.produtoDescricao}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {item.produtoCodigoAuxiliar || "Sem código"}
                          </p>
                        </>
                      ),
                    },
                    {
                      id: "documento",
                      header: <>Documento</>,
                      kind: "name",
                      value: (item) => item.documento ?? "",
                      cell: (item) => <span className="font-mono text-xs">{item.documento || "—"}</span>,
                    },
                    {
                      id: "grupo",
                      header: <>Grupo</>,
                      kind: "name",
                      value: (item) => item.grupoDocumento,
                      cell: (item) => (
                        <Badge variant="outline" className={item.direcao === "entrada" ? classesSituacao.saudavel : classesSituacao.ruptura}>
                          {item.grupoDocumento} · {item.direcao === "entrada" ? "Entrada" : "Saída"}
                        </Badge>
                      ),
                    },
                    {
                      id: "participante",
                      header: <>Participante</>,
                      kind: "name",
                      value: (item) => item.participante ?? "",
                      cell: (item) => <span className="text-xs">{item.participante || "—"}</span>,
                    },
                    {
                      id: "movimento",
                      header: <>Movimento</>,
                      kind: "number",
                      value: (item) => item.quantidadeMovimentada,
                      cell: (item) => <>{formatarNumero(Math.abs(item.quantidadeMovimentada), 2)}</>,
                    },
                    {
                      id: "saldo",
                      header: <>Saldo</>,
                      kind: "number",
                      value: (item) => item.saldo,
                      cell: (item) => <span className="font-medium">{formatarNumero(item.saldo, 2)}</span>,
                    },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devolucoes"><Card><CardHeader><CardTitle className="text-base">Devoluções de vendas e compras</CardTitle><CardDescription>EDV reduz vendas; EDC representa devolução de compra e permanece separada.</CardDescription></CardHeader><CardContent className="p-0"><MovimentosEspeciais itens={devolucoesPaginacao.itensPaginados} totalItens={devolucoes.length} paginacao={devolucoesPaginacao} vazio="Nenhuma devolução encontrada." mostrarValor /></CardContent></Card></TabsContent>
        <TabsContent value="transferencias"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ArrowLeftRight className="size-4" />Transferências</CardTitle><CardDescription>Movimentações de entrada e saída classificadas como transferência.</CardDescription></CardHeader><CardContent className="p-0"><MovimentosEspeciais itens={transferenciasPaginacao.itensPaginados} totalItens={transferencias.length} paginacao={transferenciasPaginacao} vazio="Nenhuma transferência encontrada." /></CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}



function MovimentosEspeciais({
  itens,
  vazio,
  mostrarValor = false,
}: {
  itens: MovimentoKardexPublico[];
  totalItens: number;
  paginacao: ReturnType<typeof useTablePagination<MovimentoKardexPublico>>;
  vazio: string;
  mostrarValor?: boolean;
}) {
  return (
    <div className="px-3 pb-3">
      <ReportTable<MovimentoKardexPublico>
        label="movimentos"
        caption="Movimentos do Kardex"
        data={itens}
        rowKey={(item) => `${item.documento}-${item.dataMovimento}-${item.produtoCodigoAuxiliar}`}
        showExport={false}
        columns={[
          {
            id: "data",
            header: <>Data</>,
            kind: "date",
            value: (item) => item.dataMovimento,
            cell: (item) => <span className="text-xs">{dataVisual(item.dataMovimento)}</span>,
          },
          {
            id: "tipo",
            header: <>Tipo</>,
            kind: "name",
            value: (item) => item.grupoDocumento,
            cell: (item) => (
              <Badge
                variant="outline"
                className={item.direcao === "entrada" ? classesSituacao.saudavel : classesSituacao.ruptura}
              >
                {item.grupoDocumento} · {item.direcao === "entrada" ? "Entrada" : "Saída"}
              </Badge>
            ),
          },
          {
            id: "produto",
            header: <>Produto</>,
            kind: "name",
            value: (item) => item.produtoDescricao,
            cell: (item) => (
              <>
                <p className="text-xs font-medium">{item.produtoDescricao}</p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {item.produtoCodigoAuxiliar || "Sem código"}
                </p>
              </>
            ),
          },
          {
            id: "documento",
            header: <>Documento</>,
            kind: "name",
            value: (item) => item.documento ?? "",
            cell: (item) => <span className="font-mono text-xs">{item.documento || "—"}</span>,
          },
          {
            id: "participante",
            header: <>Participante</>,
            kind: "name",
            value: (item) => item.participante ?? "",
            cell: (item) => <span className="text-xs">{item.participante || "—"}</span>,
          },
          {
            id: "quantidade",
            header: <>Quantidade</>,
            kind: "number",
            value: (item) => item.quantidadeMovimentada,
            cell: (item) => <>{formatarNumero(Math.abs(item.quantidadeMovimentada), 2)}</>,
          },
          mostrarValor
            ? {
                id: "valor",
                header: <>Valor</>,
                kind: "currency" as const,
                value: (item) => item.valorTotal,
                cell: (item) => <span className="font-medium">{formatarMoeda(Math.abs(item.valorTotal))}</span>,
              }
            : {
                id: "saldo",
                header: <>Saldo</>,
                kind: "number" as const,
                value: (item) => item.saldo,
                cell: (item) => <span className="font-medium">{formatarNumero(item.saldo, 2)}</span>,
              },
        ]}
      />
      {itens.length === 0 ? <p className="pt-2 text-xs text-muted-foreground">{vazio}</p> : null}
    </div>
  );
}
