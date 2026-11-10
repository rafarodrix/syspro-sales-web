"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataFilterBar } from "@/components/data-filter-bar";
import { FeedbackState } from "@/components/feedback-state";
import { ActionMetricCard } from "@/components/analytics/action-metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
} from "@/components/ui/select";
import type { Periodo } from "@/lib/periodo";
import {
  agregarMargens,
  CRITERIOS_ORDENACAO_MARGEM,
  ordenarItensMargem,
  type AnaliseMargens,
  type CriterioOrdenacaoMargem,
  type ItemAnaliseMargem,
  type LinhaAgregadaMargem,
} from "@/lib/analise-margens";
import { chaveConsulta } from "@/lib/cache-consulta";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import { useConsulta } from "@/lib/use-consulta";
import { ReportTable } from "./report-table";
import { FiltroRelatorio } from "./filtro-relatorio";
import { ReportBarraVisao, ReportVisaoProvider } from "./report-barra";
import { ReportMetricStrip } from "./report-toolbar";
import { ReportViewSelector } from "./report-view-toggle";
import { LayoutList, Layers, PieChart } from "lucide-react";

type VisaoMargem = "produto" | "curva" | "faixa";

type SituacaoMargem = "todas" | "negativa" | "baixa" | "saudavel" | "sem-custo";

export function AbaMargens({
  empresaId,
  periodo,
  busca,
  onBuscaChange,
  situacaoInicial,
  usuarioId,
}: {
  empresaId: string;
  periodo: Periodo;
  busca: string;
  onBuscaChange: (valor: string) => void;
  situacaoInicial?: string;
  /** Compõe a chave do cache: dado de um usuário nunca é servido para outro. */
  usuarioId?: string;
}) {
  // Uma consulta por empresa + período + usuário. Mudar ordenação, curva ou
  // situação NÃO consulta: esses filtros são aplicados sobre o resultado local.
  const chave = chaveConsulta({
    relatorio: "margens",
    usuario: usuarioId,
    empresa: empresaId,
    inicial: periodo.inicial,
    final: periodo.final,
  });

  const buscar = useCallback(async () => {
    const resposta = await fetch("/api/relatorios/margens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresaId,
        dtInicial: periodo.inicial,
        dtFinal: periodo.final,
      }),
    });
    const json = (await resposta.json().catch(() => ({}))) as AnaliseMargens & { error?: string };
    if (!resposta.ok) throw new Error(json.error || "Erro ao consultar margens.");
    return json;
  }, [empresaId, periodo.inicial, periodo.final]);

  const { dados, erro, carregando, atualizando, consultadoEm, atualizar } = useConsulta<AnaliseMargens>({
    chave,
    buscar,
    habilitado: Boolean(empresaId && periodo.inicial && periodo.final),
    usuarioId,
  });

  const [visao, setVisao] = useState<VisaoMargem>("produto");
  const [produtoSelecionado, setProdutoSelecionado] = useState<ItemAnaliseMargem | null>(null);
  const [ordenacao, setOrdenacao] = useState<CriterioOrdenacaoMargem>("faturamento");
  const [curva, setCurva] = useState<"todas" | "A" | "B" | "C">("todas");
  const [situacao, setSituacao] = useState<SituacaoMargem>(() => {
    return ["negativa", "baixa", "saudavel", "sem-custo"].includes(situacaoInicial ?? "")
      ? (situacaoInicial as SituacaoMargem)
      : "todas";
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (situacao === "todas") params.delete("margem");
    else params.set("margem", situacao);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [situacao]);

  const itens = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    const filtrados = (dados?.itens ?? []).filter((item) => {
      if (curva !== "todas" && item.curva !== curva) return false;
      if (situacao === "sem-custo" && item.custoReposicaoMedio !== null) return false;
      if (situacao === "negativa" && !(item.margemDepoisEdv !== null && item.margemDepoisEdv < 0)) return false;
      if (situacao === "baixa" && !(item.margemDepoisEdv !== null && item.margemDepoisEdv >= 0 && item.margemDepoisEdv < 20)) return false;
      if (situacao === "saudavel" && !(item.margemDepoisEdv !== null && item.margemDepoisEdv >= 20)) return false;
      if (!termo) return true;
      return [item.codigo, item.produto, item.marca, item.empresaNome]
        .some((valor) => String(valor ?? "").toLocaleLowerCase("pt-BR").includes(termo));
    });
    return ordenarItensMargem(filtrados, ordenacao);
  }, [busca, curva, dados?.itens, ordenacao, situacao]);

  const agregado = useMemo(
    () => (visao === "produto" ? [] : agregarMargens(itens, visao)),
    [itens, visao],
  );


  if (erro && !dados) {
    return <FeedbackState variant="error" title="Não foi possível calcular as margens" description={erro} />;
  }
  if (carregando && !dados) {
    return <div className="space-y-3 py-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-72 w-full" /></div>;
  }
  if (!dados) return null;
  const resumo = dados.resumo;
  const consultadoTexto = consultadoEm
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "medium",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(consultadoEm))
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "medium",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(dados.consultadoEm));

  const seletorVisao = (
    <ReportViewSelector
      view={visao}
      options={[
        { value: "produto", label: "Produto", icon: LayoutList },
        { value: "curva", label: "Curva ABC", icon: Layers },
        { value: "faixa", label: "Faixa de margem", icon: PieChart },
      ]}
      onViewChange={(proxima) => setVisao(proxima as VisaoMargem)}
    />
  );

  return (
    <ReportVisaoProvider>
    <div className="space-y-4">
      <ReportBarraVisao>{seletorVisao}</ReportBarraVisao>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ActionMetricCard
          titulo="Venda total"
          valor={formatarMoeda(resumo.faturamentoAntesEdv)}
          descricao="Faturamento bruto do período, antes das devoluções."
        />
        <ActionMetricCard
          titulo="Devoluções"
          valor={formatarMoeda(resumo.devolucoesEdv)}
          descricao="Valor devolvido pelo cliente no período."
        />
        <ActionMetricCard
          titulo="Vendas líquidas"
          valor={formatarMoeda(resumo.faturamentoDepoisEdv)}
          descricao="Venda total menos devoluções."
        />
        <ActionMetricCard
          titulo="Lucro após devoluções"
          valor={formatarMoeda(resumo.lucroDepoisEdv)}
          descricao="Lucro bruto só nos produtos com custo de reposição informado."
        />
      </div>

      <ReportMetricStrip items={[
        { label: "Margem após devoluções", value: formatarPercentual(resumo.margemDepoisEdv, 1) },
        { label: "Impacto no lucro", value: formatarMoeda(resumo.impactoLucroEdv), attention: resumo.impactoLucroEdv < 0 },
        { label: "Margem negativa", value: `${formatarNumero(resumo.produtosMargemNegativa, 0)} produto(s)` },
        { label: "Sem custo informado", value: formatarMoeda(resumo.faturamentoSemCusto) },
      ]} />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>{itens.length} de {dados.itens.length} produto(s) no universo analisado.</p>
        <p className="flex items-center gap-2">
          {atualizando ? "Atualizando..." : `Dados atualizados em ${consultadoTexto}`}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            disabled={carregando}
            onClick={atualizar}
            title="Ignorar o cache e consultar o Syspro novamente"
          >
            {carregando ? "Consultando..." : "Atualizar"}
          </Button>
        </p>
      </div>

      <DataFilterBar
        busca={busca}
        onBuscaChange={onBuscaChange}
        placeholder="Buscar produto, código, marca ou empresa..."
        temFiltrosAtivos={Boolean(busca) || situacao !== "todas" || curva !== "todas"}
        onLimpar={() => { onBuscaChange(""); setSituacao("todas"); setCurva("todas"); }}
      >
        <FiltroRelatorio
          rotulo="Situação da margem"
          valor={situacao}
          opcoes={[
            { valor: "todas", rotulo: "Todas as margens" },
            { valor: "negativa", rotulo: "Margem negativa" },
            { valor: "baixa", rotulo: "Margem abaixo de 20%" },
            { valor: "saudavel", rotulo: "Margem a partir de 20%" },
            { valor: "sem-custo", rotulo: "Sem custo de reposição" },
          ]}
          onChange={(valor) => setSituacao(valor as SituacaoMargem)}
        />
        <FiltroRelatorio
          rotulo="Curva ABC"
          valor={curva}
          opcoes={[
            { valor: "todas", rotulo: "Todas as curvas" },
            { valor: "A", rotulo: "Curva A" },
            { valor: "B", rotulo: "Curva B" },
            { valor: "C", rotulo: "Curva C" },
          ]}
          onChange={(valor) => setCurva(valor as "todas" | "A" | "B" | "C")}
        />
        <FiltroRelatorio
          rotulo="Ordenar produtos"
          valor={ordenacao}
          opcoes={CRITERIOS_ORDENACAO_MARGEM.map((criterio) => ({
            valor: criterio.valor,
            rotulo: criterio.rotulo,
          }))}
          onChange={(valor) => setOrdenacao(valor as CriterioOrdenacaoMargem)}
        />
      </DataFilterBar>

      {visao === "produto" ? (
        <ReportTable<ItemAnaliseMargem>
          caption="Margem por produto antes e depois das devoluções"
          label="produtos"
          data={itens}
          rowKey={(item) => `${item.empresaId}-${item.produtoId ?? item.codigo}`}
          stickyFirst
          exportObservacoes="Margens calculadas exclusivamente com custo de reposição. A devolução é vinculada por ID interno do produto (não exportado); o Kardex não permite atribuir devolução a vendedor ou cliente."
          columns={[
            { id: "produto", header: <>Produto</>, kind: "name", value: (item) => item.produto, exportValue: (item) => item.produto, cell: (item) => <button type="button" className="text-left hover:text-primary hover:underline" onClick={() => setProdutoSelecionado(item)}><span className="block font-medium">{item.produto}</span><span className="block font-mono text-[11px] text-muted-foreground">{item.codigo || "Sem código auxiliar"}</span></button> },
            { id: "empresa", header: <>Empresa</>, kind: "name", value: (item) => item.empresaNome, cell: (item) => <>{item.empresaNome}</> },
            { id: "faturamento", header: <>Venda total</>, kind: "currency", value: (item) => item.valorVendido, cell: (item) => <>{formatarMoeda(item.valorVendido)}</> },
            { id: "edv", header: <>Devoluções</>, kind: "currency", value: (item) => item.valorDevolvido, cell: (item) => <>{formatarMoeda(item.valorDevolvido)}</> },
            { id: "faturamentoLiquido", header: <>Vendas líquidas</>, kind: "currency", value: (item) => item.valorVendaLiquida, cell: (item) => <>{formatarMoeda(item.valorVendaLiquida)}</> },
            { id: "margemAntes", header: <>Margem antes</>, kind: "percent", value: (item) => item.margemAntesEdv, exportValue: (item) => item.margemAntesEdv === null ? "Sem custo" : formatarPercentual(item.margemAntesEdv, 1), cell: (item) => <>{item.margemAntesEdv === null ? "—" : formatarPercentual(item.margemAntesEdv, 1)}</> },
            { id: "margemDepois", header: <>Margem após dev.</>, kind: "percent", value: (item) => item.margemDepoisEdv, exportValue: (item) => item.margemDepoisEdv === null ? "Sem custo" : formatarPercentual(item.margemDepoisEdv, 1), cell: (item) => <span className={item.margemDepoisEdv !== null && item.margemDepoisEdv < 0 ? "font-semibold text-destructive" : ""}>{item.margemDepoisEdv === null ? "—" : formatarPercentual(item.margemDepoisEdv, 1)}</span> },
  { id: "lucroDepois", header: <>Lucro após dev.</>, kind: "currency", value: (item) => item.lucroDepoisEdv, exportValue: (item) => item.lucroDepoisEdv ?? "Sem custo", cell: (item) => <span className={item.lucroDepoisEdv !== null && item.lucroDepoisEdv < 0 ? "font-semibold text-destructive" : ""}>{item.lucroDepoisEdv === null ? "—" : formatarMoeda(item.lucroDepoisEdv)}</span> },
            { id: "impacto", header: <>Impacto no lucro</>, kind: "currency", value: (item) => item.impactoLucroEdv, exportValue: (item) => item.impactoLucroEdv ?? "Sem custo", cell: (item) => <>{item.impactoLucroEdv === null ? "—" : formatarMoeda(item.impactoLucroEdv)}</> },
          ]}
        />
      ) : (
      <ReportTable<LinhaAgregadaMargem>
        caption={visao === "curva" ? "Margem por curva ABC" : "Margem por faixa de margem"}
        label="faixas"
        data={agregado}
        rowKey={(linha) => linha.chave}
        stickyFirst
        columns={[
          { id: "grupo", header: <>{visao === "curva" ? "Curva" : "Faixa"}</>, kind: "name", value: (linha) => linha.rotulo, cell: (linha) => <span className="font-medium">{linha.rotulo}</span> },
          { id: "produtos", header: <>Produtos</>, kind: "number", value: (linha) => linha.produtos, cell: (linha) => <>{formatarNumero(linha.produtos, 0)}</> },
          { id: "vendaTotal", header: <>Venda total</>, kind: "currency", value: (linha) => linha.vendaTotal, cell: (linha) => <>{formatarMoeda(linha.vendaTotal)}</> },
          { id: "devolucoes", header: <>Devoluções</>, kind: "currency", value: (linha) => linha.devolucoes, cell: (linha) => <>{formatarMoeda(linha.devolucoes)}</> },
          { id: "vendaLiquida", header: <>Vendas líquidas</>, kind: "currency", value: (linha) => linha.vendaLiquida, cell: (linha) => <>{formatarMoeda(linha.vendaLiquida)}</> },
          { id: "lucro", header: <>Lucro após dev.</>, kind: "currency", value: (linha) => linha.lucro, cell: (linha) => <span className={linha.lucro < 0 ? "font-semibold text-negativo" : ""}>{formatarMoeda(linha.lucro)}</span> },
          { id: "margem", header: <>Margem</>, kind: "percent", value: (linha) => linha.margem, cell: (linha) => <span className={linha.margem !== null && linha.margem < 0 ? "font-semibold text-negativo" : ""}>{linha.margem === null ? "—" : formatarPercentual(linha.margem, 1)}</span> },
        ]}
        rodape={(linhas) => (
          <div className="flex flex-wrap items-center gap-3 px-3 py-2 text-[11px] text-muted-foreground">
            <span>{formatarNumero(linhas.length, 0)} {visao === "curva" ? "curvas" : "faixas"}</span>
            <span>Venda total: <strong className="num text-foreground">{formatarMoeda(linhas.reduce((t, l) => t + l.vendaTotal, 0))}</strong></span>
            <span>Vendas líquidas: <strong className="num text-foreground">{formatarMoeda(linhas.reduce((t, l) => t + l.vendaLiquida, 0))}</strong></span>
          </div>
        )}
      />

      )}

      <p className="text-xs text-muted-foreground">
        A devolução é relacionada pela chave interna do produto; só o código auxiliar é exibido. O Kardex não informa vínculo confiável com vendedor e nota original, então o impacto aparece por produto e empresa, sem rateio estimado.
      </p>
      <Dialog open={Boolean(produtoSelecionado)} onOpenChange={(aberto) => { if (!aberto) setProdutoSelecionado(null); }}>
        <DialogContent className="!inset-y-0 !right-0 !left-auto !top-0 h-dvh !max-w-md !translate-x-0 !translate-y-0 content-start overflow-y-auto !rounded-none p-6 sm:!max-w-md" aria-label="Detalhes do produto">
          {produtoSelecionado ? <>
            <DialogHeader className="pr-8">
              <DialogTitle>{produtoSelecionado.produto}</DialogTitle>
              <DialogDescription>
                Código auxiliar {produtoSelecionado.codigo || "não informado"} · {produtoSelecionado.empresaNome}
              </DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-2 gap-3">
              {[
                ["Faturamento antes", formatarMoeda(produtoSelecionado.valorVendido)],
                ["Devoluções", formatarMoeda(produtoSelecionado.valorDevolvido)],
                ["Vendas líquidas", formatarMoeda(produtoSelecionado.valorVendaLiquida)],
                ["Quantidade líquida", formatarNumero(produtoSelecionado.quantidadeLiquidaReal, 2)],
                ["Custo de reposição", produtoSelecionado.custoReposicaoMedio == null ? "Sem custo" : formatarMoeda(produtoSelecionado.custoReposicaoMedio)],
                ["Lucro após devoluções", produtoSelecionado.lucroDepoisEdv == null ? "—" : formatarMoeda(produtoSelecionado.lucroDepoisEdv)],
                ["Margem antes", produtoSelecionado.margemAntesEdv == null ? "—" : formatarPercentual(produtoSelecionado.margemAntesEdv, 1)],
                ["Margem após devoluções", produtoSelecionado.margemDepoisEdv == null ? "—" : formatarPercentual(produtoSelecionado.margemDepoisEdv, 1)],
              ].map(([rotulo, valor]) => <div key={rotulo} className="rounded-lg border p-3"><dt className="text-xs text-muted-foreground">{rotulo}</dt><dd className="mt-1 font-mono font-semibold tabular-nums">{valor}</dd></div>)}
            </dl>
            <p className="text-xs leading-relaxed text-muted-foreground">Margem calculada somente pelo custo de reposição. O ID interno foi usado no relacionamento com o Kardex, mas não é exibido.</p>
          </> : null}
        </DialogContent>
      </Dialog>
    </div>
    </ReportVisaoProvider>
  );
}
