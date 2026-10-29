/**
 * Métricas orientadas à decisão de compra, derivadas apenas de campos reais do
 * relatório (demanda líquida, estoque atual do Kardex, média diária e custos).
 *
 * A cobertura alvo é um parâmetro do usuário (dias de atendimento desejados);
 * ela não vem do Syspro e por isso fica explícita na tela.
 */
import type { ItemRelatorioCompras } from "@/lib/relatorio-compras";

export type SituacaoCompra =
  | "ruptura"
  | "critica"
  | "abaixo"
  | "saudavel"
  | "excesso"
  | "sem-demanda"
  | "sem-saldo";

export const SITUACOES_COMPRA: Array<{
  valor: SituacaoCompra;
  rotulo: string;
  descricao: string;
}> = [
  { valor: "ruptura", rotulo: "Ruptura", descricao: "Estoque zerado ou negativo com demanda no período" },
  { valor: "critica", rotulo: "Crítica", descricao: "Cobertura abaixo de 50% do alvo" },
  { valor: "abaixo", rotulo: "Abaixo do alvo", descricao: "Cobertura entre 50% e 100% do alvo" },
  { valor: "saudavel", rotulo: "Saudável", descricao: "Cobertura entre 100% e 200% do alvo" },
  { valor: "excesso", rotulo: "Excesso", descricao: "Cobertura acima de 200% do alvo" },
  { valor: "sem-demanda", rotulo: "Sem demanda", descricao: "Nenhuma venda líquida no período" },
  { valor: "sem-saldo", rotulo: "Sem saldo localizado", descricao: "Nenhum movimento do grupo de estoque da empresa até hoje" },
];

export function rotuloSituacao(situacao: SituacaoCompra): string {
  return SITUACOES_COMPRA.find((item) => item.valor === situacao)?.rotulo ?? situacao;
}

/** Quantidade sugerida para atingir a cobertura alvo, descontando o estoque atual. */
export function sugestaoCompra(item: ItemRelatorioCompras, alvoDias: number): number {
  if (alvoDias <= 0 || item.demandaLiquida <= 0) return 0;
  const necessario = item.mediaDiaria * alvoDias;
  const estoque = item.estoqueAtual ?? 0;
  return Math.max(0, Math.ceil(necessario - estoque));
}

/** Custo de reposição estimado para a quantidade sugerida. */
export function custoSugestaoCompra(item: ItemRelatorioCompras, alvoDias: number): number | null {
  if (item.custoReposicaoMedio == null) return null;
  return sugestaoCompra(item, alvoDias) * item.custoReposicaoMedio;
}

export function situacaoEstoque(
  item: ItemRelatorioCompras,
  alvoDias: number,
): SituacaoCompra {
  if (item.estoqueAtual === null) return "sem-saldo";
  if (item.demandaLiquida <= 0) return "sem-demanda";
  if (item.estoqueAtual <= 0) return "ruptura";
  const cobertura = item.estoqueAtual / item.mediaDiaria;
  if (cobertura < alvoDias / 2) return "critica";
  if (cobertura < alvoDias) return "abaixo";
  if (cobertura > alvoDias * 2) return "excesso";
  return "saudavel";
}

export type CriterioOrdenacaoCompras =
  | "demanda"
  | "sugestao"
  | "estoque-valor"
  | "cobertura"
  | "margem";

export const CRITERIOS_ORDENACAO_COMPRAS: Array<{
  valor: CriterioOrdenacaoCompras;
  rotulo: string;
}> = [
  { valor: "demanda", rotulo: "Maior demanda" },
  { valor: "sugestao", rotulo: "Maior sugestão de compra" },
  { valor: "estoque-valor", rotulo: "Maior capital em estoque" },
  { valor: "cobertura", rotulo: "Menor cobertura" },
  { valor: "margem", rotulo: "Maior margem" },
];

export function ordenarItensCompras(
  itens: ItemRelatorioCompras[],
  criterio: CriterioOrdenacaoCompras,
  alvoDias: number,
): ItemRelatorioCompras[] {
  const ordenados = [...itens];
  ordenados.sort((a, b) => {
    switch (criterio) {
      case "sugestao":
        return sugestaoCompra(b, alvoDias) - sugestaoCompra(a, alvoDias)
          || a.codigo.localeCompare(b.codigo);
      case "estoque-valor":
        return (b.custoEstoqueReposicao ?? 0) - (a.custoEstoqueReposicao ?? 0)
          || a.codigo.localeCompare(b.codigo);
      case "cobertura": {
        const aCobertura = a.coberturaDias ?? Number.POSITIVE_INFINITY;
        const bCobertura = b.coberturaDias ?? Number.POSITIVE_INFINITY;
        return aCobertura - bCobertura || a.codigo.localeCompare(b.codigo);
      }
      case "margem":
        return (b.margemBrutaPercentual ?? Number.NEGATIVE_INFINITY)
          - (a.margemBrutaPercentual ?? Number.NEGATIVE_INFINITY)
          || a.codigo.localeCompare(b.codigo);
      default:
        return b.demandaLiquida - a.demandaLiquida || a.codigo.localeCompare(b.codigo);
    }
  });
  return ordenados;
}

export interface ResumoComprasDecisao {
  unidadesSugeridas: number;
  custoSugestao: number;
  rupturas: number;
  criticos: number;
  abaixo: number;
  saudaveis: number;
  excessoCapital: number;
  excessoProdutos: number;
  semDemandaCapital: number;
  semDemandaProdutos: number;
}

export function resumirDecisaoCompra(
  itens: ItemRelatorioCompras[],
  alvoDias: number,
): ResumoComprasDecisao {
  const resumo: ResumoComprasDecisao = {
    unidadesSugeridas: 0,
    custoSugestao: 0,
    rupturas: 0,
    criticos: 0,
    abaixo: 0,
    saudaveis: 0,
    excessoCapital: 0,
    excessoProdutos: 0,
    semDemandaCapital: 0,
    semDemandaProdutos: 0,
  };

  for (const item of itens) {
    resumo.unidadesSugeridas += sugestaoCompra(item, alvoDias);
    resumo.custoSugestao += custoSugestaoCompra(item, alvoDias) ?? 0;

    const situacao = situacaoEstoque(item, alvoDias);
    if (situacao === "ruptura") resumo.rupturas += 1;
    if (situacao === "critica") resumo.criticos += 1;
    if (situacao === "abaixo") resumo.abaixo += 1;
    if (situacao === "saudavel") resumo.saudaveis += 1;
    if (situacao === "excesso") {
      resumo.excessoProdutos += 1;
      resumo.excessoCapital += item.custoEstoqueReposicao ?? 0;
    }
    if (situacao === "sem-demanda") {
      resumo.semDemandaProdutos += 1;
      resumo.semDemandaCapital += item.custoEstoqueReposicao ?? 0;
    }
  }

  return resumo;
}
