/**
 * Acompanhamento operacional do pedido (DAV): da venda até o fechamento.
 *
 * Fonte: tabelas PEDIDO / ENTREGA / PARTICIPANTE do Syspro, lidas pela rota
 * `/api/dynamic/query` do SysproServer (a rota de exportação `venda/pedidos`
 * não devolve conferência nem fechamento).
 *
 * Os limites de tempo são o padrão operacional da Trilink:
 *   separação 5 min · conferência 15 min · saída para entrega 30 min · fechamento 50 min
 */

export const SLA_PEDIDO = {
  separacaoMinutos: 5,
  conferenciaMinutos: 15,
  saidaMinutos: 30,
  fechamentoMinutos: 50,
} as const;

export interface PedidoSyspro {
  numero: string;
  cliente: string;
  dataVenda: string;
  horaVenda: string | null;
  /** Horário que saiu para separação (o Syspro ainda não expõe este campo). */
  horaSeparacao: string | null;
  /** Horário em que a conferência/separação terminou (PEDIDO.HR_SEPARADO). */
  horaConferido: string | null;
  /** Horário de saída para entrega (ENTREGA.HR_SAIDA). */
  horaSaida: string | null;
  /** Horário de fechamento (PEDIDO.HR_FECHAMENTO). */
  horaFechamento: string | null;
  entregador: string | null;
  status: string;
  status2: string;
  empresaCodigo: string;
}

export interface AlertaTempo {
  minutos: number | null;
  limite: number;
  estourou: boolean;
}

export interface LinhaPedido extends PedidoSyspro {
  alertaSeparacao: AlertaTempo;
  alertaConferencia: AlertaTempo;
  alertaSaida: AlertaTempo;
  alertaFechamento: AlertaTempo;
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

function alerta(inicio: string | null, fim: string | null, limite: number): AlertaTempo {
  const minutos = minutosEntre(inicio, fim);
  return { minutos, limite, estourou: minutos !== null && minutos > limite };
}

export function montarLinhaPedido(pedido: PedidoSyspro): LinhaPedido {
  return {
    ...pedido,
    alertaSeparacao: alerta(pedido.horaVenda, pedido.horaSeparacao, SLA_PEDIDO.separacaoMinutos),
    alertaConferencia: alerta(pedido.horaVenda, pedido.horaConferido, SLA_PEDIDO.conferenciaMinutos),
    alertaSaida: alerta(pedido.horaVenda, pedido.horaSaida, SLA_PEDIDO.saidaMinutos),
    alertaFechamento: alerta(pedido.horaVenda, pedido.horaFechamento, SLA_PEDIDO.fechamentoMinutos),
  };
}

export function montarLinhasPedido(pedidos: PedidoSyspro[]): LinhaPedido[] {
  return pedidos.map(montarLinhaPedido);
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

/** 13,4 → "13 min"; 63 → "1h03"; null → "—". */
export function formatarDuracaoMinutos(minutos: number | null | undefined): string {
  if (minutos === null || minutos === undefined || !Number.isFinite(minutos)) return "—";
  if (minutos < 60) return `${Math.round(minutos * 10) / 10} min`;
  const horas = Math.floor(minutos / 60);
  const resto = Math.round(minutos % 60);
  return `${horas}h${String(resto).padStart(2, "0")}`;
}

export const ROTULO_SITUACAO_PEDIDO: Record<SituacaoPedido, string> = {
  entregue: "Entregue",
  pendente: "Pendente",
  "em-rota": "Em entrega",
  cancelado: "Cancelado",
  outro: "Outro",
};

export interface ResumoPedidos {
  total: number;
  entregues: number;
  pendentes: number;
  emRota: number;
  cancelados: number;
  /** Tempo médio da venda até a conferência (minutos), só pedidos com horário. */
  mediaConferencia: number | null;
  /** Tempo médio da venda até a saída para entrega (minutos). */
  mediaSaida: number | null;
  /** Tempo médio da venda até o fechamento (minutos). */
  mediaFechamento: number | null;
  /** Pedidos que passaram do limite na conferência. */
  foraDaConferencia: number;
  foraDaSaida: number;
  foraDoFechamento: number;
}

function media(valores: Array<number | null>): number | null {
  const validos = valores.filter((valor): valor is number => valor !== null);
  if (validos.length === 0) return null;
  return validos.reduce((total, valor) => total + valor, 0) / validos.length;
}

export function resumirPedidos(linhas: LinhaPedido[]): ResumoPedidos {
  return {
    total: linhas.length,
    entregues: linhas.filter((linha) => situacaoPedido(linha) === "entregue").length,
    pendentes: linhas.filter((linha) => situacaoPedido(linha) === "pendente").length,
    emRota: linhas.filter((linha) => situacaoPedido(linha) === "em-rota").length,
    cancelados: linhas.filter((linha) => situacaoPedido(linha) === "cancelado").length,
    mediaConferencia: media(linhas.map((linha) => linha.alertaConferencia.minutos)),
    mediaSaida: media(linhas.map((linha) => linha.alertaSaida.minutos)),
    mediaFechamento: media(linhas.map((linha) => linha.alertaFechamento.minutos)),
    foraDaConferencia: linhas.filter((linha) => linha.alertaConferencia.estourou).length,
    foraDaSaida: linhas.filter((linha) => linha.alertaSaida.estourou).length,
    foraDoFechamento: linhas.filter((linha) => linha.alertaFechamento.estourou).length,
  };
}
