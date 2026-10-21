"use client";

import { useState } from "react";
import { Factory } from "lucide-react";
import { toast } from "sonner";
import { AnalysisQueryCard } from "@/components/analytics/analysis-query-card";
import { MetricsStrip } from "@/components/analytics/metrics-strip";
import { DateRangeFilter, periodoMesAtual, type Periodo } from "@/components/date-range-filter";
import { ExportDropdown } from "@/components/export-dropdown";
import { FeedbackState } from "@/components/feedback-state";
import { ReportTable } from "@/components/relatorios/report-table";
import { StatusRelatorio } from "@/components/relatorios/ui/status-relatorio";
import { Skeleton } from "@/components/ui/skeleton";
import { dataInputParaSyspro, formatarDataInputParaBR } from "@/lib/vendas";
import { formatarNumero } from "@/lib/formatters";
import { exportarParaCSV } from "@/lib/exportar-csv";
import type { ProducaoNormalizada, ResumoProducao } from "@/lib/producao";

interface RespostaProducao {
  empresaNome: string;
  periodo: { inicial: string; final: string };
  consultadoEm: string;
  ignoradosPorEmpresa: number;
  avisoEmpresa?: boolean;
  itens: ProducaoNormalizada[];
  resumo: ResumoProducao;
  error?: string;
  rotaNaoAutorizada?: boolean;
}

export function ProducaoView({ empresaId }: { empresaId: string }) {
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoMesAtual());
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [naoAutorizada, setNaoAutorizada] = useState(false);
  const [dados, setDados] = useState<RespostaProducao | null>(null);

  async function consultar(alvo: Periodo = periodo) {
    setLoading(true);
    setErro(null);
    setNaoAutorizada(false);
    try {
      const resposta = await fetch("/api/producao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          dtInicial: dataInputParaSyspro(alvo.inicial),
          dtFinal: dataInputParaSyspro(alvo.final),
        }),
      });
      const json = (await resposta.json().catch(() => ({}))) as RespostaProducao;
      if (!resposta.ok) {
        setNaoAutorizada(Boolean(json.rotaNaoAutorizada));
        throw new Error(json.error || "Erro ao consultar produção.");
      }
      setDados(json);
      toast.success(`${json.itens.length} registro(s) de produção.`);
    } catch (causa) {
      setDados(null);
      setErro(causa instanceof Error ? causa.message : "Erro ao consultar produção.");
    } finally {
      setLoading(false);
    }
  }

  function exportar() {
    const itens = dados?.itens ?? [];
    if (!itens.length) {
      toast.error("Nada para exportar.");
      return;
    }
    exportarParaCSV(
      `producao-${(dados?.empresaNome ?? "empresa").replace(/[^\w-]+/g, "-").toLowerCase()}-${dados?.periodo.inicial ?? ""}-a-${dados?.periodo.final ?? ""}`,
      ["Data", "Código", "Produto", "Quantidade", "Produzido", "Operador", "Observação"],
      itens.map((item) => [
        item.data ?? "",
        item.codigo,
        item.produto,
        item.quantidade,
        item.produzido,
        item.operador,
        item.observacao,
      ]),
    );
    toast.success(`${itens.length} registro(s) exportado(s).`);
  }

  return (
    <div className="flex flex-col gap-6">
      <AnalysisQueryCard
        icon={Factory}
        title="Produção"
        description="Registros da rota `producao` do Syspro: previsto x produzido por produto e operador."
        footer="Enquanto a rota não estiver autorizada no SysproServer, a consulta retorna aviso explícito."
      >
        <DateRangeFilter value={periodo} onChange={setPeriodo} onConsultar={consultar} loading={loading} />
      </AnalysisQueryCard>

      {erro ? (
        <FeedbackState
          variant={naoAutorizada ? "empty" : "error"}
          title={naoAutorizada ? "Rota de produção ainda não liberada" : "Não foi possível consultar"}
          description={erro}
          onRetry={naoAutorizada ? undefined : () => consultar()}
        />
      ) : null}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : dados ? (
        <>
          <MetricsStrip
            itens={[
              {
                rotulo: "Registros",
                valor: formatarNumero(dados.resumo.registros, 0),
                detalhe: `${formatarNumero(dados.resumo.produtosDistintos, 0)} produto(s)`,
                definicao: "Linhas retornadas pela rota de produção no período.",
              },
              {
                rotulo: "Quantidade prevista",
                valor: formatarNumero(dados.resumo.quantidade, 2),
                definicao: "Soma da quantidade informada em cada registro.",
              },
              {
                rotulo: "Produzido",
                valor: formatarNumero(dados.resumo.produzido, 2),
                definicao: "Soma da quantidade efetivamente produzida.",
              },
              {
                rotulo: "Diferença",
                valor: formatarNumero(dados.resumo.diferenca, 2),
                detalhe: "produzido − previsto",
                attention: dados.resumo.diferenca < 0,
                definicao: "Diferença entre produzido e previsto; negativo indica produção abaixo do previsto.",
              },
              {
                rotulo: "Operadores",
                valor: formatarNumero(dados.resumo.operadores, 0),
                definicao: "Operadores distintos nos registros do período.",
              },
            ]}
          />

          <ReportTable<ProducaoNormalizada>
            label="registros"
            caption="Produção no período"
            data={dados.itens}
            rowKey={(item, indice) => `${item.data ?? "sd"}-${item.codigo}-${indice}`}
            showExport={false}
            acoesExtras={
              <ExportDropdown onExportarCsv={exportar} disabled={!dados.itens.length} label="Exportar" />
            }
            columns={[
              {
                id: "data",
                header: <>Data</>,
                kind: "date",
                value: (item) => item.data,
                cell: (item) => <span className="text-xs">{item.data ? formatarDataInputParaBR(item.data) : "—"}</span>,
              },
              {
                id: "codigo",
                header: <>Código</>,
                kind: "name",
                value: (item) => item.codigo,
                cell: (item) => <span className="font-mono text-xs">{item.codigo || "—"}</span>,
              },
              {
                id: "produto",
                header: <>Produto</>,
                kind: "name",
                value: (item) => item.produto,
                cell: (item) => <>{item.produto || "—"}</>,
              },
              {
                id: "quantidade",
                header: <>Previsto</>,
                kind: "number",
                value: (item) => item.quantidade,
                cell: (item) => <>{formatarNumero(item.quantidade, 2)}</>,
              },
              {
                id: "produzido",
                header: <>Produzido</>,
                kind: "number",
                value: (item) => item.produzido,
                cell: (item) => <span className="font-semibold">{formatarNumero(item.produzido, 2)}</span>,
              },
              {
                id: "operador",
                header: <>Operador</>,
                kind: "name",
                value: (item) => item.operador,
                cell: (item) => <span className="text-xs text-muted-foreground">{item.operador || "—"}</span>,
              },
              {
                id: "observacao",
                header: <>Observação</>,
                kind: "name",
                value: (item) => item.observacao,
                cell: (item) => <span className="text-xs text-muted-foreground">{item.observacao || "—"}</span>,
              },
            ]}
          />

          <StatusRelatorio
            itens={[
              {
                rotulo: "Universo",
                valor: `${formatarNumero(dados.itens.length, 0)} registro(s) · ${dados.empresaNome}`,
                definicao: "Registros devolvidos pela rota de produção para a empresa selecionada.",
              },
              {
                rotulo: "Período",
                valor: `${formatarDataInputParaBR(dados.periodo.inicial)} a ${formatarDataInputParaBR(dados.periodo.final)}`,
              },
            ]}
          />
        </>
      ) : null}
    </div>
  );
}
