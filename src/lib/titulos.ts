/**
 * Títulos financeiros (contas a pagar e a receber) da API de exportação do Syspro.
 *
 * Campos reais confirmados na rota `titulo/pagar` (12):
 * empresa_codigo, empresa_razao, fornecedor_nome, titulo_numero, titulo_dt_emissao,
 * titulo_dt_vencimento, titulo_dt_baixa, titulo_valor, titulo_acrescimo,
 * titulo_desconto, titulo_vlr_pago, titulo_forma_pagto.
 *
 * A rota `receber` ainda não está autorizada no SysproServer; o normalizador é
 * tolerante ao nome do participante para funcionar quando liberarem.
 */

export type CategoriaTitulo = "pagar" | "receber";

export type SituacaoTitulo = "pago" | "aberto" | "vencido";

export interface TituloNormalizado {
  empresaCodigo: string;
  empresaNome: string;
  participante: string;
  numero: string;
  emissao: string | null;
  vencimento: string | null;
  baixa: string | null;
  valor: number;
  acrescimo: number;
  desconto: number;
  valorPago: number;
  saldo: number;
  formaPagto: string | null;
  situacao: SituacaoTitulo;
  /** Dias corridos desde o vencimento (positivo = atrasado). */
  diasAtraso: number;
}

function texto(valor: unknown): string {
  return String(valor ?? "").trim();
}

function numero(valor: unknown): number {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  const bruto = texto(valor);
  if (!bruto) return 0;
  const normalizado = bruto.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const convertido = Number(normalizado);
  if (Number.isFinite(convertido)) return convertido;
  const alternativo = Number(bruto);
  return Number.isFinite(alternativo) ? alternativo : 0;
}

function dataIso(valor: unknown): string | null {
  const bruto = texto(valor);
  if (!bruto) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(bruto);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(bruto);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}

function participante(registro: Record<string, unknown>): string {
  const candidatos = [
    "fornecedor_nome",
    "cliente_nome",
    "sacado_nome",
    "participante_nome",
    "nome_participante",
  ];
  for (const chave of candidatos) {
    const valor = texto(registro[chave]);
    if (valor) return valor;
  }
  // Fallback: qualquer chave terminada em _nome que não seja a razão social.
  for (const [chave, valor] of Object.entries(registro)) {
    if (chave.endsWith("_nome") && chave !== "empresa_nome" && texto(valor)) return texto(valor);
  }
  return "—";
}

function diferencaEmDias(vencimento: string | null, referencia: Date): number {
  if (!vencimento) return 0;
  const alvo = Date.parse(`${vencimento}T00:00:00Z`);
  if (Number.isNaN(alvo)) return 0;
  const base = Date.UTC(referencia.getUTCFullYear(), referencia.getUTCMonth(), referencia.getUTCDate());
  return Math.round((base - alvo) / 86_400_000);
}

export function normalizarTitulo(bruto: unknown, referencia = new Date()): TituloNormalizado {
  if (!bruto || typeof bruto !== "object") throw new Error("Resposta de títulos inválida.");
  const registro = bruto as Record<string, unknown>;

  const valor = numero(registro.titulo_valor ?? registro.valor);
  const acrescimo = numero(registro.titulo_acrescimo ?? registro.juros_multa);
  const desconto = numero(registro.titulo_desconto ?? registro.desconto);
  const valorPago = numero(registro.titulo_vlr_pago ?? registro.valor_total);
  const baixa = dataIso(registro.titulo_dt_baixa ?? registro.data_pagamento);
  const vencimento = dataIso(registro.titulo_dt_vencimento ?? registro.data_vencimento);
  const diasAtraso = diferencaEmDias(vencimento, referencia);

  const situacao: SituacaoTitulo = baixa ? "pago" : diasAtraso > 0 ? "vencido" : "aberto";
  const totalDevido = valor + acrescimo - desconto;
  const saldo = baixa ? 0 : Math.max(0, totalDevido - valorPago);

  return {
    empresaCodigo: texto(registro.empresa_codigo),
    empresaNome: texto(registro.empresa_razao ?? registro.empresa_nome),
    participante: participante(registro),
    numero: texto(registro.titulo_numero ?? registro.numero_documento),
    emissao: dataIso(registro.titulo_dt_emissao ?? registro.data_emissao),
    vencimento,
    baixa,
    valor,
    acrescimo,
    desconto,
    valorPago,
    saldo,
    formaPagto: texto(registro.titulo_forma_pagto ?? registro.forma_pagto_liquidacao) || null,
    situacao,
    diasAtraso: situacao === "pago" ? 0 : Math.max(0, diasAtraso),
  };
}

export interface ResumoTitulos {
  quantidade: number;
  valorTotal: number;
  valorPago: number;
  emAberto: number;
  vencido: number;
  aVencer: number;
  quantidadeVencidos: number;
  participantes: number;
  /** Dias médios de atraso dos títulos vencidos. */
  atrasoMedioDias: number;
  proximoVencimento: string | null;
}

export function resumirTitulos(titulos: TituloNormalizado[]): ResumoTitulos {
  let valorTotal = 0;
  let valorPago = 0;
  let emAberto = 0;
  let vencido = 0;
  let aVencer = 0;
  let quantidadeVencidos = 0;
  let somaAtraso = 0;
  const participantes = new Set<string>();
  let proximoVencimento: string | null = null;

  for (const titulo of titulos) {
    valorTotal += titulo.valor;
    valorPago += titulo.valorPago;
    participantes.add(titulo.participante);
    if (titulo.situacao === "pago") continue;
    emAberto += titulo.saldo;
    if (titulo.situacao === "vencido") {
      vencido += titulo.saldo;
      quantidadeVencidos += 1;
      somaAtraso += titulo.diasAtraso * titulo.saldo;
    } else {
      aVencer += titulo.saldo;
      if (titulo.vencimento && (!proximoVencimento || titulo.vencimento < proximoVencimento)) {
        proximoVencimento = titulo.vencimento;
      }
    }
  }

  return {
    quantidade: titulos.length,
    valorTotal,
    valorPago,
    emAberto,
    vencido,
    aVencer,
    quantidadeVencidos,
    participantes: participantes.size,
    atrasoMedioDias: vencido > 0 ? somaAtraso / vencido : 0,
    proximoVencimento,
  };
}

export interface FaixaAging {
  rotulo: string;
  valor: number;
  quantidade: number;
}

/** Distribui o saldo em aberto por faixa de atraso (o corte que o financeiro usa). */
export function faixasAging(titulos: TituloNormalizado[]): FaixaAging[] {
  const faixas: FaixaAging[] = [
    { rotulo: "A vencer", valor: 0, quantidade: 0 },
    { rotulo: "0 a 30 dias", valor: 0, quantidade: 0 },
    { rotulo: "31 a 60 dias", valor: 0, quantidade: 0 },
    { rotulo: "61 a 90 dias", valor: 0, quantidade: 0 },
    { rotulo: "acima de 90", valor: 0, quantidade: 0 },
  ];
  for (const titulo of titulos) {
    if (titulo.situacao === "pago") continue;
    const indice =
      titulo.situacao === "aberto"
        ? 0
        : titulo.diasAtraso <= 30
          ? 1
          : titulo.diasAtraso <= 60
            ? 2
            : titulo.diasAtraso <= 90
              ? 3
              : 4;
    faixas[indice].valor += titulo.saldo;
    faixas[indice].quantidade += 1;
  }
  return faixas;
}
