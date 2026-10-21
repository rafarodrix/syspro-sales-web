"use client";

import { useMemo, useState } from "react";
import { BanknoteArrowDown, BanknoteArrowUp } from "lucide-react";
import { toast } from "sonner";
import { AnalysisQueryCard } from "@/components/analytics/analysis-query-card";
import { MetricsStrip } from "@/components/analytics/metrics-strip";
import { DateRangeFilter, periodoUltimos30Dias, type Periodo } from "@/components/date-range-filter";
import { ExportDropdown } from "@/components/export-dropdown";
import { FeedbackState } from "@/components/feedback-state";
import { StatusRelatorio } from "@/components/relatorios/ui/status-relatorio";
import { ReportTable } from "@/components/relatorios/report-table";
import { Skeleton } from "@/components/ui/skeleton";
import { dataInputParaSyspro } from "@/lib/vendas";
import { formatarDataInputParaBR } from "@/lib/vendas";
import { formatarMoeda, formatarNumero } from "@/lib/formatters";
import { exportarParaCSV } from "@/lib/exportar-csv";
import type { CategoriaTitulo, ResumoTitulos, TituloNormalizado } from "@/lib/titulos";

interface RespostaTitulos {
  categoria: CategoriaTitulo;
  empresaNome: string;
  periodo: { inicial: string; final: string };
  consultadoEm: string;
  ignoradosPorEmpresa: number;
  itens: TituloNormalizado[];
  resumo: ResumoTitulos;
  error?: string;
  rotaNaoAutorizada?: boolean;
}

export function TitulosView({
  empresaId,
  categoria,
}: {
  empresaId: string;
  categoria: CategoriaTitulo;
}) {
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoUltimos30Dias());
  const [consultado, setConsultado] = useState<Periodo | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [naoAutorizada, setNaoAutorizada] = useState(false);
  const [dados, setDados] = useState<RespostaTitulos | null>(null);

  const titulo = categoria === "pagar" ? "Contas a Pagar" : "Contas a Receber";
  const Icone = categoria === "pagar" ? BanknoteArrowDown : BanknoteArrowUp;

  async function consultar(alvo: Periodo = periodo) {
    setLoading(true);
    setErro(null);
    setNaoAutorizada(false);
    try {
      const resposta = await fetch("/api/financeiro/titulos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          categoria,
          dtInicial: dataInputParaSyspro(alvo.inicial),
          dtFinal: dataInputParaSyspro(alvo.final),
        }),
      });
      const json = (await resposta.json().catch(() => ({}))) as RespostaTitulos;
      if (!resposta.ok) {
        setNaoAutorizada(Boolean(json.rotaNaoAutorizada));
        throw new Error(json.error || "Erro ao consultar títulos.");
      }
      setDados(json);
      setConsultado(alvo);
      toast.success(`${json.itens.length} título(s) em ${titulo.toLowerCase()}.`);
    } catch (causa) {
      setDados(null);
      setErro(causa instanceof Error ? causa.message : "Erro ao consultar títulos.");
    } finally {
      setLoading(false);
    }
  }

  const itens = useMemo(() => dados?.itens ?? [], [dados]);

  function exportar() {
    if (!itens.length) {
      toast.error("Nada para exportar.");
      return;
    }
    exportarParaCSV(
      `${categoria}-${(dados?.empresaNome ?? "empresa").replace(/[^\w-]+/g, "-").toLowerCase()}-${consultado?.inicial ?? ""}-a-${consultado?.final ?? ""}`,
      [
        "Empresa",
        "Participante",
        "Título",
        "Emissão",
        "Vencimento",
        "Baixa",
        "Valor",
        "Acréscimo",
        "Desconto",
        "Valor pago",
        "Saldo",
        "Situação",
        "Dias de atraso",
        "Forma de pagamento",
      ],
      itens.map((item) => [
        item.empresaNome,
        item.participante,
        item.numero,
        item.emissao ?? "",
        item.vencimento ?? "",
        item.baixa ?? "",
        item.valor,
        item.acrescimo,
        item.desconto,
        item.valorPago,
        item.saldo,
        item.situacao,
        item.diasAtraso,
        item.formaPagto ?? "",
      ]),
    );
    toast.success(`${itens.length} título(s) exportado(s).`);
  }

  return (
    <div className="flex flex-col gap-6">
      <AnalysisQueryCard
        icon={Icone}
        title={titulo}
        description={`Títulos do Syspro com vencimento no período consultado.`}
        footer="Rota de exportação do Syspro: os valores vêm da própria base, sem recálculo."
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
          variant={naoAutorizada ? "empty" : "error"}
          title={naoAutorizada ? "Rota ainda não liberada no Syspro" : "Não foi possível consultar"}
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
                rotulo: "Títulos",
                valor: formatarNumero(dados.resumo.quantidade, 0),
                detalhe: `${formatarNumero(dados.resumo.participantes, 0)} participante(s)`,
                definicao: "Quantidade de títulos retornados para o período consultado.",
              },
              {
                rotulo: "Valor total",
                valor: formatarMoeda(dados.resumo.valorTotal),
                detalhe: `pago ${formatarMoeda(dados.resumo.valorPago)}`,
                definicao: "Soma do valor dos títulos e do valor já liquidado (baixa).",
              },
              {
                rotulo: "Em aberto",
                valor: formatarMoeda(dados.resumo.emAberto),
                detalhe: `${formatarNumero(dados.resumo.quantidadeVencidos, 0)} vencido(s)`,
                definicao: "Saldo dos títulos sem baixa (valor + acréscimo − desconto − pago).",
                attention: dados.resumo.emAberto > 0 && dados.resumo.vencido > 0,
              },
              {
                rotulo: "Vencido",
                valor: formatarMoeda(dados.resumo.vencido),
                detalhe: `atraso médio ${formatarNumero(dados.resumo.atrasoMedioDias, 0)} dia(s)`,
                definicao:
                  "Saldo em aberto com vencimento anterior a hoje. O atraso médio é ponderado pelo valor.",
                attention: dados.resumo.vencido > 0,
              },
              {
                rotulo: "A vencer",
                valor: formatarMoeda(dados.resumo.aVencer),
                detalhe: dados.resumo.proximoVencimento
                  ? `próximo ${formatarDataInputParaBR(dados.resumo.proximoVencimento)}`
                  : undefined,
                definicao: "Saldo em aberto com vencimento hoje ou à frente.",
              },
            ]}
          />

          <ReportTable<TituloNormalizado>
            label="títulos"
            caption={`${titulo} por vencimento`}
            data={itens}
            rowKey={(item) => `${item.empresaCodigo}-${item.numero}-${item.vencimento ?? ""}`}
            showExport={false}
            acoesExtras={
              <ExportDropdown onExportarCsv={exportar} disabled={!itens.length} label="Exportar" />
            }
            columns={[
              {
                id: "participante",
                header: <>Participante</>,
                kind: "name",
                value: (item) => item.participante,
                cell: (item) => <span className="text-xs font-medium">{item.participante}</span>,
              },
              {
                id: "numero",
                header: <>Título</>,
                kind: "name",
                value: (item) => item.numero,
                cell: (item) => <span className="font-mono text-xs">{item.numero}</span>,
              },
              {
                id: "emissao",
                header: <>Emissão</>,
                kind: "date",
                value: (item) => item.emissao,
                cell: (item) => <span className="text-xs">{item.emissao ? formatarDataInputParaBR(item.emissao) : "—"}</span>,
              },
              {
                id: "vencimento",
                header: <>Vencimento</>,
                kind: "date",
                value: (item) => item.vencimento,
                cell: (item) => <span className="text-xs">{item.vencimento ? formatarDataInputParaBR(item.vencimento) : "—"}</span>,
              },
              {
                id: "valor",
                header: <>Valor</>,
                kind: "currency",
                value: (item) => item.valor,
                cell: (item) => <>{formatarMoeda(item.valor)}</>,
              },
              {
                id: "pago",
                header: <>Pago</>,
                kind: "currency",
                value: (item) => item.valorPago,
                cell: (item) => <>{formatarMoeda(item.valorPago)}</>,
              },
              {
                id: "saldo",
                header: <>Saldo</>,
                kind: "currency",
                value: (item) => item.saldo,
                cell: (item) => <span className="font-semibold">{formatarMoeda(item.saldo)}</span>,
              },
              {
                id: "situacao",
                header: <>Situação</>,
                kind: "name",
                value: (item) => item.situacao,
                cell: (item) => (
                  <span
                    className={
                      item.situacao === "pago"
                        ? "text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                        : item.situacao === "vencido"
                          ? "text-xs font-semibold text-rose-700 dark:text-rose-400"
                          : "text-xs text-muted-foreground"
                    }
                  >
                    {item.situacao === "pago" ? "Pago" : item.situacao === "vencido" ? `Vencido (${item.diasAtraso}d)` : "A vencer"}
                  </span>
                ),
              },
              {
                id: "forma",
                header: <>Forma</>,
                kind: "name",
                value: (item) => item.formaPagto ?? "",
                cell: (item) => <span className="text-xs text-muted-foreground">{item.formaPagto ?? "—"}</span>,
              },
            ]}
          />

          <StatusRelatorio
            itens={[
              {
                rotulo: "Universo",
                valor: `${formatarNumero(dados.itens.length, 0)} título(s) · ${dados.empresaNome}`,
                definicao: "Títulos devolvidos pela API de exportação para a empresa selecionada.",
              },
              {
                rotulo: "Período",
                valor: `${formatarDataInputParaBR(dados.periodo.inicial)} a ${formatarDataInputParaBR(dados.periodo.final)} · ${new Date(dados.consultadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
              },
              ...(dados.ignoradosPorEmpresa > 0
                ? [
                    {
                      rotulo: "Descartados",
                      valor: `${formatarNumero(dados.ignoradosPorEmpresa, 0)} de outra empresa`,
                      destaque: true,
                      definicao:
                        "Registros devolvidos com empresa_codigo diferente da selecionada foram descartados para não misturar dados entre empresas.",
                    },
                  ]
                : []),
            ]}
          />
        </>
      ) : null}
    </div>
  );
}
