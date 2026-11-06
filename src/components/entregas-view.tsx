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
  FILTROS_DOCUMENTO,
  FILTROS_SITUACAO_ENTREGA,
  ROTULO_SITUACAO_PEDIDO,
  formatarDuracaoMinutos,
  montarLinhasPedido,
  passaFiltroDocumento,
  passaFiltroSituacao,
  resumirPedidos,
  situacaoPedido,
  type Etapa,
  type FiltroDocumento,
  type FiltroSituacao,
  type LinhaPedido,
  type PedidoSyspro,
  type ResumoEtapa,
  type ResumoPedidos,
  type SituacaoPedido,
  tipoDocumento,
} from "@/lib/pedidos";

const RESUMO_ETAPA_VAZIO: ResumoEtapa = { media: null, dentro: 0, fora: 0, percentualNoPrazo: null, emAndamento: 0 };

const RESUMO_VAZIO: ResumoPedidos = {
  total: 0,
  entregues: 0,
  pendentes: 0,
  emRota: 0,
  cancelados: 0,
  atrasados: 0,
  maiorEsperaMinutos: null,
  separacao: RESUMO_ETAPA_VAZIO,
  saida: RESUMO_ETAPA_VAZIO,
  fechamento: RESUMO_ETAPA_VAZIO,
  totalExpedicao: RESUMO_ETAPA_VAZIO,
  porEntregador: [],
};

const COLUNAS_EXPORTACAO_PEDIDOS = [
  "Data venda",
  "DAV",
  "Cliente",
  "Hora venda",
  "Separado",
  "Alerta separação (min)",
  "Saída para entrega",
  "Alerta saída (min)",
  "Fechamento",
  "Alerta fechamento (min)",
  "Ciclo até expedição (min)",
  "Entregador",
  "Situação",
] as const;

function horaCurta(hora: string | null): string {
  return hora ? hora.slice(0, 5) : "—";
}

/** 27/10/2026 → 27/10 (o ano fica no tooltip e na exportação). */
function dataCurta(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return dia && mes ? `${dia}/${mes}` : (data ?? "—");
}

function badgeSituacaoPedido(situacao: SituacaoPedido) {
  if (situacao === "entregue") return "default" as const;
  if (situacao === "pendente") return "secondary" as const;
  if (situacao === "em-rota") return "outline" as const;
  if (situacao === "cancelado") return "destructive" as const;
  return "outline" as const;
}

/** Hora da etapa com o tempo decorrido logo abaixo, colorido pelo limite. */
function CelulaHoraEtapa({ hora, etapa }: { hora: string | null; etapa: Etapa }) {
  const cor = etapa.minutos === null
    ? "text-muted-foreground"
    : etapa.emAndamento
      ? "text-amber-600 dark:text-amber-500"
      : etapa.estourou
        ? "text-destructive font-semibold"
        : "text-emerald-600 dark:text-emerald-500";
  return (
    <span className="flex flex-col leading-tight">
      <span className="font-mono text-[11px]">{horaCurta(hora)}</span>
      <span className={`text-[10px] ${cor}`} title={`Limite de ${etapa.limite} min`}>
        {etapa.minutos === null ? "—" : `${formatarDuracaoMinutos(etapa.minutos)}${etapa.emAndamento ? "…" : ""}`}
      </span>
    </span>
  );
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
      className={etapa.estourou ? "font-semibold text-destructive" : "text-emerald-600 dark:text-emerald-500"}
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
  // Padrão operacional: a tela abre nos pedidos que ainda precisam de ação.
  const [situacao, setSituacao] = useState<FiltroSituacao>("em-aberto");
  const [apenasEstourados, setApenasEstourados] = useState(false);
  // Padrão: só pedidos de venda (orçamento não é entrega).
  const [documento, setDocumento] = useState<FiltroDocumento>("pedido");
  const [hoje, setHoje] = useState<string>(() => new Date().toISOString().slice(0, 10));

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
      setHoje(agora.toISOString().slice(0, 10));
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
    const prioridade: Record<SituacaoPedido, number> = {
      pendente: 0,
      "em-rota": 1,
      outro: 2,
      entregue: 3,
      cancelado: 4,
    };
    return linhas
      .filter((linha) => {
        if (!passaFiltroDocumento(linha, documento)) return false;
        if (!passaFiltroSituacao(linha, situacao)) return false;
        if (
          apenasEstourados &&
          !linha.separacao.estourou &&
          !linha.saida.estourou &&
          !linha.fechamento.estourou
        ) {
          return false;
        }
        if (!termo) return true;
        return (
          linha.numero.toLowerCase().includes(termo) ||
          linha.cliente.toLowerCase().includes(termo) ||
          (linha.entregador ?? "").toLowerCase().includes(termo)
        );
      })
      .sort((a, b) => {
        const porSituacao = prioridade[situacaoPedido(a)] - prioridade[situacaoPedido(b)];
        if (porSituacao !== 0) return porSituacao;
        // Mais antigo primeiro: é quem está esperando há mais tempo.
        if (a.dataVenda !== b.dataVenda) return a.dataVenda < b.dataVenda ? -1 : 1;
        return (a.horaVenda ?? "").localeCompare(b.horaVenda ?? "");
      });
  }, [linhas, busca, situacao, apenasEstourados, documento]);

  const resumoFiltrado = useMemo(() => resumirPedidos(linhasFiltradas, { hoje }), [linhasFiltradas, hoje]);
  const resumoPeriodo = useMemo(() => resumirPedidos(linhas, { hoje }), [linhas, hoje]);

  const filtrosAtivos =
    (busca.trim() ? 1 : 0) +
    (situacao !== "em-aberto" ? 1 : 0) +
    (apenasEstourados ? 1 : 0) +
    (documento !== "pedido" ? 1 : 0);

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
      horaCurta(linha.horaConferido),
      linha.separacao.minutos ?? "",
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
        description={`Cada etapa do DAV em ${empresaNome}: separação, saída e fechamento — com o tempo gasto em cada uma.`}
        footer="Limites: separado até 15 min · saída até 30 min · fechamento até 50 min (provisório)."
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
          <SecaoTitulo
            eyebrow="Ação"
            titulo="Pedidos do período"
            descricao="A tela abre sem os entregues: o que está na fila é o que precisa de ação."
          />
          <MetricsStrip
            itens={[
              {
                rotulo: "Em aberto",
                valor: formatarNumero(resumoPeriodo.total - resumoPeriodo.entregues - resumoPeriodo.cancelados, 0),
                detalhe: "pendentes + em entrega",
                attention: resumoPeriodo.total - resumoPeriodo.entregues - resumoPeriodo.cancelados > 0,
                definicao: "Pedidos do recorte que ainda não foram entregues nem cancelados.",
              },
              {
                rotulo: "Atrasados",
                valor: formatarNumero(resumoPeriodo.atrasados, 0),
                detalhe: "fora do limite ou parados",
                attention: resumoFiltrado.atrasados > 0,
                definicao: "Pedidos em aberto que estouraram o limite em alguma etapa ou que continuam parados sendo de um dia anterior.",
              },
              {
                rotulo: "Maior ciclo",
                valor: formatarDuracaoMinutos(resumoPeriodo.maiorEsperaMinutos),
                detalhe: "da venda até a saída",
                definicao: "Maior ciclo (venda → saída) entre os pedidos do recorte. Só considera pedidos com saída registrada.",
              },
              { rotulo: "Em entrega", valor: formatarNumero(resumoPeriodo.emRota, 0) },
              { rotulo: "Entregues", valor: formatarNumero(resumoPeriodo.entregues, 0), detalhe: "no período" },
              { rotulo: "Cancelados", valor: formatarNumero(resumoPeriodo.cancelados, 0), detalhe: "no período" },
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
                  ? "sem dado"
                  : `${formatarPercentual(resumoFiltrado.separacao.percentualNoPrazo, 0)} no prazo`,
                attention: resumoFiltrado.separacao.fora > 0,
                definicao: "Fórmula: separado (H) − venda (D). Limite 15 min. O Syspro não registra o início da separação, então esta etapa cobre separação + conferência.",
              },
              {
                rotulo: "Saída",
                valor: formatarDuracaoMinutos(resumoFiltrado.saida.media),
                detalhe: resumoFiltrado.saida.percentualNoPrazo === null
                  ? "sem dado"
                  : `${formatarPercentual(resumoFiltrado.saida.percentualNoPrazo, 0)} no prazo`,
                attention: resumoFiltrado.saida.fora > 0,
                definicao: "Fórmula: saída para entrega (J) − separado (H). Limite 30 min.",
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
                rotulo: "Ciclo total",
                valor: formatarDuracaoMinutos(resumoFiltrado.totalExpedicao.media),
                detalhe: "venda → saída",
                definicao: "Fórmula: saída (J) − venda (D). Sem limite: mede o tempo total até a mercadoria sair.",
              },
              {
                rotulo: "Em andamento",
                valor: formatarNumero(
                  resumoFiltrado.separacao.emAndamento +
                    resumoFiltrado.saida.emAndamento +
                    resumoFiltrado.fechamento.emAndamento,
                  0,
                ),
                detalhe: "etapas correndo agora",
                attention:
                  resumoFiltrado.separacao.emAndamento +
                    resumoFiltrado.saida.emAndamento +
                    resumoFiltrado.fechamento.emAndamento >
                  0,
                definicao: "Etapas que começaram e ainda não terminaram no dia corrente; o tempo é medido até agora.",
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
              <CardTitle>
                {situacao === "em-aberto" ? "Pedidos em aberto" : "Pedidos do período"}
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                A. sep. / A. saída / A. fech. = tempo gasto naquela etapa (do marco anterior até ela).
              </p>
            </div>
          </div>
          <DataFilterBar
            busca={busca}
            onBuscaChange={setBusca}
            placeholder="Buscar por DAV, cliente ou entregador..."
            temFiltrosAtivos={filtrosAtivos > 0}
            onLimpar={() => {
              setBusca("");
              setSituacao("em-aberto");
              setApenasEstourados(false);
              setDocumento("pedido");
            }}
          >
            <FiltroRelatorio
              rotulo="Filtrar por documento"
              valor={documento}
              opcoes={FILTROS_DOCUMENTO.map((opcao) => ({ valor: opcao.valor, rotulo: opcao.rotulo }))}
              onChange={(valor) => setDocumento(valor as FiltroDocumento)}
            />
            <FiltroRelatorio
              rotulo="Filtrar por situação"
              valor={situacao}
              opcoes={FILTROS_SITUACAO_ENTREGA.map((opcao) => ({ valor: opcao.valor, rotulo: opcao.rotulo }))}
              onChange={(valor) => setSituacao(valor as FiltroSituacao)}
            />
            <FiltroRelatorio
              rotulo="Filtrar por limite de tempo"
              valor={apenasEstourados ? "estourados" : "todos"}
              opcoes={[
                { valor: "todos", rotulo: "Todos os pedidos" },
                { valor: "estourados", rotulo: "Somente atrasados" },
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
                    header: <>Data</>,
                    kind: "date",
                    className: "w-16 whitespace-nowrap",
                    value: (linha) => linha.dataVenda,
                    cell: (linha) => (
                      <span className="font-mono text-[11px] text-muted-foreground" title={linha.dataVenda.split("-").reverse().join("/")}>
                        {dataCurta(linha.dataVenda)}
                      </span>
                    ),
                  },
                  {
                    id: "dav",
                    header: <>DAV</>,
                    kind: "name",
                    className: "w-20 whitespace-nowrap",
                    value: (linha) => linha.numero,
                    cell: (linha) => (
                      <span className="flex items-center gap-1">
                        <span className="font-mono text-[11px] font-semibold">{linha.numero}</span>
                        {tipoDocumento(linha) === "orcamento" ? (
                          <span className="rounded bg-muted px-1 text-[9px] font-semibold uppercase text-muted-foreground">
                            orç
                          </span>
                        ) : null}
                      </span>
                    ),
                  },
                  {
                    id: "cliente",
                    header: <>Cliente</>,
                    kind: "name",
                    className: "min-w-[130px] max-w-[170px]",
                    value: (linha) => linha.cliente,
                    cell: (linha) => <span className="block truncate">{linha.cliente}</span>,
                  },
                  {
                    id: "horaVenda",
                    header: <span title="D — horário da venda (PEDIDO.HR_VENDA)">Venda</span>,
                    kind: "number",
                    className: "w-14 whitespace-nowrap",
                    value: (linha) => linha.horaVenda ?? "",
                    cell: (linha) => <span className="font-mono text-[11px]">{horaCurta(linha.horaVenda)}</span>,
                  },
                  {
                    id: "separado",
                    header: <span title="H — fim da separação/conferência. Abaixo: tempo desde a venda (limite 15 min)">Separado</span>,
                    kind: "number",
                    className: "w-16 whitespace-nowrap",
                    value: (linha) => linha.horaConferido ?? "",
                    cell: (linha) => <CelulaHoraEtapa hora={linha.horaConferido} etapa={linha.separacao} />,
                  },
                  {
                    id: "saida",
                    header: <span title="J — saída para entrega. Abaixo: tempo desde o separado (limite 30 min)">Saída</span>,
                    kind: "number",
                    className: "w-16 whitespace-nowrap",
                    value: (linha) => linha.horaSaida ?? "",
                    cell: (linha) => <CelulaHoraEtapa hora={linha.horaSaida} etapa={linha.saida} />,
                  },
                  {
                    id: "fechamento",
                    header: <span title="L — fechamento da DAV. Abaixo: tempo desde a saída (limite provisório 50 min)">Fecham.</span>,
                    kind: "number",
                    className: "w-16 whitespace-nowrap",
                    value: (linha) => linha.horaFechamento ?? "",
                    cell: (linha) => <CelulaHoraEtapa hora={linha.horaFechamento} etapa={linha.fechamento} />,
                  },
                  {
                    id: "totalExpedicao",
                    header: <span title="J − D: da venda até sair para entrega">Ciclo</span>,
                    kind: "number",
                    className: "w-14 whitespace-nowrap",
                    value: (linha) => linha.totalExpedicao.minutos,
                    cell: (linha) => (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {formatarDuracaoMinutos(linha.totalExpedicao.minutos)}
                      </span>
                    ),
                  },
                  {
                    id: "entregador",
                    header: <span title="Entregador vinculado à entrega do pedido">Entregador</span>,
                    kind: "name",
                    className: "min-w-[110px] max-w-[150px]",
                    value: (linha) => linha.entregador ?? "",
                    cell: (linha) => <span className="block truncate">{linha.entregador ?? "—"}</span>,
                  },
                  {
                    id: "situacao",
                    header: <>Situação</>,
                    kind: "name",
                    className: "w-20 whitespace-nowrap",
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
                        definicao: "Conta busca textual, situação e filtro de tempo.",
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
