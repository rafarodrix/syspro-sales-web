/**
 * Acompanhamento operacional do pedido (DAV): da venda até o fechamento.
 *
 * Cada alerta mede o tempo gasto NA PRÓPRIA ETAPA — não o acumulado desde a
 * venda. Assim dá para ver onde o processo trava:
 *
 *   venda (D) ──▶ separado (H) ──▶ saída (J) ──▶ fechamento (L)
 *
 *   Separação  = H − D  limite 15 min
 *   Saída      = J − H  limite 30 min
 *   Fechamento = L − J  limite 50 min (provisório)
 *   Ciclo total até expedição = J − D
 *
 * O Syspro NÃO registra o início da separação (o "em separação" da planilha):
 * só existe o fim, PEDIDO.HR_SEPARADO — o campo "Separado". Por isso o alerta
 * de separação mede da venda até o separado, cobrindo separação + conferência.
 * Se o fornecedor passar a expor o início, basta usar `horaSeparacao` como
 * marco intermediário (o modelo já prevê o campo).
 *
 * Fonte: PEDIDO / ENTREGA / PARTICIPANTE via `/api/dynamic/query` do SysproServer.
 */

export const SLA_ENTREGA = {
  /** Da venda até o separado (separação + conferência). */
  separacaoMinutos: 15,
  /** Do separado até a saída para entrega. */
  saidaMinutos: 30,
  /** Da saída até o fechamento da DAV. Limite provisório. */
  fechamentoMinutos: 50,
} as const;

export interface PedidoSyspro {
  numero: string;
  /** TP_PEDIDO: "PV" (pedido de venda) ou "DAV-OR" (orçamento). */
  tipoPedido: string;
  /** ORIGEM: "BALCAO", "ORCAMENTO" etc. */
  origem: string;
  /** PEDIDO.ENTREGA: true = vai para entrega; false = retira no balcão. */
  entrega: boolean;
  /** PEDIDO.VLR_TOTAL. */
  valor: number;
  cliente: string;
  dataVenda: string;
  horaVenda: string | null;
  /** Início da separação — ainda não registrado pelo Syspro (fica sempre nulo). */
  horaSeparacao: string | null;
  /** "Separado": fim da separação/conferência (PEDIDO.HR_SEPARADO). */
  horaConferido: string | null;
  /** Saída para entrega (ENTREGA.HR_SAIDA). */
  horaSaida: string | null;
  /** Fechamento da DAV (PEDIDO.HR_FECHAMENTO). */
  horaFechamento: string | null;
  entregador: string | null;
  status: string;
  status2: string;
  empresaCodigo: string;
}

export interface Etapa {
  inicio: string | null;
  fim: string | null;
  minutos: number | null;
  limite: number;
  estourou: boolean;
  /** Sem fim, mas com início: a etapa ainda está correndo. */
  emAndamento: boolean;
}

export interface LinhaPedido extends PedidoSyspro {
  separacao: Etapa;
  saida: Etapa;
  fechamento: Etapa;
  /** J − D: da venda até sair para entrega. */
  totalExpedicao: Etapa;
}

/** Converte "HH:MM:SS.mmm" em minutos desde a meia-noite. */
export function horaParaMinutos(hora?: string | null): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(String(hora ?? "").trim());
  if (!match) return null;
  const horas = Number(match[1]);
  const minutos = Number(match[2]);
  const segundos = Number(match[3] ?? 0);
  if (horas > 23 || minutos > 59 || segundos > 59) return null;
  return horas * 60 + minutos + segundos / 60;
}

/** Diferença em minutos entre dois horários do MESMO dia (final − inicial). */
export function minutosEntre(inicio?: string | null, fim?: string | null): number | null {
  const a = horaParaMinutos(inicio);
  const b = horaParaMinutos(fim);
  if (a === null || b === null) return null;
  const diferenca = b - a;
  if (diferenca < 0) return null;
  return Math.round(diferenca * 10) / 10;
}

/**
 * O Syspro grava o horário da venda em HR_FECHAMENTO enquanto o pedido está
 * aberto. Só vale como fechamento quando é posterior à venda.
 */
export function fechamentoConfiavel(
  horaVenda: string | null,
  horaFechamento: string | null,
): string | null {
  if (!horaFechamento) return null;
  const venda = horaParaMinutos(horaVenda);
  const fechamento = horaParaMinutos(horaFechamento);
  if (venda === null || fechamento === null) return horaFechamento;
  return fechamento - venda > 0.001 ? horaFechamento : null;
}

function arredondar(minutos: number): number {
  return Math.round(minutos * 10) / 10;
}

/**
 * Monta uma etapa do fluxo.
 *
 * @param inicio        horário que abre a etapa
 * @param fim           horário que fecha a etapa
 * @param limite        limite em minutos
 * @param agoraMinutos  minuto atual, para medir etapa em andamento
 */
function montarEtapa(
  inicio: string | null,
  fim: string | null,
  limite: number,
  agoraMinutos: number | null,
): Etapa {
  const minutos = minutosEntre(inicio, fim);
  if (minutos !== null) {
    return { inicio, fim, minutos, limite, estourou: minutos > limite, emAndamento: false };
  }

  // Sem fim e com início: a etapa está correndo — mede até agora.
  const inicioMinutos = horaParaMinutos(inicio);
  if (fim === null && inicioMinutos !== null && agoraMinutos !== null && agoraMinutos > inicioMinutos) {
    const decorridos = arredondar(agoraMinutos - inicioMinutos);
    return { inicio, fim, minutos: decorridos, limite, estourou: decorridos > limite, emAndamento: true };
  }

  return { inicio, fim, minutos: null, limite, estourou: false, emAndamento: false };
}

export interface OpcoesLinha {
  /** Minuto atual no fuso da operação — mede etapas ainda em andamento. */
  agoraMinutos?: number | null;
  /** Data de hoje (AAAA-MM-DD): "em andamento" só faz sentido no dia corrente. */
  hoje?: string | null;
}

export function montarLinhaPedido(pedido: PedidoSyspro, opcoes: OpcoesLinha = {}): LinhaPedido {
  const mesmoDia = !opcoes.hoje || pedido.dataVenda === opcoes.hoje;
  const agora = mesmoDia ? (opcoes.agoraMinutos ?? null) : null;
  // Sem o início da separação registrado, o marco é a própria venda.
  const inicioSeparacao = pedido.horaSeparacao ?? pedido.horaVenda;

  return {
    ...pedido,
    separacao: montarEtapa(inicioSeparacao, pedido.horaConferido, SLA_ENTREGA.separacaoMinutos, agora),
    saida: montarEtapa(pedido.horaConferido, pedido.horaSaida, SLA_ENTREGA.saidaMinutos, agora),
    fechamento: montarEtapa(pedido.horaSaida, pedido.horaFechamento, SLA_ENTREGA.fechamentoMinutos, agora),
    totalExpedicao: {
      inicio: pedido.horaVenda,
      fim: pedido.horaSaida,
      minutos: minutosEntre(pedido.horaVenda, pedido.horaSaida),
      limite: 0,
      estourou: false,
      emAndamento: false,
    },
  };
}

export function montarLinhasPedido(pedidos: PedidoSyspro[], opcoes: OpcoesLinha = {}): LinhaPedido[] {
  return pedidos.map((pedido) => montarLinhaPedido(pedido, opcoes));
}

/**
 * O Syspro separa documento e orçamento no próprio registro:
 *   TP_PEDIDO = "PV"     -> pedido de venda
 *   TP_PEDIDO = "DAV-OR" -> orçamento
 * (ORIGEM repete a mesma ideia: BALCAO x ORCAMENTO.)
 */
export type TipoDocumento = "pedido" | "orcamento" | "outro";

export function tipoDocumento(pedido: Pick<PedidoSyspro, "tipoPedido" | "origem">): TipoDocumento {
  const tipo = String(pedido.tipoPedido ?? "").trim().toUpperCase();
  const origem = String(pedido.origem ?? "").trim().toUpperCase();
  // TP_PEDIDO manda: um pedido pode nascer de orçamento (ORIGEM=ORCAMENTO) e
  // continuar sendo pedido de venda.
  if (tipo === "DAV-OR") return "orcamento";
  if (tipo === "PV") return "pedido";
  if (origem === "ORCAMENTO") return "orcamento";
  return "outro";
}

/**
 * Número do pedido: o Syspro só numera quando o pedido é gerado.
 * NUMERO = 0 com status aberto é lançamento em andamento; com cancelado é
 * documento cancelado antes de virar pedido.
 */
export function emLancamento(pedido: Pick<PedidoSyspro, "numero">): boolean {
  const numero = Number(String(pedido.numero ?? "").replace(/\D/g, ""));
  return !Number.isFinite(numero) || numero <= 0;
}

export type FiltroStatus = "aberto" | "lancamento" | "fechado" | "cancelado" | "todos";

export const FILTROS_STATUS: Array<{ valor: FiltroStatus; rotulo: string }> = [
  { valor: "aberto", rotulo: "Aberto" },
  { valor: "lancamento", rotulo: "Em lançamento" },
  { valor: "fechado", rotulo: "Fechado" },
  { valor: "cancelado", rotulo: "Cancelado" },
  { valor: "todos", rotulo: "Todos os status" },
];

/**
 * Aberto = tudo que não é CANCELADO nem FECHADO — e sem os documentos em
 * lançamento (numero 0), que ainda não são pedido e não passam pelo fluxo.
 */
export function passaFiltroStatus(
  pedido: Pick<PedidoSyspro, "status" | "numero">,
  filtro: FiltroStatus,
): boolean {
  const status = String(pedido.status ?? "").trim().toUpperCase();
  if (filtro === "todos") return true;
  if (filtro === "cancelado") return status === "CANCELADO";
  if (filtro === "fechado") return status === "FECHADO";
  if (filtro === "lancamento") return emLancamento(pedido) && status !== "CANCELADO";
  return status !== "CANCELADO" && status !== "FECHADO" && !emLancamento(pedido);
}

/** Legenda = STATUS2 do pedido (PENDENTE, SEPARADO, EM ENTREGA...). */
export type FiltroLegenda = "todas" | string;

export const FILTROS_LEGENDA: Array<{ valor: FiltroLegenda; rotulo: string }> = [
  { valor: "todas", rotulo: "Todas as legendas" },
  { valor: "PENDENTE", rotulo: "Pendente" },
  { valor: "EM SEPARACAO", rotulo: "Em separação" },
  { valor: "SEPARADO", rotulo: "Separado" },
  { valor: "EM ENTREGA", rotulo: "Em entrega" },
  { valor: "ENTREGUE", rotulo: "Entregue" },
  { valor: "DESISTENCIA", rotulo: "Desistência" },
  { valor: "NO CAIXA", rotulo: "No caixa" },
];

/** Rótulo de exibição da legenda (STATUS2) do Syspro. */
export const ROTULOS_LEGENDA: Record<string, string> = {
  PENDENTE: "Pendente",
  "EM SEPARACAO": "Em separação",
  SEPARADO: "Separado",
  "EM ENTREGA": "Em entrega",
  ENTREGUE: "Entregue",
  DESISTENCIA: "Desistência",
  "NO CAIXA": "No caixa",
  LANCANDO: "Lançando",
};

/**
 * A legenda do Syspro (STATUS2) é a fonte de verdade do estágio do pedido.
 * A "situação" calculada (pendente/em rota/entregue) é derivada e não deve
 * aparecer como se fosse o status do ERP.
 */
export function rotuloLegenda(pedido: Pick<PedidoSyspro, "status2">): string {
  const bruto = String(pedido.status2 ?? "").trim().toUpperCase();
  if (!bruto) return "—";
  return ROTULOS_LEGENDA[bruto] ?? bruto.charAt(0) + bruto.slice(1).toLowerCase();
}

export function passaFiltroLegenda(pedido: Pick<PedidoSyspro, "status2">, filtro: FiltroLegenda): boolean {
  if (filtro === "todas") return true;
  return String(pedido.status2 ?? "").trim().toUpperCase() === String(filtro).trim().toUpperCase();
}

export type FiltroAtendimento = "entrega" | "balcao" | "todos";

export const FILTROS_ATENDIMENTO: Array<{ valor: FiltroAtendimento; rotulo: string }> = [
  { valor: "todos", rotulo: "Entrega e balcão" },
  { valor: "entrega", rotulo: "Somente entrega" },
  { valor: "balcao", rotulo: "Somente balcão" },
];

export function passaFiltroAtendimento(
  pedido: Pick<PedidoSyspro, "entrega">,
  filtro: FiltroAtendimento,
): boolean {
  if (filtro === "todos") return true;
  return filtro === "entrega" ? pedido.entrega : !pedido.entrega;
}

export type FiltroDocumento = "pedido" | "orcamento" | "todos";

export const FILTROS_DOCUMENTO: Array<{ valor: FiltroDocumento; rotulo: string }> = [
  { valor: "pedido", rotulo: "Pedidos" },
  { valor: "orcamento", rotulo: "Orçamentos" },
  { valor: "todos", rotulo: "Pedidos e orçamentos" },
];

export function passaFiltroDocumento(
  pedido: Pick<PedidoSyspro, "tipoPedido" | "origem">,
  filtro: FiltroDocumento,
): boolean {
  if (filtro === "todos") return true;
  return tipoDocumento(pedido) === filtro;
}

export type SituacaoPedido = "entregue" | "pendente" | "em-rota" | "cancelado" | "outro";

export function situacaoPedido(pedido: Pick<PedidoSyspro, "status" | "status2">): SituacaoPedido {
  const status = String(pedido.status ?? "").trim().toUpperCase();
  const status2 = String(pedido.status2 ?? "").trim().toUpperCase();
  if (status2 === "ENTREGUE") return "entregue";
  if (status === "CANCELADO" || status2 === "DESISTENCIA") return "cancelado";
  if (status2 === "EM ENTREGA") return "em-rota";
  if (status2 === "PENDENTE" || status2 === "SEPARADO" || status2 === "EM SEPARACAO") return "pendente";
  return "outro";
}

/** Filtro padrão da tela: tudo menos os já entregues. */
export type FiltroSituacao = "em-aberto" | "todas" | SituacaoPedido;

export const FILTROS_SITUACAO_ENTREGA: Array<{ valor: FiltroSituacao; rotulo: string }> = [
  { valor: "em-aberto", rotulo: "Em aberto" },
  { valor: "pendente", rotulo: "Pendentes" },
  { valor: "em-rota", rotulo: "Em entrega" },
  { valor: "entregue", rotulo: "Entregues" },
  { valor: "cancelado", rotulo: "Cancelados" },
  { valor: "todas", rotulo: "Todas as situações" },
];

export function passaFiltroSituacao(pedido: Pick<PedidoSyspro, "status" | "status2">, filtro: FiltroSituacao): boolean {
  if (filtro === "todas") return true;
  const situacao = situacaoPedido(pedido);
  if (filtro === "em-aberto") return situacao !== "entregue" && situacao !== "cancelado";
  return situacao === filtro;
}

export const ROTULO_SITUACAO_PEDIDO: Record<SituacaoPedido, string> = {
  entregue: "Entregue",
  pendente: "Pendente",
  "em-rota": "Em entrega",
  cancelado: "Cancelado",
  outro: "Outro",
};

/** 13,4 → "13,4 min"; 63 → "1h03"; null → "—". */
export function formatarDuracaoMinutos(minutos: number | null | undefined): string {
  if (minutos === null || minutos === undefined || !Number.isFinite(minutos)) return "—";
  if (minutos < 60) return `${Math.round(minutos * 10) / 10} min`;
  const horas = Math.floor(minutos / 60);
  const resto = Math.round(minutos % 60);
  return `${horas}h${String(resto).padStart(2, "0")}`;
}

export interface ResumoEtapa {
  media: number | null;
  dentro: number;
  fora: number;
  /** Percentual de pedidos medidos que ficaram dentro do limite. */
  percentualNoPrazo: number | null;
  emAndamento: number;
}

export interface ResumoEntregador {
  entregador: string;
  davs: number;
  entregues: number;
  mediaExpedicao: number | null;
}

export interface ResumoPedidos {
  total: number;
  entregues: number;
  pendentes: number;
  emRota: number;
  cancelados: number;
  /** Pedidos fora de qualquer etapa concluída dentro do prazo. */
  atrasados: number;
  /** Maior ciclo medido (venda -> saída), em minutos. */
  maiorEsperaMinutos: number | null;
  /** Pedidos que saíram para entrega e voltaram (DESISTENCIA) — viagem perdida. */
  desistenciasComSaida: number;
  /** Valor dessas viagens perdidas. */
  valorPerdido: number;
  /** Entregues marcados como ENTREGA=SIM mas sem HR_SAIDA (processo não registrado). */
  entreguesSemSaida: number;
  /** Pedidos que ainda vão para entrega (ENTREGA=SIM e não entregues/cancelados). */
  entregasEmAberto: number;
  /** Valor em aberto (o que está na fila). */
  valorEmAberto: number;
  /** Taxa de desistência sobre as entregas que saíram (%). */
  taxaDesistencia: number | null;
  separacao: ResumoEtapa;
  saida: ResumoEtapa;
  fechamento: ResumoEtapa;
  totalExpedicao: ResumoEtapa;
  porEntregador: ResumoEntregador[];
}

function media(valores: Array<number | null>): number | null {
  const validos = valores.filter((valor): valor is number => valor !== null);
  if (validos.length === 0) return null;
  return validos.reduce((total, valor) => total + valor, 0) / validos.length;
}

function resumirEtapa(etapas: Etapa[]): ResumoEtapa {
  const medidas = etapas.filter((etapa) => etapa.minutos !== null && !etapa.emAndamento);
  const dentro = medidas.filter((etapa) => !etapa.estourou).length;
  const fora = medidas.length - dentro;
  return {
    media: media(medidas.map((etapa) => etapa.minutos)),
    dentro,
    fora,
    percentualNoPrazo: medidas.length > 0 ? (dentro / medidas.length) * 100 : null,
    emAndamento: etapas.filter((etapa) => etapa.emAndamento).length,
  };
}

export function resumirPedidos(
  linhas: LinhaPedido[],
  opcoes: { hoje?: string | null } = {},
): ResumoPedidos {
  const porEntregador = new Map<string, LinhaPedido[]>();
  for (const linha of linhas) {
    if (!linha.entregador) continue;
    const atual = porEntregador.get(linha.entregador);
    if (atual) atual.push(linha);
    else porEntregador.set(linha.entregador, [linha]);
  }

  const abertos = linhas.filter((linha) => {
    const situacao = situacaoPedido(linha);
    return situacao !== "entregue" && situacao !== "cancelado";
  });
  // Maior ciclo medido (venda -> saída) entre os pedidos do recorte.
  const ciclos = linhas
    .map((linha) => linha.totalExpedicao.minutos)
    .filter((valor): valor is number => valor !== null);

  const comSaida = linhas.filter((linha) => linha.horaSaida !== null);
  const desistenciasComSaida = comSaida.filter((linha) => situacaoPedido(linha) === "cancelado");
  const entregasEmAberto = abertos.filter((linha) => linha.entrega);

  return {
    total: linhas.length,
    entregues: linhas.filter((linha) => situacaoPedido(linha) === "entregue").length,
    pendentes: linhas.filter((linha) => situacaoPedido(linha) === "pendente").length,
    emRota: linhas.filter((linha) => situacaoPedido(linha) === "em-rota").length,
    cancelados: linhas.filter((linha) => situacaoPedido(linha) === "cancelado").length,
    // Atrasado = em aberto e (estourou alguma etapa OU é de dia anterior e continua parado).
    atrasados: abertos.filter((linha) => {
      const estourouAlguma = linha.separacao.estourou || linha.saida.estourou || linha.fechamento.estourou;
      const paradoDeOutroDia = Boolean(opcoes.hoje) && linha.dataVenda < String(opcoes.hoje);
      return estourouAlguma || paradoDeOutroDia;
    }).length,
    maiorEsperaMinutos: ciclos.length > 0 ? Math.max(...ciclos) : null,
    desistenciasComSaida: desistenciasComSaida.length,
    valorPerdido: desistenciasComSaida.reduce((total, linha) => total + linha.valor, 0),
    entreguesSemSaida: linhas.filter(
      (linha) => linha.entrega && situacaoPedido(linha) === "entregue" && linha.horaSaida === null,
    ).length,
    entregasEmAberto: entregasEmAberto.length,
    valorEmAberto: entregasEmAberto.reduce((total, linha) => total + linha.valor, 0),
    taxaDesistencia: comSaida.length > 0 ? (desistenciasComSaida.length / comSaida.length) * 100 : null,
    separacao: resumirEtapa(linhas.map((linha) => linha.separacao)),
    saida: resumirEtapa(linhas.map((linha) => linha.saida)),
    fechamento: resumirEtapa(linhas.map((linha) => linha.fechamento)),
    totalExpedicao: resumirEtapa(linhas.map((linha) => linha.totalExpedicao)),
    porEntregador: [...porEntregador.entries()]
      .map(([entregador, pedidos]) => ({
        entregador,
        davs: pedidos.length,
        entregues: pedidos.filter((linha) => situacaoPedido(linha) === "entregue").length,
        mediaExpedicao: media(pedidos.map((linha) => linha.totalExpedicao.minutos)),
      }))
      .sort((a, b) => b.davs - a.davs),
  };
}
