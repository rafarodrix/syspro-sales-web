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
  if (tipo === "DAV-OR" || origem === "ORCAMENTO") return "orcamento";
  if (tipo === "PV") return "pedido";
  return "outro";
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
