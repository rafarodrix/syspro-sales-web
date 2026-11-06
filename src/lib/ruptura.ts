/**
 * Reconstrução do saldo diário a partir do Kardex para medir quanto tempo o
 * produto realmente ficou disponível no período consultado.
 *
 * Motivo: a média diária calculada sobre o período inteiro subestima a demanda
 * de quem ficou em ruptura. Se um produto vendeu 20 peças em 60 dias de estoque
 * (30 dias zerado), o ritmo real é 20 ÷ 60 — e a projeção para 90 dias é 30,
 * não as 20 que a média do período (20 ÷ 90) sugeriria.
 */
import { movimentoCompoeSaldo, type MovimentoKardex } from "@/lib/kardex";
import { normalizarDataIso } from "@/lib/periodo";

export interface DiasEstoqueProduto {
  /** Dias do período em que havia saldo positivo disponível. */
  diasComEstoque: number;
  /** Dias do período sem saldo positivo (ruptura declarada pelo Kardex). */
  diasEmRuptura: number;
  /** Dias efetivamente avaliados (período, descontado o que é anterior ao 1º movimento). */
  diasConsiderados: number;
  saldoAbertura: number | null;
  saldoFechamento: number | null;
}

export const SEM_DIAS_ESTOQUE: DiasEstoqueProduto = {
  diasComEstoque: 0,
  diasEmRuptura: 0,
  diasConsiderados: 0,
  saldoAbertura: null,
  saldoFechamento: null,
};

function paraData(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function paraIso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/**
 * Saldo imediatamente antes do movimento. A API entrega `kardex_qtde_anterior`;
 * quando a base não devolve o campo, ele é deduzido do saldo após o movimento.
 */
function saldoAnterior(movimento: MovimentoKardex): number {
  const anterior = Number(movimento.quantidadeAnterior);
  if (Number.isFinite(anterior) && anterior !== 0) return anterior;
  return movimento.saldo - movimento.quantidadeMovimentada;
}

export function reconstruirDiasEstoque(
  movimentos: MovimentoKardex[],
  periodo: { inicial: string; final: string },
  empresa?: { grupoEstoquePadrao?: string | null },
): DiasEstoqueProduto {
  const inicial = normalizarDataIso(periodo.inicial);
  const final = normalizarDataIso(periodo.final);
  if (!inicial || !final || inicial > final) return SEM_DIAS_ESTOQUE;

  const ordenados = movimentos
    .map((movimento) => ({ movimento, data: normalizarDataIso(movimento.dataMovimento) }))
    .filter(({ movimento, data }) =>
      Boolean(data) && data >= inicial && data <= final && movimentoCompoeSaldo(movimento, empresa))
    .sort((a, b) => (a.data === b.data ? 0 : a.data < b.data ? -1 : 1));

  if (ordenados.length === 0) return SEM_DIAS_ESTOQUE;

  // Saldo do dia anterior ao primeiro movimento da janela.
  let saldo: number | null = saldoAnterior(ordenados[0].movimento);
  const saldoAbertura = saldo;
  // Sem saldo no início, os dias anteriores ao primeiro movimento não são
  // avaliados: não há como distinguir "existia com estoque zero" de "produto
  // ainda não movimentado" (cadastro novo, primeira compra no meio do período).
  const inicioContagem = saldoAbertura > 0 ? inicial : ordenados[0].data;

  const porDia = new Map<string, MovimentoKardex[]>();
  for (const { movimento, data } of ordenados) {
    const lista = porDia.get(data);
    if (lista) lista.push(movimento);
    else porDia.set(data, [movimento]);
  }

  let diasComEstoque = 0;
  let diasEmRuptura = 0;
  let diasConsiderados = 0;
  let cursor = paraData(inicioContagem);
  const limite = paraData(final);

  while (cursor <= limite) {
    const iso = paraIso(cursor);
    const movimentosDoDia = porDia.get(iso);
    // O dia conta como disponível se o saldo foi positivo em qualquer momento:
    // o dia em que a última peça foi vendida ainda tinha estoque para vender.
    let pico = saldo ?? 0;
    if (movimentosDoDia) {
      for (const movimento of movimentosDoDia) {
        saldo = movimento.saldo;
        if (movimento.saldo > pico) pico = movimento.saldo;
      }
    }
    diasConsiderados += 1;
    if (pico > 0) diasComEstoque += 1;
    else diasEmRuptura += 1;
    cursor = new Date(cursor.getTime() + 86_400_000);
  }

  return {
    diasComEstoque,
    diasEmRuptura,
    diasConsiderados,
    saldoAbertura,
    saldoFechamento: saldo,
  };
}

/**
 * Base de dias usada para transformar demanda em média diária.
 *
 * Usa os dias com estoque disponível — e cai no período inteiro quando o
 * Kardex não registrou saldo positivo em nenhum dia (base sem controle de
 * estoque). Nesse caso a média é a mesma de antes, então `semBaseEstoque`
 * precisa ser checado por quem decide a compra.
 */
export const MIN_DIAS_BASE_DEMANDA = 15;

export function diasBaseDemanda(dias: DiasEstoqueProduto, diasPeriodo: number): number {
  if (dias.diasComEstoque > 0) {
    // Amostra curta não define ritmo: produto que apareceu por 1 dia com 36
    // vendas geraria 36/dia e uma sugestão de 3.240 peças. Abaixo do mínimo,
    // vale o período avaliado inteiro (sem ajuste de ruptura).
    if (dias.diasComEstoque < MIN_DIAS_BASE_DEMANDA) {
      return Math.max(dias.diasComEstoque, dias.diasConsiderados);
    }
    return dias.diasComEstoque;
  }
  return diasPeriodo > 0 ? diasPeriodo : 0;
}

/** A base nunca registrou saldo positivo: não há como projetar ruptura. */
export function semBaseDeEstoque(dias: DiasEstoqueProduto): boolean {
  return dias.diasComEstoque === 0;
}
