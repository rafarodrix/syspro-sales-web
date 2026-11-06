/**
 * Acompanhamento operacional do pedido (DAV): da venda até o fechamento.
 *
 * Cada alerta mede o tempo gasto NA PRÓPRIA ETAPA — não o acumulado desde a
 * venda. Assim dá para ver onde o processo trava:
 *
 *   venda --E--> em separação --G--> conferido --I--> saída --K--> fechamento
 *
 *   E = separação   (F - D) limite 5 min
 *   G = conferência (H - F) limite 15 min
 *   I = saída       (J - H) limite 30 min
 *   K = fechamento  (L - J) limite a definir (50 min por padrão)
 *   Total até expedição = J - D
 *
 * O Syspro ainda não registra o início da separação (F). Enquanto isso, o
 * alerta de conferência usa a venda como início (D) e a linha é marcada com
 * `baseAlternativa` — é o caso descrito pelo Rafael: H é o fim de separação +
 * conferência quando o sistema não separa as duas etapas.
 *
 * Fonte: PEDIDO / ENTREGA / PARTICIPANTE via `/api/dynamic/query` do SysproServer.
 */

export const SLA_ENTREGA = {
  separacaoMinutos: 5,
  conferenciaMinutos: 15,
  saidaMinutos: 30,
  /** Limite provisório — o valor de fechamento ainda será definido. */
  fechamentoMinutos: 50,
} as const;

export interface PedidoSyspro {
  numero: string;
  cliente: string;
  dataVenda: string;
  horaVenda: string | null;
  /** Início da separação (F). O Syspro ainda não expõe este horário. */
  horaSeparacao: string | null;
  /** Fim de separação/conferência (H) — PEDIDO.HR_SEPARADO. */
  horaConferido: string | null;
  /** Saída para entrega (J) — ENTREGA.HR_SAIDA. */
  horaSaida: string | null;
  /** Fechamento da DAV (L) — PEDIDO.HR_FECHAMENTO. */
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
  /** A etapa usou outro marco como início por falta do horário real. */
  baseAlternativa: boolean;
}

export interface LinhaPedido extends PedidoSyspro {
  separacao: Etapa;
  conferencia: Etapa;
  saida: Etapa;
  fechamento: Etapa;
  /** J - D: da venda até sair para entrega. */
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

/** Diferença em minutos entre dois horários do MESMO dia (final - inicial). */
export function minutosEntre(inicio?: string | null, fim?: string | null): number | null {
  const a = horaParaMinutos(inicio);
  const b = horaParaMinutos(fim);
  if (a === null || b === null) return null;
  const diferenca = b - a;
  if (diferenca < 0) return null;
  return Math.round(diferenca * 10) / 10;
}

function arredondar(minutos: number): number {
  return Math.round(minutos * 10) / 10;
}

/**
 * Monta uma etapa do fluxo.
 *
 * @param base         horário que abre a etapa (marco anterior)
 * @param inicioReal   horário real de início da etapa, quando existe
 * @param fim          horário que fecha a etapa
 * @param limite       limite em minutos
 * @param agoraMinutos minuto atual, para medir etapa em andamento
 */
function montarEtapa(
  base: string | null,
  inicioReal: string | null,
  fim: string | null,
  limite: number,
  agoraMinutos: number | null,
): Etapa {
  const inicio = inicioReal ?? base;
  const baseAlternativa = !inicioReal && Boolean(base);
  const minutos = minutosEntre(inicio, fim);

  if (minutos !== null) {
    return { inicio, fim, minutos, limite, estourou: minutos > limite, emAndamento: false, baseAlternativa };
  }

  // Sem fim e com início: a etapa está correndo — mede até agora.
  const inicioMinutos = horaParaMinutos(inicio);
  if (fim === null && inicioMinutos !== null && agoraMinutos !== null && agoraMinutos > inicioMinutos) {
    const decorridos = arredondar(agoraMinutos - inicioMinutos);
    return {
      inicio,
      fim,
      minutos: decorridos,
      limite,
      estourou: decorridos > limite,
      emAndamento: true,
      baseAlternativa,
    };
  }

  return { inicio, fim, minutos: null, limite, estourou: false, emAndamento: false, baseAlternativa };
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

  return {
    ...pedido,
    // Sem F, a separação não é mensurável: o intervalo D->H já é a conferência.
    separacao: {
      inicio: pedido.horaVenda,
      fim: pedido.horaSeparacao,
      minutos: minutosEntre(pedido.horaVenda, pedido.horaSeparacao),
      limite: SLA_ENTREGA.separacaoMinutos,
      estourou: false,
      emAndamento: false,
      baseAlternativa: false,
    },
    conferencia: montarEtapa(
      pedido.horaVenda,
      pedido.horaSeparacao,
      pedido.horaConferido,
      SLA_ENTREGA.conferenciaMinutos,
      agora,
    ),
    saida: montarEtapa(
      pedido.horaConferido,
      pedido.horaConferido,
      pedido.horaSaida,
      SLA_ENTREGA.saidaMinutos,
      agora,
    ),
    fechamento: montarEtapa(
      pedido.horaSaida,
      pedido.horaSaida,
      pedido.horaFechamento,
      SLA_ENTREGA.fechamentoMinutos,
      agora,
    ),
    totalExpedicao: {
      inicio: pedido.horaVenda,
      fim: pedido.horaSaida,
      minutos: minutosEntre(pedido.horaVenda, pedido.horaSaida),
      limite: 0,
      estourou: false,
      emAndamento: false,
      baseAlternativa: false,
    },
  };
}

export function montarLinhasPedido(pedidos: PedidoSyspro[], opcoes: OpcoesLinha = {}): LinhaPedido[] {
  return pedidos.map((pedido) => montarLinhaPedido(pedido, opcoes));
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

export const SITUACOES_PEDIDO_OPCOES: Array<{ valor: SituacaoPedido; rotulo: string }> = [
  { valor: "entregue", rotulo: "Entregue" },
  { valor: "pendente", rotulo: "Pendente" },
  { valor: "em-rota", rotulo: "Em entrega" },
  { valor: "cancelado", rotulo: "Cancelado" },
  { valor: "outro", rotulo: "Outro" },
];

export const ROTULO_SITUACAO_PEDIDO: Record<SituacaoPedido, string> = {
  entregue: "Entregue",
  pendente: "Pendente",
  "em-rota": "Em entrega",
  cancelado: "Cancelado",
  outro: "Outro",
};

/** 13,4 -> "13,4 min"; 63 -> "1h03"; null -> "—". */
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
  separacao: ResumoEtapa;
  conferencia: ResumoEtapa;
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

export function resumirPedidos(linhas: LinhaPedido[]): ResumoPedidos {
  const porEntregador = new Map<string, LinhaPedido[]>();
  for (const linha of linhas) {
    if (!linha.entregador) continue;
    const atual = porEntregador.get(linha.entregador);
    if (atual) atual.push(linha);
    else porEntregador.set(linha.entregador, [linha]);
  }

  return {
    total: linhas.length,
    entregues: linhas.filter((linha) => situacaoPedido(linha) === "entregue").length,
    pendentes: linhas.filter((linha) => situacaoPedido(linha) === "pendente").length,
    emRota: linhas.filter((linha) => situacaoPedido(linha) === "em-rota").length,
    cancelados: linhas.filter((linha) => situacaoPedido(linha) === "cancelado").length,
    separacao: resumirEtapa(linhas.map((linha) => linha.separacao)),
    conferencia: resumirEtapa(linhas.map((linha) => linha.conferencia)),
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
