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
  { valor: "ruptura", rotulo: "Ruptura", descricao: "Sem saldo em estoque e com demanda no período" },
  { valor: "critica", rotulo: "Crítica", descricao: "Cobertura menor que metade da cobertura alvo" },
  { valor: "abaixo", rotulo: "Abaixo do alvo", descricao: "Cobertura abaixo da cobertura alvo" },
  { valor: "saudavel", rotulo: "Saudável", descricao: "Cobertura entre a alvo e o dobro dela" },
  { valor: "excesso", rotulo: "Excesso", descricao: "Cobertura acima do dobro da alvo (capital parado)" },
  { valor: "sem-demanda", rotulo: "Sem demanda", descricao: "Nenhuma demanda líquida no período" },
  { valor: "sem-saldo", rotulo: "Sem saldo localizado", descricao: "Kardex não trouxe saldo para o produto" },
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

/** Limites de cobertura configurados por empresa (Configurações). */
export interface LimitesCoberturaCompra {
  criticoDias: number;
  atencaoDias: number;
  excessoDias: number;
}

export function situacaoEstoque(
  item: ItemRelatorioCompras,
  alvoDias: number,
  limites?: LimitesCoberturaCompra,
): SituacaoCompra {
  if (item.estoqueAtual === null) return "sem-saldo";
  if (item.demandaLiquida <= 0) return "sem-demanda";
  if (item.estoqueAtual <= 0) return "ruptura";
  const cobertura = item.estoqueAtual / item.mediaDiaria;
  const criticoDias = limites?.criticoDias ?? alvoDias / 2;
  const atencaoDias = limites?.atencaoDias ?? alvoDias;
  const excessoDias = limites?.excessoDias ?? alvoDias * 2;
  if (cobertura < criticoDias) return "critica";
  if (cobertura < atencaoDias) return "abaixo";
  if (cobertura > excessoDias) return "excesso";
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
  excessoCapital: number;
  excessoProdutos: number;
  semDemandaCapital: number;
  semDemandaProdutos: number;
}

export function resumirDecisaoCompra(
  itens: ItemRelatorioCompras[],
  alvoDias: number,
  limites?: LimitesCoberturaCompra,
): ResumoComprasDecisao {
  const resumo: ResumoComprasDecisao = {
    unidadesSugeridas: 0,
    custoSugestao: 0,
    rupturas: 0,
    criticos: 0,
    abaixo: 0,
    excessoCapital: 0,
    excessoProdutos: 0,
    semDemandaCapital: 0,
    semDemandaProdutos: 0,
  };

  for (const item of itens) {
    resumo.unidadesSugeridas += sugestaoCompra(item, alvoDias);
    resumo.custoSugestao += custoSugestaoCompra(item, alvoDias) ?? 0;

    const situacao = situacaoEstoque(item, alvoDias, limites);
    if (situacao === "ruptura") resumo.rupturas += 1;
    if (situacao === "critica") resumo.criticos += 1;
    if (situacao === "abaixo") resumo.abaixo += 1;
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
