"use client";

import { useMemo, useState } from "react";
import { Clock, Truck } from "lucide-react";
import { toast } from "sonner";
import { AnalysisQueryCard } from "@/components/analytics/analysis-query-card";
import { MetricsStrip } from "@/components/analytics/metrics-strip";
import { DataFilterBar } from "@/components/data-filter-bar";
import { ExportDropdown } from "@/components/export-dropdown";
import { FeedbackState } from "@/components/feedback-state";
import { GlossarioRelatorio, GUIAS_RELATORIOS } from "@/components/relatorio-guia";
import { ReportTable } from "./relatorios/report-table";
import { FiltroRelatorio } from "./relatorios/filtro-relatorio";
import { StatusRelatorio } from "./relatorios/ui/status-relatorio";
import { SecaoTitulo } from "./relatorios/ui/secao-titulo";
import {
  DateRangeFilter,
  periodoUltimos7Dias,
  salvarPeriodoCookie,
  type Periodo,
} from "@/components/date-range-filter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarNumero, formatarPercentual } from "@/lib/formatters";
import { exportarParaCSV } from "@/lib/exportar-csv";
import {
  ROTULO_SITUACAO_PEDIDO,
  SITUACOES_PEDIDO_OPCOES,
  formatarDuracaoMinutos,
  montarLinhasPedido,
  resumirPedidos,
  situacaoPedido,
  type Etapa,
  type LinhaPedido,
  type PedidoSyspro,
  type ResumoPedidos,
  type SituacaoPedido,
} from "@/lib/pedidos";

const RESUMO_VAZIO: ResumoPedidos = {
  total: 0,
  entregues: 0,
  pendentes: 0,
  emRota: 0,
  cancelados: 0,
  separacao: { media: null, dentro: 0, fora: 0, percentualNoPrazo: null, emAndamento: 0 },
  conferencia: { media: null, dentro: 0, fora: 0, percentualNoPrazo: null, emAndamento: 0 },
  saida: { media: null, dentro: 0, fora: 0, percentualNoPrazo: null, emAndamento: 0 },
  fechamento: { media: null, dentro: 0, fora: 0, percentualNoPrazo: null, emAndamento: 0 },
  totalExpedicao: { media: null, dentro: 0, fora: 0, percentualNoPrazo: null, emAndamento: 0 },
  porEntregador: [],
};

const COLUNAS_EXPORTACAO_PEDIDOS = [
  "Data venda",
  "DAV",
  "Cliente",
  "Hora venda",
  "Em separação",
  "Alerta separação (min)",
  "Conferido",
  "Alerta conferência (min)",
  "Saída para entrega",
  "Alerta saída (min)",
  "Fechamento",
  "Alerta fechamento (min)",
  "Total até expedição (min)",
  "Entregador",
  "Situação",
] as const;

function horaCurta(hora: string | null): string {
  return hora ? hora.slice(0, 5) : "—";
}

function badgeSituacaoPedido(situacao: SituacaoPedido) {
  if (situacao === "entregue") return "default" as const;
  if (situacao === "pendente") return "secondary" as const;
  if (situacao === "em-rota") return "outline" as const;
  if (situacao === "cancelado") return "destructive" as const;
  return "outline" as const;
}

/** Verde dentro do limite, vermelho acima, âmbar quando a etapa ainda corre. */
function CelulaEtapa({ etapa }: { etapa: Etapa }) {
  if (etapa.minutos === null) return <span className="text-muted-foreground">—</span>;
  if (etapa.emAndamento) {
    return (
      <span className="font-semibold text-amber-600 dark:text-amber-500" title="Etapa em andamento">
        {formatarDuracaoMinutos(etapa.minutos)}…
      </span>
    );
  }
  return (
    <span
      className={
        etapa.estourou
          ? "font-semibold text-destructive"
          : "font-medium text-emerald-600 dark:text-emerald-500"
      }
      title={`Limite de ${etapa.limite} min`}
    >
      {formatarDuracaoMinutos(etapa.minutos)}
    </span>
  );
}

export function EntregasView({
  empresaId,
  empresaNome,
}: {
  empresaId: string;
  empresaNome: string;
}) {
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoUltimos7Dias());
  const [periodoConsultado, setPeriodoConsultado] = useState<Periodo | null>(null);
  const [linhas, setLinhas] = useState<LinhaPedido[]>([]);
  const [resumo, setResumo] = useState<ResumoPedidos>(RESUMO_VAZIO);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [rotaNaoLiberada, setRotaNaoLiberada] = useState(false);
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<"todas" | SituacaoPedido>("todas");
  const [apenasEstourados, setApenasEstourados] = useState(false);

  async function consultar(proximoPeriodo: Periodo = periodo) {
    if (!empresaId) {
      toast.error("Selecione uma empresa.");
      return;
    }
    setLoading(true);
    setErro(null);
    setRotaNaoLiberada(false);
    try {
      const resposta = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          dtInicial: proximoPeriodo.inicial,
          dtFinal: proximoPeriodo.final,
        }),
      });
      const dados = (await resposta.json().catch(() => ({}))) as {
        pedidos?: PedidoSyspro[];
        resumo?: ResumoPedidos;
        error?: string;
        rotaNaoLiberada?: boolean;
      };
      if (!resposta.ok) {
        setRotaNaoLiberada(Boolean(dados.rotaNaoLiberada));
        throw new Error(dados.error || "Erro ao consultar os pedidos.");
      }
      const agora = new Date();
      const montadas = montarLinhasPedido(dados.pedidos ?? [], {
        agoraMinutos: agora.getHours() * 60 + agora.getMinutes(),
        hoje: agora.toISOString().slice(0, 10),
      });
      setLinhas(montadas);
      setResumo(dados.resumo ?? resumirPedidos(montadas));
      setPeriodoConsultado({ ...proximoPeriodo });
      salvarPeriodoCookie(proximoPeriodo);
      toast.success(`${montadas.length} pedido(s) no período.`);
    } catch (causa) {
      const mensagem = causa instanceof Error ? causa.message : "Erro ao consultar os pedidos.";
      setErro(mensagem);
      setLinhas([]);
      setResumo(RESUMO_VAZIO);
      toast.error(mensagem);
    } finally {
      setLoading(false);
    }
  }

  const linhasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return linhas.filter((linha) => {
      if (situacao !== "todas" && situacaoPedido(linha) !== situacao) return false;
      if (
        apenasEstourados &&
        !linha.conferencia.estourou &&
        !linha.saida.estourou &&
        !linha.fechamento.estourou &&
        !linha.separacao.estourou
      ) {
        return false;
      }
      if (!termo) return true;
      return (
        linha.numero.toLowerCase().includes(termo) ||
        linha.cliente.toLowerCase().includes(termo) ||
        (linha.entregador ?? "").toLowerCase().includes(termo)
      );
    });
  }, [linhas, busca, situacao, apenasEstourados]);

  const resumoFiltrado = useMemo(() => resumirPedidos(linhasFiltradas), [linhasFiltradas]);

  const filtrosAtivos =
    (busca.trim() ? 1 : 0) + (situacao !== "todas" ? 1 : 0) + (apenasEstourados ? 1 : 0);

  function exportarCsv() {
    if (linhasFiltradas.length === 0) {
      toast.error("Nada para exportar com os filtros atuais.");
      return;
    }
    const corpo = linhasFiltradas.map((linha) => [
      linha.dataVenda,
      linha.numero,
      linha.cliente,
      horaCurta(linha.horaVenda),
      horaCurta(linha.horaSeparacao),
      linha.separacao.minutos ?? "",
      horaCurta(linha.horaConferido),
      linha.conferencia.minutos ?? "",
      horaCurta(linha.horaSaida),
      linha.saida.minutos ?? "",
      horaCurta(linha.horaFechamento),
      linha.fechamento.minutos ?? "",
      linha.totalExpedicao.minutos ?? "",
      linha.entregador ?? "",
      ROTULO_SITUACAO_PEDIDO[situacaoPedido(linha)],
    ]);
    const periodoTexto = periodoConsultado
      ? `${periodoConsultado.inicial}_a_${periodoConsultado.final}`
      : new Date().toISOString().slice(0, 10);
    exportarParaCSV(
      `entrega-${empresaNome.replace(/[^\w-]+/g, "-").toLowerCase()}-${periodoTexto}`,
      [...COLUNAS_EXPORTACAO_PEDIDOS],
      corpo,
    );
    toast.success(`${linhasFiltradas.length} pedido(s) exportado(s).`);
  }

  return (
    <div className="flex flex-col gap-6">
      <AnalysisQueryCard
        icon={Truck}
        title="Análise de Entrega"
        description={`Cada etapa do DAV em ${empresaNome}: separação, conferência, saída e fechamento — com o tempo gasto em cada uma.`}
        footer="Limites: separação 5 min · conferência 15 min · saída 30 min · fechamento 50 min (provisório)."
      >
        <DateRangeFilter value={periodo} onChange={setPeriodo} onConsultar={consultar} loading={loading} />
      </AnalysisQueryCard>

      {erro ? (
        <FeedbackState
          variant="error"
          title={rotaNaoLiberada ? "Rota ainda não liberada" : "Não foi possível consultar os pedidos"}
          description={erro}
          onRetry={() => consultar()}
        />
      ) : null}

      {periodoConsultado && !erro ? (
        <section className="space-y-2">
          <SecaoTitulo eyebrow="Situação" titulo="Pedidos do período" />
          <MetricsStrip
            itens={[
              { rotulo: "Pedidos", valor: formatarNumero(resumoFiltrado.total, 0) },
              { rotulo: "Entregues", valor: formatarNumero(resumoFiltrado.entregues, 0) },
              {
                rotulo: "Pendentes",
                valor: formatarNumero(resumoFiltrado.pendentes, 0),
                attention: resumoFiltrado.pendentes > 0,
              },
              { rotulo: "Em entrega", valor: formatarNumero(resumoFiltrado.emRota, 0) },
              { rotulo: "Cancelados", valor: formatarNumero(resumoFiltrado.cancelados, 0) },
            ]}
          />
        </section>
      ) : null}

      {periodoConsultado && !erro ? (
        <section className="space-y-2">
          <SecaoTitulo eyebrow="Tempo por etapa" titulo="Onde o processo trava" />
          <MetricsStrip
            itens={[
              {
                rotulo: "Separação",
                valor: formatarDuracaoMinutos(resumoFiltrado.separacao.media),
                detalhe: resumoFiltrado.separacao.percentualNoPrazo === null
                  ? "sem dado (F)"
                  : `${formatarPercentual(resumoFiltrado.separacao.percentualNoPrazo, 0)} no prazo`,
                attention: resumoFiltrado.separacao.fora > 0,
                definicao: "Fórmula: em separação (F) − hora da venda (D). Limite 5 min.",
              },
              {
                rotulo: "Conferência",
                valor: formatarDuracaoMinutos(resumoFiltrado.conferencia.media),
                detalhe: resumoFiltrado.conferencia.percentualNoPrazo === null
                  ? "sem dado"
                  : `${formatarPercentual(resumoFiltrado.conferencia.percentualNoPrazo, 0)} no prazo`,
                attention: resumoFiltrado.conferencia.fora > 0,
                definicao: "Fórmula: conferido (H) − em separação (F). Limite 15 min. Sem F, usa a venda como início.",
              },
              {
                rotulo: "Saída",
                valor: formatarDuracaoMinutos(resumoFiltrado.saida.media),
                detalhe: resumoFiltrado.saida.percentualNoPrazo === null
                  ? "sem dado"
                  : `${formatarPercentual(resumoFiltrado.saida.percentualNoPrazo, 0)} no prazo`,
                attention: resumoFiltrado.saida.fora > 0,
                definicao: "Fórmula: saída para entrega (J) − conferido (H). Limite 30 min.",
              },
              {
                rotulo: "Fechamento",
                valor: formatarDuracaoMinutos(resumoFiltrado.fechamento.media),
                detalhe: resumoFiltrado.fechamento.percentualNoPrazo === null
                  ? "sem dado"
                  : `${formatarPercentual(resumoFiltrado.fechamento.percentualNoPrazo, 0)} no prazo`,
                attention: resumoFiltrado.fechamento.fora > 0,
                definicao: "Fórmula: fechamento (L) − saída (J). Limite provisório de 50 min.",
              },
              {
                rotulo: "Total até expedição",
                valor: formatarDuracaoMinutos(resumoFiltrado.totalExpedicao.media),
                detalhe: "venda → saída",
                definicao: "Fórmula: saída para entrega (J) − hora da venda (D). Sem limite: mede o ciclo inteiro.",
              },
            ]}
          />
        </section>
      ) : null}

      {periodoConsultado && !erro && resumoFiltrado.porEntregador.length > 0 ? (
        <section className="space-y-2">
          <SecaoTitulo eyebrow="Equipe" titulo="Desempenho por entregador" />
          <div className="grid gap-px overflow-hidden rounded-lg bg-border/50 ring-1 ring-border/50 sm:grid-cols-2 lg:grid-cols-3">
            {resumoFiltrado.porEntregador.slice(0, 9).map((item) => (
              <div key={item.entregador} className="flex flex-col gap-0.5 bg-card px-3 py-2">
                <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {item.entregador}
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {formatarNumero(item.davs, 0)} DAV
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatarNumero(item.entregues, 0)} entregues · ciclo médio {formatarDuracaoMinutos(item.mediaExpedicao)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle>Pedidos do período</CardTitle>
            </div>
          </div>
          <DataFilterBar
            busca={busca}
            onBuscaChange={setBusca}
            placeholder="Buscar por DAV, cliente ou entregador..."
            temFiltrosAtivos={filtrosAtivos > 0}
            onLimpar={() => {
              setBusca("");
              setSituacao("todas");
              setApenasEstourados(false);
            }}
          >
            <FiltroRelatorio
              rotulo="Filtrar por situação"
              valor={situacao}
              opcoes={[{ valor: "todas", rotulo: "Todas as situações" }, ...SITUACOES_PEDIDO_OPCOES]}
              onChange={(valor) => setSituacao(valor as "todas" | SituacaoPedido)}
            />
            <FiltroRelatorio
              rotulo="Filtrar por limite de tempo"
              valor={apenasEstourados ? "estourados" : "todos"}
              opcoes={[
                { valor: "todos", rotulo: "Todos os pedidos" },
                { valor: "estourados", rotulo: "Somente fora do limite" },
              ]}
              onChange={(valor) => setApenasEstourados(valor === "estourados")}
            />
          </DataFilterBar>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col gap-3 p-6">
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </div>
          ) : linhasFiltradas.length > 0 ? (
            <div className="px-3 pb-3">
              <ReportTable<LinhaPedido>
                label="pedidos"
                caption="Pedidos e entregas"
                data={linhasFiltradas}
                rowKey={(linha) => `${linha.dataVenda}-${linha.numero}`}
                showExport={false}
                acoesExtras={
                  <ExportDropdown
                    onExportarCsv={exportarCsv}
                    disabled={loading || linhasFiltradas.length === 0}
                    label="Exportar Excel"
                  />
                }
                columns={[
                  {
                    id: "data",
                    header: <>Data venda</>,
                    kind: "name",
                    value: (linha) => linha.dataVenda,
                    cell: (linha) => <>{linha.dataVenda.split("-").reverse().join("/")}</>,
                  },
                  {
                    id: "dav",
                    header: <>DAV</>,
                    kind: "name",
                    value: (linha) => linha.numero,
                    cell: (linha) => <span className="font-mono font-semibold">{linha.numero}</span>,
                  },
                  {
                    id: "cliente",
                    header: <>Cliente</>,
                    kind: "name",
                    value: (linha) => linha.cliente,
                    cell: (linha) => <span className="truncate">{linha.cliente}</span>,
                  },
                  {
                    id: "horaVenda",
                    header: <span title="D — horário da venda (PEDIDO.HR_VENDA)">Venda</span>,
                    kind: "name",
                    value: (linha) => linha.horaVenda ?? "",
                    cell: (linha) => <span className="font-mono">{horaCurta(linha.horaVenda)}</span>,
                  },
                  {
                    id: "separacao",
                    header: <span title="F — início da separação. O Syspro ainda não registra este horário.">Em separação</span>,
                    kind: "name",
                    value: (linha) => linha.horaSeparacao ?? "",
                    cell: () => <span className="text-muted-foreground">—</span>,
                  },
                  {
                    id: "alertaSeparacao",
                    header: <span title="E — Fórmula: em separação − venda. Limite 5 min.">Alerta sep.</span>,
                    kind: "number",
                    value: (linha) => linha.separacao.minutos,
                    cell: (linha) => <CelulaEtapa etapa={linha.separacao} />,
                  },
                  {
                    id: "conferido",
                    header: <span title="H — fim da separação/conferência (PEDIDO.HR_SEPARADO)">Conferido</span>,
                    kind: "name",
                    value: (linha) => linha.horaConferido ?? "",
                    cell: (linha) => <span className="font-mono">{horaCurta(linha.horaConferido)}</span>,
                  },
                  {
                    id: "alertaConferencia",
                    header: <span title="G — Fórmula: conferido − em separação (sem separação registrada, usa a venda). Limite 15 min.">Alerta conf.</span>,
                    kind: "number",
                    value: (linha) => linha.conferencia.minutos,
                    cell: (linha) => <CelulaEtapa etapa={linha.conferencia} />,
                  },
                  {
                    id: "saida",
                    header: <span title="J — saída para entrega (ENTREGA.HR_SAIDA)">Saída</span>,
                    kind: "name",
                    value: (linha) => linha.horaSaida ?? "",
                    cell: (linha) => <span className="font-mono">{horaCurta(linha.horaSaida)}</span>,
                  },
                  {
                    id: "alertaSaida",
                    header: <span title="I — Fórmula: saída − conferido. Limite 30 min.">Alerta saída</span>,
                    kind: "number",
                    value: (linha) => linha.saida.minutos,
                    cell: (linha) => <CelulaEtapa etapa={linha.saida} />,
                  },
                  {
                    id: "fechamento",
                    header: <span title="L — fechamento da DAV (PEDIDO.HR_FECHAMENTO)">Fechamento</span>,
                    kind: "name",
                    value: (linha) => linha.horaFechamento ?? "",
                    cell: (linha) => <span className="font-mono">{horaCurta(linha.horaFechamento)}</span>,
                  },
                  {
                    id: "alertaFechamento",
                    header: <span title="K — Fórmula: fechamento − saída. Limite provisório de 50 min.">Alerta fech.</span>,
                    kind: "number",
                    value: (linha) => linha.fechamento.minutos,
                    cell: (linha) => <CelulaEtapa etapa={linha.fechamento} />,
                  },
                  {
                    id: "totalExpedicao",
                    header: <span title="J − D: da venda até sair para entrega">Ciclo total</span>,
                    kind: "number",
                    value: (linha) => linha.totalExpedicao.minutos,
                    cell: (linha) => (
                      <span className="font-mono">{formatarDuracaoMinutos(linha.totalExpedicao.minutos)}</span>
                    ),
                  },
                  {
                    id: "entregador",
                    header: <span title="Entregador vinculado à entrega do pedido">Entregador</span>,
                    kind: "name",
                    value: (linha) => linha.entregador ?? "",
                    cell: (linha) => <span className="truncate">{linha.entregador ?? "—"}</span>,
                  },
                  {
                    id: "situacao",
                    header: <>Situação</>,
                    kind: "name",
                    value: (linha) => situacaoPedido(linha),
                    cell: (linha) => {
                      const situacaoLinha = situacaoPedido(linha);
                      return (
                        <Badge variant={badgeSituacaoPedido(situacaoLinha)}>
                          {ROTULO_SITUACAO_PEDIDO[situacaoLinha]}
                        </Badge>
                      );
                    },
                  },
                ]}
                rodape={(linhasRodape) => (
                  <StatusRelatorio
                    itens={[
                      { rotulo: "Pedidos", valor: formatarNumero(linhasRodape.length, 0) },
                      {
                        rotulo: "Período",
                        valor: periodoConsultado
                          ? `${periodoConsultado.inicial.split("-").reverse().join("/")} a ${periodoConsultado.final.split("-").reverse().join("/")}`
                          : "—",
                        destaque: true,
                        definicao: "Período consultado no Syspro.",
                      },
                      {
                        rotulo: "Filtros ativos",
                        valor: formatarNumero(filtrosAtivos, 0),
                        destaque: true,
                        definicao: "Conta busca textual, situação e filtro de limite.",
                      },
                    ]}
                  />
                )}
              />
            </div>
          ) : periodoConsultado ? (
            <FeedbackState
              variant="empty"
              title="Nenhum pedido encontrado"
              description="Não há pedidos para os filtros aplicados neste período."
            />
          ) : (
            <FeedbackState
              variant="empty"
              title="Defina o período"
              description="Use Consultar para carregar os pedidos do Syspro."
            />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        <span>Fonte: PEDIDO / ENTREGA / PARTICIPANTE via /api/dynamic/query do SysproServer.</span>
      </div>

      <GlossarioRelatorio
        itens={GUIAS_RELATORIOS.entregas.glossario ?? []}
        guia={GUIAS_RELATORIOS.entregas}
        relatorioLabel="Análise de Entrega"
      />
    </div>
  );
}
