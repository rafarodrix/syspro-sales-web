"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RotateCcw, TrendingDown, WalletCards } from "lucide-react";
import { DataFilterBar } from "@/components/data-filter-bar";
import { FeedbackState } from "@/components/feedback-state";
import { MetricaCard } from "@/components/metrica-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Periodo } from "@/lib/periodo";
import {
  CRITERIOS_ORDENACAO_MARGEM,
  ordenarItensMargem,
  type AnaliseMargens,
  type CriterioOrdenacaoMargem,
  type ItemAnaliseMargem,
} from "@/lib/analise-margens";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import { ReportTable } from "./report-table";
import { ReportMetricStrip } from "./report-toolbar";

type SituacaoMargem = "todas" | "negativa" | "baixa" | "saudavel" | "sem-custo";

export function AbaMargens({
  empresaId,
  periodo,
  busca,
  onBuscaChange,
  situacaoInicial,
}: {
  empresaId: string;
  periodo: Periodo;
  busca: string;
  onBuscaChange: (valor: string) => void;
  situacaoInicial?: string;
}) {
  const [dados, setDados] = useState<AnaliseMargens | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState<ItemAnaliseMargem | null>(null);
  const [ordenacao, setOrdenacao] = useState<CriterioOrdenacaoMargem>("faturamento");
  const [curva, setCurva] = useState<"todas" | "A" | "B" | "C">("todas");
  const [situacao, setSituacao] = useState<SituacaoMargem>(() => {
    return ["negativa", "baixa", "saudavel", "sem-custo"].includes(situacaoInicial ?? "")
      ? situacaoInicial as SituacaoMargem
      : "todas";
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (situacao === "todas") params.delete("margem");
    else params.set("margem", situacao);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [situacao]);

  useEffect(() => {
    const controller = new AbortController();
    async function carregar() {
      setLoading(true);
      setErro(null);
      try {
        const resposta = await fetch("/api/relatorios/margens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empresaId,
            dtInicial: periodo.inicial,
            dtFinal: periodo.final,
          }),
          signal: controller.signal,
        });
        const json = (await resposta.json().catch(() => ({}))) as AnaliseMargens & {
          error?: string;
        };
        if (!resposta.ok) throw new Error(json.error || "Erro ao consultar margens.");
        setDados(json);
      } catch (causa) {
        if (causa instanceof DOMException && causa.name === "AbortError") return;
        setErro(causa instanceof Error ? causa.message : "Erro ao consultar margens.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void carregar();
    return () => controller.abort();
  }, [empresaId, periodo.inicial, periodo.final]);

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

  if (loading) {
    return <div className="space-y-3 py-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-72 w-full" /></div>;
  }
  if (erro) {
    return <FeedbackState variant="error" title="Não foi possível calcular as margens com EDV" description={erro} />;
  }
  if (!dados) return null;
  const resumo = dados.resumo;
  const consultadoEm = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(dados.consultadoEm));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricaCard
          rotulo="Margem após EDV"
          definicao="Lucro bruto sobre o faturamento líquido de devoluções, apenas onde há custo de reposição."
          valor={formatarPercentual(resumo.margemDepoisEdv, 1)}
          rodape={`${formatarPercentual(resumo.margemAntesEdv, 1)} antes das devoluções`}
          icone={WalletCards}
        />
        <MetricaCard
          rotulo="Impacto das EDVs"
          definicao="Variação do lucro bruto causada pelas devoluções de venda."
          valor={formatarMoeda(resumo.impactoLucroEdv)}
          rodape={`${formatarMoeda(resumo.devolucoesEdv)} devolvidos`}
          icone={RotateCcw}
        />
        <MetricaCard
          rotulo="Margem negativa"
          definicao="Produtos com custo de reposição informado e margem abaixo de zero após EDV."
          valor={formatarNumero(resumo.produtosMargemNegativa, 0)}
          rodape={<>
            <button type="button" className="underline-offset-2 hover:underline" onClick={() => { setSituacao("baixa"); setCurva("A"); setOrdenacao("margem"); }}>curva A com margem &lt;20%</button>
            {" · "}
            <button type="button" className="underline-offset-2 hover:underline" onClick={() => { setSituacao("baixa"); setCurva("todas"); }}>{formatarNumero(resumo.produtosMargemBaixa, 0)} abaixo de 20%</button>
          </>}
          icone={TrendingDown}
        />
        <MetricaCard
          rotulo="Faturamento sem custo"
          definicao="Faturamento separado dos cálculos porque a API não informou custo de reposição."
          valor={formatarMoeda(resumo.faturamentoSemCusto)}
          rodape={<button type="button" className="underline-offset-2 hover:underline" onClick={() => setSituacao("sem-custo")}>{formatarPercentual(resumo.coberturaCusto, 1)} do faturamento coberto · ver detalhes</button>}
          icone={AlertTriangle}
        />
      </div>

      <ReportMetricStrip items={[
        { label: "Vendas antes de EDV", value: formatarMoeda(resumo.faturamentoAntesEdv) },
        { label: "Vendas líquidas de EDV", value: formatarMoeda(resumo.faturamentoDepoisEdv) },
        { label: "Lucro antes de EDV", value: formatarMoeda(resumo.lucroAntesEdv) },
        { label: "Lucro após EDV", value: formatarMoeda(resumo.lucroDepoisEdv), attention: resumo.lucroDepoisEdv < 0 },
      ]} />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>{itens.length} de {dados.itens.length} produto(s) no universo analisado.</p>
        <p>Dados atualizados em {consultadoEm}</p>
      </div>

      <DataFilterBar
        busca={busca}
        onBuscaChange={onBuscaChange}
        placeholder="Buscar produto, código, marca ou empresa..."
        temFiltrosAtivos={Boolean(busca) || situacao !== "todas" || curva !== "todas"}
        onLimpar={() => { onBuscaChange(""); setSituacao("todas"); setCurva("todas"); }}
      >
        <Select value={situacao} onValueChange={(valor) => setSituacao(valor as SituacaoMargem)}>
          <SelectTrigger className="h-9 w-48 text-xs" aria-label="Situação da margem"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as margens</SelectItem>
            <SelectItem value="negativa">Margem negativa</SelectItem>
            <SelectItem value="baixa">Margem abaixo de 20%</SelectItem>
            <SelectItem value="saudavel">Margem a partir de 20%</SelectItem>
            <SelectItem value="sem-custo">Sem custo de reposição</SelectItem>
          </SelectContent>
        </Select>
        <Select value={curva} onValueChange={(valor) => setCurva(valor as "todas" | "A" | "B" | "C")}>
          <SelectTrigger className="h-9 w-40 text-xs" aria-label="Curva ABC"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as curvas</SelectItem>
            <SelectItem value="A">Curva A</SelectItem>
            <SelectItem value="B">Curva B</SelectItem>
            <SelectItem value="C">Curva C</SelectItem>
          </SelectContent>
        </Select>
        <Select value={ordenacao} onValueChange={(valor) => setOrdenacao(valor as CriterioOrdenacaoMargem)}>
          <SelectTrigger className="h-9 w-52 text-xs" aria-label="Ordenar produtos"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CRITERIOS_ORDENACAO_MARGEM.map((criterio) => (
              <SelectItem key={criterio.valor} value={criterio.valor} title={criterio.descricao}>
                {criterio.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          { id: "custo", header: <>Custo reposição</>, kind: "currency", value: (item) => item.custoReposicaoMedio, exportValue: (item) => item.custoReposicaoMedio ?? "Sem custo", cell: (item) => <>{item.custoReposicaoMedio === null ? "Sem custo" : formatarMoeda(item.custoReposicaoMedio)}</> },
          { id: "margemAntes", header: <>Margem antes</>, kind: "percent", value: (item) => item.margemAntesEdv, exportValue: (item) => item.margemAntesEdv === null ? "Sem custo" : formatarPercentual(item.margemAntesEdv, 1), cell: (item) => <>{item.margemAntesEdv === null ? "—" : formatarPercentual(item.margemAntesEdv, 1)}</> },
          { id: "margemDepois", header: <>Margem após EDV</>, kind: "percent", value: (item) => item.margemDepoisEdv, exportValue: (item) => item.margemDepoisEdv === null ? "Sem custo" : formatarPercentual(item.margemDepoisEdv, 1), cell: (item) => <span className={item.margemDepoisEdv !== null && item.margemDepoisEdv < 0 ? "font-semibold text-destructive" : ""}>{item.margemDepoisEdv === null ? "—" : formatarPercentual(item.margemDepoisEdv, 1)}</span> },
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
