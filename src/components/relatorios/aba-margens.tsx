"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataFilterBar } from "@/components/data-filter-bar";
import { FeedbackState } from "@/components/feedback-state";
import { ActionMetricCard } from "@/components/analytics/action-metric-card";
import { GraficoBarras } from "@/components/analytics/grafico";
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
  CRITERIOS_ORDENACAO_MARGEM,
  ordenarItensMargem,
  type AnaliseMargens,
  type CriterioOrdenacaoMargem,
  type ItemAnaliseMargem,
} from "@/lib/analise-margens";
import { chaveConsulta } from "@/lib/cache-consulta";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import { useConsulta } from "@/lib/use-consulta";
import { ReportTable } from "./report-table";
import { FiltroRelatorio } from "./filtro-relatorio";
import { ReportMetricStrip } from "./report-toolbar";

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

  /** Ranking do gráfico: quem mais contribuiu para o lucro após devoluções. */
  const rankingLucro = useMemo(() => {
    return [...(dados?.itens ?? [])]
      .filter((item) => item.lucroDepoisEdv !== null && item.lucroDepoisEdv !== undefined)
      .sort((a, b) => (b.lucroDepoisEdv ?? 0) - (a.lucroDepoisEdv ?? 0))
      .slice(0, 8)
      .map((item) => ({
        rotulo: item.produto.length > 26 ? `${item.produto.slice(0, 25)}…` : item.produto,
        valor: item.lucroDepoisEdv ?? 0,
        item,
      }));
  }, [dados?.itens]);

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

  if (erro && !dados) {
    return <FeedbackState variant="error" title="Não foi possível calcular as margens com EDV" description={erro} />;
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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ActionMetricCard
          titulo="Margem após EDV"
          valor={formatarPercentual(resumo.margemDepoisEdv, 1)}
          descricao={`Lucro bruto sobre o faturamento líquido de devoluções, só onde há custo de reposição. Antes das devoluções: ${formatarPercentual(resumo.margemAntesEdv, 1)}.`}
        />
        <ActionMetricCard
          titulo="Impacto das devoluções (EDV)"
          valor={formatarMoeda(resumo.impactoLucroEdv)}
          descricao={`Perda de lucro bruto causada pelas devoluções: ${formatarMoeda(resumo.devolucoesEdv)} devolvidos.`}
        />
        <ActionMetricCard
          titulo="Margem negativa"
          valor={formatarNumero(resumo.produtosMargemNegativa, 0)}
          descricao={`Produtos com custo informado e margem abaixo de zero. ${formatarNumero(resumo.produtosMargemBaixa, 0)} estão abaixo de 20%.`}
          acaoTitulo="Filtrar produtos com margem negativa"
          onClick={() => {
            setSituacao("baixa");
            setCurva("todas");
            setOrdenacao("margem");
          }}
        />
        <ActionMetricCard
          titulo="Faturamento sem custo"
          valor={formatarMoeda(resumo.faturamentoSemCusto)}
          descricao={`Fica fora do cálculo porque a API não informou custo de reposição. Cobertura de custo: ${formatarPercentual(resumo.coberturaCusto, 1)}.`}
          acaoTitulo="Ver produtos sem custo informado"
          onClick={() => setSituacao("sem-custo")}
        />
      </div>

      <ReportMetricStrip items={[
        { label: "Vendas antes de EDV", value: formatarMoeda(resumo.faturamentoAntesEdv) },
        { label: "Vendas líquidas de EDV", value: formatarMoeda(resumo.faturamentoDepoisEdv) },
        { label: "Lucro antes de EDV", value: formatarMoeda(resumo.lucroAntesEdv) },
        { label: "Lucro após EDV", value: formatarMoeda(resumo.lucroDepoisEdv), attention: resumo.lucroDepoisEdv < 0 },
      ]} />

      {rankingLucro.length > 0 ? (
        <section className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Onde está o lucro · top 8 produtos após devoluções
            </h3>
            <p className="text-[11px] text-muted-foreground">Clique na barra para abrir o produto</p>
          </div>
          <GraficoBarras
            dados={rankingLucro}
            rotulo="Lucro após EDV"
            altura={Math.max(140, rankingLucro.length * 30)}
            onBarraSelecionada={(indice) => {
              const alvo = rankingLucro[indice]?.item;
              if (alvo) setProdutoSelecionado(alvo);
            }}
          />
        </section>
      ) : null}

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

      <ReportTable<ItemAnaliseMargem>
        caption="Margem por produto antes e depois das devoluções de venda"
        label="produtos"
        data={itens}
        rowKey={(item) => `${item.empresaId}-${item.produtoId ?? item.codigo}`}
        stickyFirst
        exportObservacoes="Margens calculadas exclusivamente com custo de reposição. EDV é vinculada por ID interno do produto; o ID não é exportado. O Kardex não permite atribuir a EDV com segurança a vendedor ou cliente."
        columns={[
          { id: "produto", header: <>Produto</>, kind: "name", value: (item) => item.produto, exportValue: (item) => item.produto, cell: (item) => <button type="button" className="text-left hover:text-primary hover:underline" onClick={() => setProdutoSelecionado(item)}><span className="block font-medium">{item.produto}</span><span className="block font-mono text-[11px] text-muted-foreground">{item.codigo || "Sem código auxiliar"}</span></button> },
          { id: "empresa", header: <>Empresa</>, kind: "name", value: (item) => item.empresaNome, cell: (item) => <>{item.empresaNome}</> },
          { id: "faturamento", header: <>Fat. antes EDV</>, kind: "currency", value: (item) => item.valorVendido, cell: (item) => <>{formatarMoeda(item.valorVendido)}</> },
          { id: "edv", header: <>EDV</>, kind: "currency", value: (item) => item.valorDevolvido, cell: (item) => <>{formatarMoeda(item.valorDevolvido)}</> },
          { id: "faturamentoLiquido", header: <>Fat. após EDV</>, kind: "currency", value: (item) => item.valorVendaLiquida, cell: (item) => <>{formatarMoeda(item.valorVendaLiquida)}</> },
          { id: "margemAntes", header: <>Margem antes</>, kind: "percent", value: (item) => item.margemAntesEdv, exportValue: (item) => item.margemAntesEdv === null ? "Sem custo" : formatarPercentual(item.margemAntesEdv, 1), cell: (item) => <>{item.margemAntesEdv === null ? "—" : formatarPercentual(item.margemAntesEdv, 1)}</> },
          { id: "margemDepois", header: <>Margem após EDV</>, kind: "percent", value: (item) => item.margemDepoisEdv, exportValue: (item) => item.margemDepoisEdv === null ? "Sem custo" : formatarPercentual(item.margemDepoisEdv, 1), cell: (item) => <span className={item.margemDepoisEdv !== null && item.margemDepoisEdv < 0 ? "font-semibold text-destructive" : ""}>{item.margemDepoisEdv === null ? "—" : formatarPercentual(item.margemDepoisEdv, 1)}</span> },
{ id: "lucroDepois", header: <>Lucro após EDV</>, kind: "currency", value: (item) => item.lucroDepoisEdv, exportValue: (item) => item.lucroDepoisEdv ?? "Sem custo", cell: (item) => <span className={item.lucroDepoisEdv !== null && item.lucroDepoisEdv < 0 ? "font-semibold text-destructive" : ""}>{item.lucroDepoisEdv === null ? "—" : formatarMoeda(item.lucroDepoisEdv)}</span> },
          { id: "impacto", header: <>Impacto no lucro</>, kind: "currency", value: (item) => item.impactoLucroEdv, exportValue: (item) => item.impactoLucroEdv ?? "Sem custo", cell: (item) => <>{item.impactoLucroEdv === null ? "—" : formatarMoeda(item.impactoLucroEdv)}</> },
        ]}
      />
      <p className="text-xs text-muted-foreground">
        A EDV é relacionada pela chave interna do produto, mas somente o código auxiliar é exibido. Como o Kardex não informa um vínculo confiável com vendedor e nota original, o impacto de devolução é apresentado por produto e empresa, sem rateio estimado.
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
                ["Devoluções EDV", formatarMoeda(produtoSelecionado.valorDevolvido)],
                ["Faturamento após EDV", formatarMoeda(produtoSelecionado.valorVendaLiquida)],
                ["Quantidade líquida", formatarNumero(produtoSelecionado.quantidadeLiquidaReal, 2)],
                ["Custo de reposição", produtoSelecionado.custoReposicaoMedio == null ? "Sem custo" : formatarMoeda(produtoSelecionado.custoReposicaoMedio)],
                ["Lucro após EDV", produtoSelecionado.lucroDepoisEdv == null ? "—" : formatarMoeda(produtoSelecionado.lucroDepoisEdv)],
                ["Margem antes", produtoSelecionado.margemAntesEdv == null ? "—" : formatarPercentual(produtoSelecionado.margemAntesEdv, 1)],
                ["Margem após EDV", produtoSelecionado.margemDepoisEdv == null ? "—" : formatarPercentual(produtoSelecionado.margemDepoisEdv, 1)],
              ].map(([rotulo, valor]) => <div key={rotulo} className="rounded-lg border p-3"><dt className="text-xs text-muted-foreground">{rotulo}</dt><dd className="mt-1 font-mono font-semibold tabular-nums">{valor}</dd></div>)}
            </dl>
            <p className="text-xs leading-relaxed text-muted-foreground">Margem calculada somente pelo custo de reposição. O ID interno foi usado no relacionamento com o Kardex, mas não é exibido.</p>
          </> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
