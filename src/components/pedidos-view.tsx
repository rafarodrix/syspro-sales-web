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
import { formatarNumero } from "@/lib/formatters";
import { exportarParaCSV } from "@/lib/exportar-csv";
import {
  ROTULO_SITUACAO_PEDIDO,
  SITUACOES_PEDIDO_OPCOES,
  formatarDuracaoMinutos,
  montarLinhasPedido,
  resumirPedidos,
  situacaoPedido,
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
  mediaConferencia: null,
  mediaSaida: null,
  mediaFechamento: null,
  foraDaConferencia: 0,
  foraDaSaida: 0,
  foraDoFechamento: 0,
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
  "Entregador",
  "Situação",
] as const;

function horaCurta(hora: string | null): string {
  if (!hora) return "—";
  return hora.slice(0, 5);
}

function badgeSituacaoPedido(situacao: SituacaoPedido) {
  if (situacao === "entregue") return "default" as const;
  if (situacao === "pendente") return "secondary" as const;
  if (situacao === "em-rota") return "outline" as const;
  if (situacao === "cancelado") return "destructive" as const;
  return "outline" as const;
}

function CelulaAlerta({ minutos, limite }: { minutos: number | null; limite: number }) {
  if (minutos === null) return <span className="text-muted-foreground">—</span>;
  const estourou = minutos > limite;
  return (
    <span className={estourou ? "font-semibold text-destructive" : "text-muted-foreground"}>
      {formatarDuracaoMinutos(minutos)}
    </span>
  );
}

export function PedidosView({
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
      const montadas = montarLinhasPedido(dados.pedidos ?? []);
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
        !linha.alertaConferencia.estourou &&
        !linha.alertaSaida.estourou &&
        !linha.alertaFechamento.estourou
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
      linha.alertaSeparacao.minutos ?? "",
      horaCurta(linha.horaConferido),
      linha.alertaConferencia.minutos ?? "",
      horaCurta(linha.horaSaida),
      linha.alertaSaida.minutos ?? "",
      horaCurta(linha.horaFechamento),
      linha.alertaFechamento.minutos ?? "",
      linha.entregador ?? "",
      ROTULO_SITUACAO_PEDIDO[situacaoPedido(linha)],
    ]);
    const periodoTexto = periodoConsultado
      ? `${periodoConsultado.inicial}_a_${periodoConsultado.final}`
      : new Date().toISOString().slice(0, 10);
    exportarParaCSV(
      `pedidos-${empresaNome.replace(/[^\w-]+/g, "-").toLowerCase()}-${periodoTexto}`,
      [...COLUNAS_EXPORTACAO_PEDIDOS],
      corpo,
    );
    toast.success(`${linhasFiltradas.length} pedido(s) exportado(s).`);
  }

  return (
    <div className="flex flex-col gap-6">
      <AnalysisQueryCard
        icon={Clock}
        title="Pedidos e Entregas"
        description={`Do horário da venda até o fechamento do DAV em ${empresaNome}.`}
        footer="Limites operacionais: separação 5 min · conferência 15 min · saída para entrega 30 min · fechamento 50 min."
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
              { rotulo: "Pedidos", valor: formatarNumero(resumo.total, 0), detalhe: `${linhas.length} linhas` },
              { rotulo: "Entregues", valor: formatarNumero(resumo.entregues, 0) },
              { rotulo: "Pendentes", valor: formatarNumero(resumo.pendentes, 0), attention: resumo.pendentes > 0 },
              { rotulo: "Em entrega", valor: formatarNumero(resumo.emRota, 0) },
              { rotulo: "Cancelados", valor: formatarNumero(resumo.cancelados, 0) },
            ]}
          />
        </section>
      ) : null}

      {periodoConsultado && !erro ? (
        <section className="space-y-2">
          <SecaoTitulo eyebrow="Tempo" titulo="Atendimento dos limites" />
          <MetricsStrip
            itens={[
              {
                rotulo: "Média conferência",
                valor: formatarDuracaoMinutos(resumo.mediaConferencia),
                detalhe: `limite ${15} min`,
                attention: resumo.foraDaConferencia > 0,
                definicao: "Fórmula: média de (conferido − hora da venda) dos pedidos com horário.",
              },
              {
                rotulo: "Média saída",
                valor: formatarDuracaoMinutos(resumo.mediaSaida),
                detalhe: `limite ${30} min`,
                attention: resumo.foraDaSaida > 0,
                definicao: "Fórmula: média de (saída para entrega − hora da venda).",
              },
              {
                rotulo: "Média fechamento",
                valor: formatarDuracaoMinutos(resumo.mediaFechamento),
                detalhe: `limite ${50} min`,
                attention: resumo.foraDoFechamento > 0,
                definicao: "Fórmula: média de (fechamento − hora da venda).",
              },
              {
                rotulo: "Fora do limite",
                valor: formatarNumero(
                  resumo.foraDaConferencia + resumo.foraDaSaida + resumo.foraDoFechamento,
                  0,
                ),
                detalhe: `${resumo.foraDaConferencia} conf · ${resumo.foraDaSaida} saída`,
                attention: resumo.foraDaConferencia + resumo.foraDaSaida + resumo.foraDoFechamento > 0,
                definicao: "Pedidos que estouraram o limite em pelo menos uma etapa.",
              },
            ]}
          />
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
                    header: <span title="Horário da venda (PEDIDO.HR_VENDA)">Hora venda</span>,
                    kind: "name",
                    value: (linha) => linha.horaVenda ?? "",
                    cell: (linha) => <span className="font-mono">{horaCurta(linha.horaVenda)}</span>,
                  },
                  {
                    id: "separacao",
                    header: <span title="Horário em que o pedido saiu para separação. O Syspro ainda não registra este horário.">Em separação</span>,
                    kind: "name",
                    value: (linha) => linha.horaSeparacao ?? "",
                    cell: () => <span className="text-muted-foreground">—</span>,
                  },
                  {
                    id: "alertaSeparacao",
                    header: <span title="Fórmula: em separação − hora da venda (limite 5 min)">Alerta sep.</span>,
                    kind: "number",
                    value: (linha) => linha.alertaSeparacao.minutos,
                    cell: (linha) => <CelulaAlerta minutos={linha.alertaSeparacao.minutos} limite={linha.alertaSeparacao.limite} />,
                  },
                  {
                    id: "conferido",
                    header: <span title="Horário em que a conferência terminou (PEDIDO.HR_SEPARADO)">Conferido</span>,
                    kind: "name",
                    value: (linha) => linha.horaConferido ?? "",
                    cell: (linha) => <span className="font-mono">{horaCurta(linha.horaConferido)}</span>,
                  },
                  {
                    id: "alertaConferencia",
                    header: <span title="Fórmula: conferido − hora da venda (limite 15 min)">Alerta conf.</span>,
                    kind: "number",
                    value: (linha) => linha.alertaConferencia.minutos,
                    cell: (linha) => <CelulaAlerta minutos={linha.alertaConferencia.minutos} limite={linha.alertaConferencia.limite} />,
                  },
                  {
                    id: "saida",
                    header: <span title="Horário de saída para entrega (ENTREGA.HR_SAIDA)">Saída</span>,
                    kind: "name",
                    value: (linha) => linha.horaSaida ?? "",
                    cell: (linha) => <span className="font-mono">{horaCurta(linha.horaSaida)}</span>,
                  },
                  {
                    id: "alertaSaida",
                    header: <span title="Fórmula: saída − hora da venda (limite 30 min)">Alerta saída</span>,
                    kind: "number",
                    value: (linha) => linha.alertaSaida.minutos,
                    cell: (linha) => <CelulaAlerta minutos={linha.alertaSaida.minutos} limite={linha.alertaSaida.limite} />,
                  },
                  {
                    id: "fechamento",
                    header: <span title="Horário de fechamento do DAV (PEDIDO.HR_FECHAMENTO)">Fechamento</span>,
                    kind: "name",
                    value: (linha) => linha.horaFechamento ?? "",
                    cell: (linha) => <span className="font-mono">{horaCurta(linha.horaFechamento)}</span>,
                  },
                  {
                    id: "alertaFechamento",
                    header: <span title="Fórmula: fechamento − hora da venda (limite 50 min)">Alerta fech.</span>,
                    kind: "number",
                    value: (linha) => linha.alertaFechamento.minutos,
                    cell: (linha) => <CelulaAlerta minutos={linha.alertaFechamento.minutos} limite={linha.alertaFechamento.limite} />,
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
        <Truck className="size-3.5" />
        <span>
          Fonte: PEDIDO / ENTREGA / PARTICIPANTE via /api/dynamic/query do SysproServer.
        </span>
      </div>

      <GlossarioRelatorio
        itens={GUIAS_RELATORIOS.pedidos.glossario ?? []}
        guia={GUIAS_RELATORIOS.pedidos}
        relatorioLabel="Pedidos e Entregas"
      />
    </div>
  );
}
