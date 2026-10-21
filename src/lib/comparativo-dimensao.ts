/**
 * Comparativo de uma dimensão de vendas (departamento, UF, cidade, forma de pagamento)
 * entre o período atual e o período anterior equivalente.
 *
 * Responde a duas perguntas que a tabela simples não responde:
 * 1) quem cresceu/caiu em valor;
 * 2) quem ganhou ou perdeu participação dentro do total (mix).
 */

export interface ItemDimensaoFaturamento {
  nome: string;
  faturamento: number;
}

export interface LinhaComparativoDimensao {
  nome: string;
  atual: number;
  anterior: number;
  variacaoValor: number;
  /** null quando não havia faturamento no período anterior (item novo). */
  variacaoPercentual: number | null;
  participacaoAtual: number;
  participacaoAnterior: number;
  /** Variação da participação em pontos percentuais. */
  variacaoParticipacao: number;
  novo: boolean;
}

export type OrdenacaoComparativo =
  | "impacto"
  | "crescimento"
  | "queda"
  | "participacao"
  | "faturamento";

export const ORDENACOES_COMPARATIVO: { valor: OrdenacaoComparativo; rotulo: string }[] = [
  { valor: "impacto", rotulo: "Maior impacto no total" },
  { valor: "crescimento", rotulo: "Maior crescimento (%)" },
  { valor: "queda", rotulo: "Maior queda (%)" },
  { valor: "participacao", rotulo: "Maior ganho de participação" },
  { valor: "faturamento", rotulo: "Maior faturamento" },
];

function normalizarChave(nome: string): string {
  return nome.trim().toLowerCase();
}

export function compararDimensao(
  atual: ItemDimensaoFaturamento[],
  anterior: ItemDimensaoFaturamento[],
): LinhaComparativoDimensao[] {
  const totalAtual = atual.reduce((soma, item) => soma + item.faturamento, 0);
  const totalAnterior = anterior.reduce((soma, item) => soma + item.faturamento, 0);

  const mapa = new Map<string, { nome: string; atual: number; anterior: number }>();

  for (const item of atual) {
    const chave = normalizarChave(item.nome);
    if (!chave) continue;
    const registro = mapa.get(chave) ?? { nome: item.nome, atual: 0, anterior: 0 };
    registro.atual += item.faturamento;
    mapa.set(chave, registro);
  }

  for (const item of anterior) {
    const chave = normalizarChave(item.nome);
    if (!chave) continue;
    const registro = mapa.get(chave) ?? { nome: item.nome, atual: 0, anterior: 0 };
    registro.anterior += item.faturamento;
    mapa.set(chave, registro);
  }

  return [...mapa.values()].map((registro) => {
    const variacaoValor = registro.atual - registro.anterior;
    const participacaoAtual = totalAtual > 0 ? (registro.atual / totalAtual) * 100 : 0;
    const participacaoAnterior = totalAnterior > 0 ? (registro.anterior / totalAnterior) * 100 : 0;
    return {
      nome: registro.nome,
      atual: registro.atual,
      anterior: registro.anterior,
      variacaoValor,
      variacaoPercentual:
        registro.anterior > 0 ? (variacaoValor / registro.anterior) * 100 : null,
      participacaoAtual,
      participacaoAnterior,
      variacaoParticipacao: participacaoAtual - participacaoAnterior,
      novo: registro.anterior <= 0 && registro.atual > 0,
    };
  });
}

export function ordenarComparativo(
  linhas: LinhaComparativoDimensao[],
  ordenacao: OrdenacaoComparativo,
): LinhaComparativoDimensao[] {
  const copia = [...linhas];
  // Itens sem base no período anterior ficam sempre no fim das ordens por percentual.
  const percentual = (linha: LinhaComparativoDimensao): number | null => linha.variacaoPercentual;
  const porPercentual = (
    a: LinhaComparativoDimensao,
    b: LinhaComparativoDimensao,
    direcao: 1 | -1,
  ) => {
    const pa = percentual(a);
    const pb = percentual(b);
    if (pa === null && pb === null) return b.variacaoValor - a.variacaoValor;
    if (pa === null) return 1;
    if (pb === null) return -1;
    return direcao * (pa - pb) || direcao * (a.variacaoValor - b.variacaoValor);
  };

  switch (ordenacao) {
    case "crescimento":
      return copia.sort((a, b) => porPercentual(a, b, -1));
    case "queda":
      return copia
        .filter((linha) => linha.variacaoValor < 0)
        .sort((a, b) => porPercentual(a, b, 1));
    case "participacao":
      return copia.sort((a, b) => b.variacaoParticipacao - a.variacaoParticipacao);
    case "faturamento":
      return copia.sort((a, b) => b.atual - a.atual);
    case "impacto":
    default:
      return copia.sort((a, b) => Math.abs(b.variacaoValor) - Math.abs(a.variacaoValor));
  }
}

export interface ResumoComparativoDimensao {
  totalAtual: number;
  totalAnterior: number;
  variacaoTotal: number;
  cresceram: number;
  cairam: number;
  novos: number;
  /** Dimensão que mais contribuiu positivamente no total. */
  maiorAlta?: LinhaComparativoDimensao;
  /** Dimensão que mais contribuiu negativamente no total. */
  maiorQueda?: LinhaComparativoDimensao;
}

export function resumirComparativo(linhas: LinhaComparativoDimensao[]): ResumoComparativoDimensao {
  const comVariacao = linhas.filter((linha) => linha.variacaoValor !== 0);
  const totalAtual = linhas.reduce((soma, linha) => soma + linha.atual, 0);
  const totalAnterior = linhas.reduce((soma, linha) => soma + linha.anterior, 0);
  const altas = comVariacao.filter((linha) => linha.variacaoValor > 0);
  const quedas = comVariacao.filter((linha) => linha.variacaoValor < 0);

  return {
    totalAtual,
    totalAnterior,
    variacaoTotal: totalAtual - totalAnterior,
    cresceram: altas.length,
    cairam: quedas.length,
    novos: linhas.filter((linha) => linha.novo).length,
    maiorAlta: [...altas].sort((a, b) => b.variacaoValor - a.variacaoValor)[0],
    maiorQueda: [...quedas].sort((a, b) => a.variacaoValor - b.variacaoValor)[0],
  };
}
