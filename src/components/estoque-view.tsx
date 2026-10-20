"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeftRight, PackageSearch, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { MovimentoKardexPublico } from "@/lib/kardex";
import type { PosicaoEstoque, ResumoSaudeEstoque, SituacaoEstoque } from "@/lib/estoque-saude";
import { dataInputParaSyspro } from "@/lib/vendas";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import { DataFilterBar } from "@/components/data-filter-bar";
import { DateRangeFilter, periodoMesAtual, type Periodo } from "@/components/date-range-filter";
import { EstoqueMetricas } from "@/components/estoque/estoque-metricas";
import { TablePagination } from "@/components/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EmpresaOption { id: string; cnpj: string; razaoSocial: string }
interface RespostaEstoque { movimentos: MovimentoKardexPublico[]; posicoes: PosicaoEstoque[]; resumo: ResumoSaudeEstoque }

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
  const [periodo, setPeriodo] = useState<Periodo>(periodoMesAtual());
  const [movimentos, setMovimentos] = useState<MovimentoKardexPublico[]>([]);
  const [posicoes, setPosicoes] = useState<PosicaoEstoque[]>([]);
  const [resumoSaude, setResumoSaude] = useState<ResumoSaudeEstoque | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroDirecao, setFiltroDirecao] = useState("todas");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroGrupo, setFiltroGrupo] = useState("todos");
  const [filtroSituacao, setFiltroSituacao] = useState("todas");
  const [aba, setAba] = useState("visao-geral");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(25);

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
      setPagina(1);
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
    return posicoes.filter((item) => (!termo || [item.codigo, item.produto, item.marca].some((campo) => campo.toLowerCase().includes(termo))) && (filtroSituacao === "todas" || item.situacao === filtroSituacao));
  }, [busca, filtroSituacao, posicoes]);
  const alertas = useMemo(() => posicoesFiltradas.filter((item) => item.situacao !== "saudavel").slice(0, 20), [posicoesFiltradas]);
  const devolucoes = useMemo(() => movimentosFiltrados.filter((item) => item.classificacao.categoria === "devolucao_venda" || item.classificacao.categoria === "devolucao_compra"), [movimentosFiltrados]);
  const transferencias = useMemo(() => movimentosFiltrados.filter((item) => item.classificacao.categoria === "transferencia"), [movimentosFiltrados]);
  const totalPaginas = Math.max(1, Math.ceil(movimentosFiltrados.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const paginaMovimentos = movimentosFiltrados.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina);

  function abrirKardex(item: PosicaoEstoque) {
    setBusca(item.codigo === "Sem código" ? item.produto : item.codigo);
    setFiltroDirecao("todas"); setFiltroCategoria("todas"); setFiltroGrupo("todos"); setPagina(1); setAba("movimentacoes");
  }
  const filtrosAtivos = Boolean(busca) || filtroDirecao !== "todas" || filtroCategoria !== "todas" || filtroGrupo !== "todos" || filtroSituacao !== "todas";
  function limparFiltros() { setBusca(""); setFiltroDirecao("todas"); setFiltroCategoria("todas"); setFiltroGrupo("todos"); setFiltroSituacao("todas"); setPagina(1); }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2 text-xl"><PackageSearch className="size-5 text-primary" />Posição e Saúde do Estoque</CardTitle><CardDescription>Saldo, demanda líquida, custos, cobertura e movimentações por empresa. Período máximo de 31 dias.</CardDescription></CardHeader>
        <CardContent><DateRangeFilter value={periodo} onChange={setPeriodo} onConsultar={consultar} loading={loading} maximoDias={31} /></CardContent>
      </Card>

      {erro ? <Card className="border-destructive/50 bg-destructive/5"><CardContent className="pt-6 text-sm font-medium text-destructive">{erro}</CardContent></Card> : null}

      {resumoSaude ? <>
        <EstoqueMetricas resumo={resumoSaude} />
        {resumoSaude.movimentosSemProdutoId > 0 ? <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300" role="alert"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><span>{formatarNumero(resumoSaude.movimentosSemProdutoId)} movimentação(ões) sem ID de produto ficaram fora dos agrupamentos, para evitar vínculos incorretos.</span></div> : null}
        {resumoSaude.saldosNegativos > 0 ? <div className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-800 dark:text-rose-300" role="alert"><ShieldAlert className="mt-0.5 size-4 shrink-0" /><span>{formatarNumero(resumoSaude.saldosNegativos)} produto(s) apresentam saldo negativo e precisam de conferência no Kardex.</span></div> : null}
      </> : null}

      <Tabs value={aba} onValueChange={setAba} className="gap-4">
        <div className="overflow-x-auto pb-1"><TabsList className="min-w-max"><TabsTrigger value="visao-geral">Visão geral</TabsTrigger><TabsTrigger value="posicao">Posição por produto</TabsTrigger><TabsTrigger value="movimentacoes">Movimentações</TabsTrigger><TabsTrigger value="devolucoes">Devoluções</TabsTrigger><TabsTrigger value="transferencias">Transferências</TabsTrigger></TabsList></div>

        <DataFilterBar busca={busca} onBuscaChange={(valor) => { setBusca(valor); setPagina(1); }} placeholder="Buscar código, produto, marca, documento ou participante..." temFiltrosAtivos={filtrosAtivos} onLimpar={limparFiltros}>
          {aba === "visao-geral" || aba === "posicao" ? <div className="w-40 sm:w-44"><Select value={filtroSituacao} onValueChange={setFiltroSituacao}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Situação" /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as situações</SelectItem>{Object.entries(rotulosSituacao).map(([valor, rotulo]) => <SelectItem key={valor} value={valor}>{rotulo}</SelectItem>)}</SelectContent></Select></div> : <>
            <div className="w-40 sm:w-44"><Select value={filtroDirecao} onValueChange={(valor) => { setFiltroDirecao(valor); setPagina(1); }}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Entrada / saída" /></SelectTrigger><SelectContent><SelectItem value="todas">Entradas e saídas</SelectItem><SelectItem value="entrada">Somente entradas</SelectItem><SelectItem value="saida">Somente saídas</SelectItem></SelectContent></Select></div>
            <div className="w-40 sm:w-44"><Select value={filtroCategoria} onValueChange={(valor) => { setFiltroCategoria(valor); setPagina(1); }}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as categorias</SelectItem><SelectItem value="venda">Vendas</SelectItem><SelectItem value="devolucao_venda">Devoluções de venda</SelectItem><SelectItem value="compra">Compras</SelectItem><SelectItem value="devolucao_compra">Devoluções de compra</SelectItem><SelectItem value="transferencia">Transferências</SelectItem><SelectItem value="bonificacao">Bonificações</SelectItem><SelectItem value="outros">Outros movimentos</SelectItem></SelectContent></Select></div>
            <div className="w-40 sm:w-44"><Select value={filtroGrupo} onValueChange={(valor) => { setFiltroGrupo(valor); setPagina(1); }}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Grupo" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os grupos</SelectItem>{gruposDisponiveis.map((grupo) => <SelectItem key={grupo} value={grupo}>{grupo}</SelectItem>)}</SelectContent></Select></div>
          </>}
        </DataFilterBar>

        <TabsContent value="visao-geral">
          <Card><CardHeader><CardTitle className="text-base">Fila de atenção</CardTitle><CardDescription>Produtos priorizados por ruptura, baixa cobertura, ausência de saída e excesso.</CardDescription></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Estoque</TableHead><TableHead className="text-right">Demanda líquida</TableHead><TableHead className="text-right">Cobertura</TableHead><TableHead className="text-right">Reposição</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{alertas.length ? alertas.map((item, indice) => <TableRow key={`${item.codigo}-${item.produto}-${indice}`}><ProdutoCell item={item} /><TableCell><SituacaoBadge situacao={item.situacao} /></TableCell><TableCell className="text-right font-medium">{formatarNumero(item.estoqueAtual, 2)}</TableCell><TableCell className="text-right">{formatarNumero(item.demandaLiquida, 2)}</TableCell><TableCell className="text-right">{coberturaVisual(item.coberturaDias, item.demandaLiquida)}</TableCell><TableCell className="text-right">{item.valorReposicao === null ? "Sem custo" : formatarMoeda(item.valorReposicao)}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => abrirKardex(item)}>Ver Kardex</Button></TableCell></TableRow>) : <TableRow><TableCell colSpan={7} className="h-28 text-center text-sm text-muted-foreground">{loading ? "Consultando estoque..." : resumoSaude ? "Nenhum alerta encontrado." : "Consulte um período para analisar a saúde do estoque."}</TableCell></TableRow>}</TableBody>
          </Table></div></CardContent></Card>
        </TabsContent>

        <TabsContent value="posicao">
          <Card><CardHeader><CardTitle className="text-base">Posição por produto</CardTitle><CardDescription>{posicoesFiltradas.length} produto(s). Custos médios consideram apenas itens com custo informado no período.</CardDescription></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Marca</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Estoque</TableHead><TableHead className="text-right">Venda</TableHead><TableHead className="text-right">EDV</TableHead><TableHead className="text-right">Demanda líquida</TableHead><TableHead className="text-right">Cobertura</TableHead><TableHead className="text-right">Custo aquisição</TableHead><TableHead className="text-right">Custo reposição</TableHead><TableHead className="text-right">Valor reposição</TableHead><TableHead>Último movimento</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {posicoesFiltradas.length ? posicoesFiltradas.map((item, indice) => (
                <TableRow key={`${item.codigo}-${item.produto}-${indice}`}>
                  <ProdutoCell item={item} />
                  <TableCell className="text-xs">{item.marca}</TableCell>
                  <TableCell><SituacaoBadge situacao={item.situacao} /></TableCell>
                  <TableCell className="text-right font-semibold">{formatarNumero(item.estoqueAtual, 2)}</TableCell>
                  <TableCell className="text-right">{formatarNumero(item.quantidadeVendida, 2)}</TableCell>
                  <TableCell
                    className="whitespace-nowrap text-right text-amber-600"
                    title={`Valor devolvido: ${formatarMoeda(item.valorDevolvido)} (${formatarPercentual(item.taxaDevolucaoValor)})`}
                  >
                    {formatarNumero(item.quantidadeDevolvida, 2)} · {formatarPercentual(item.taxaDevolucaoQuantidade)}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatarNumero(item.demandaLiquida, 2)}</TableCell>
                  <TableCell className="text-right">{coberturaVisual(item.coberturaDias, item.demandaLiquida)}</TableCell>
                  <TableCell className="text-right">{item.custoAquisicaoMedio === null ? "—" : formatarMoeda(item.custoAquisicaoMedio)}</TableCell>
                  <TableCell className="text-right">{item.custoReposicaoMedio === null ? "—" : formatarMoeda(item.custoReposicaoMedio)}</TableCell>
                  <TableCell className="text-right font-medium">{item.valorReposicao === null ? "—" : formatarMoeda(item.valorReposicao)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{dataVisual(item.ultimoMovimento)}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => abrirKardex(item)}>Kardex</Button></TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={13} className="h-28 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table></div></CardContent></Card>
        </TabsContent>

        <TabsContent value="movimentacoes" className="space-y-6">
          <Card><CardHeader><CardTitle className="text-base">Kardex detalhado</CardTitle><CardDescription>{movimentosFiltrados.length} movimento(s) no período filtrado.</CardDescription></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Produto</TableHead><TableHead>Documento</TableHead><TableHead>Grupo</TableHead><TableHead>Participante</TableHead><TableHead className="text-right">Movimento</TableHead><TableHead className="text-right">Saldo</TableHead></TableRow></TableHeader>
            <TableBody>{paginaMovimentos.length ? paginaMovimentos.map((item, indice) => <TableRow key={`${item.documento}-${item.produtoCodigoAuxiliar}-${item.dataMovimento}-${indice}`}><TableCell className="whitespace-nowrap text-xs">{dataVisual(item.dataMovimento)}</TableCell><MovimentoProdutoCell item={item} /><TableCell className="font-mono text-xs">{item.documento || "—"}</TableCell><TableCell><Badge variant="outline" className={item.direcao === "entrada" ? "border-emerald-500/40 text-emerald-700" : "border-rose-500/40 text-rose-700"}>{item.grupoDocumento || "—"} · {item.classificacao.rotulo}</Badge></TableCell><TableCell className="max-w-44 truncate text-xs">{item.participante || "—"}</TableCell><TableCell className={`text-right font-semibold ${item.direcao === "entrada" ? "text-emerald-600" : "text-rose-600"}`}>{item.direcao === "entrada" ? "+" : "−"}{formatarNumero(Math.abs(item.quantidadeMovimentada), 2)}</TableCell><TableCell className="text-right font-medium">{formatarNumero(item.saldo, 2)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={7} className="h-28 text-center text-sm text-muted-foreground">{loading ? "Consultando o Kardex..." : "Nenhuma movimentação encontrada."}</TableCell></TableRow>}</TableBody>
          </Table></div>{movimentosFiltrados.length > 0 ? <div className="border-t p-3"><TablePagination paginaAtual={paginaAtual} totalItens={movimentosFiltrados.length} itensPorPagina={porPagina} onPaginaChange={setPagina} onItensPorPaginaChange={(valor) => { setPorPagina(valor); setPagina(1); }} /></div> : null}</CardContent></Card>
        </TabsContent>

        <TabsContent value="devolucoes"><Card><CardHeader><CardTitle className="text-base">Devoluções de vendas e compras</CardTitle><CardDescription>EDV reduz vendas; EDC representa devolução de compra e permanece separada.</CardDescription></CardHeader><CardContent className="p-0"><MovimentosEspeciais itens={devolucoes} vazio="Nenhuma devolução encontrada." mostrarValor /></CardContent></Card></TabsContent>
        <TabsContent value="transferencias"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ArrowLeftRight className="size-4" />Transferências</CardTitle><CardDescription>Movimentações de entrada e saída classificadas como transferência.</CardDescription></CardHeader><CardContent className="p-0"><MovimentosEspeciais itens={transferencias} vazio="Nenhuma transferência encontrada." /></CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}

function ProdutoCell({ item }: { item: PosicaoEstoque }) {
  return <TableCell><p className="min-w-48 text-xs font-medium">{item.produto}</p><p className="font-mono text-[10px] text-muted-foreground">{item.codigo}</p></TableCell>;
}

function MovimentoProdutoCell({ item }: { item: MovimentoKardexPublico }) {
  return <TableCell><p className="min-w-48 text-xs font-medium">{item.produtoDescricao}</p><p className="font-mono text-[10px] text-muted-foreground">{item.produtoCodigoAuxiliar || "Sem código"}</p></TableCell>;
}

function MovimentosEspeciais({ itens, vazio, mostrarValor = false }: { itens: MovimentoKardexPublico[]; vazio: string; mostrarValor?: boolean }) {
  return <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Produto</TableHead><TableHead>Documento</TableHead><TableHead>Participante</TableHead><TableHead className="text-right">Quantidade</TableHead>{mostrarValor ? <TableHead className="text-right">Valor</TableHead> : <TableHead className="text-right">Saldo</TableHead>}</TableRow></TableHeader><TableBody>{itens.length ? itens.map((item, indice) => <TableRow key={`${item.documento}-${item.dataMovimento}-${indice}`}><TableCell className="text-xs">{dataVisual(item.dataMovimento)}</TableCell><TableCell><Badge variant="outline" className={item.direcao === "entrada" ? classesSituacao.saudavel : classesSituacao.ruptura}>{item.grupoDocumento} · {item.direcao === "entrada" ? "Entrada" : "Saída"}</Badge></TableCell><MovimentoProdutoCell item={item} /><TableCell className="font-mono text-xs">{item.documento || "—"}</TableCell><TableCell className="text-xs">{item.participante || "—"}</TableCell><TableCell className="text-right">{formatarNumero(Math.abs(item.quantidadeMovimentada), 2)}</TableCell>{mostrarValor ? <TableCell className="text-right font-medium">{formatarMoeda(Math.abs(item.valorTotal))}</TableCell> : <TableCell className="text-right font-medium">{formatarNumero(item.saldo, 2)}</TableCell>}</TableRow>) : <TableRow><TableCell colSpan={7} className="h-28 text-center text-sm text-muted-foreground">{vazio}</TableCell></TableRow>}</TableBody></Table></div>;
}
