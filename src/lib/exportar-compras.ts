/**
 * Colunas e linhas do relatório de compras no formato usado pela exportação
 * (CSV compatível com Excel). Código e unidade ficam em colunas próprias para
 * permitir ordenar/filtrar na planilha.
 */
import type { ItemRelatorioCompras } from "@/lib/relatorio-compras";

export const COLUNAS_EXPORTACAO_COMPRAS = [
  "Código",
  "Descrição",
  "Unidade",
  "Marca",
  "Curva ABC",
  "Vendas no período",
  "Devoluções EDV",
  "Demanda para compras",
  "Valor vendido",
  "Valor devolvido",
  "Venda líquida real",
  "Custo aquisição",
  "Custo reposição",
  "Custo total mercadorias",
  "Margem %",
  "Estoque atual",
  "Cobertura (dias)",
  "Média diária",
  "Último movimento",
] as const;

const arredondar = (valor: number | null | undefined, casas = 2) =>
  valor === null || valor === undefined ? "" : Number(valor.toFixed(casas));

export function montarLinhasExportacaoCompras(
  itens: ItemRelatorioCompras[],
): (string | number)[][] {
  return itens.map((item) => [
    item.codigo ?? "",
    item.produto ?? "",
    item.unidade ?? "",
    item.marca ?? "",
    item.curva,
    arredondar(item.quantidadeVendida, 3),
    arredondar(item.quantidadeDevolvida, 3),
    arredondar(item.demandaLiquida, 3),
    arredondar(item.valorVendido),
    arredondar(item.valorDevolvido),
    arredondar(item.valorVendaLiquida),
    arredondar(item.custoAquisicaoMedio),
    arredondar(item.custoReposicaoMedio),
    arredondar(item.custoTotalMercadorias),
    arredondar(item.margemBrutaPercentual),
    arredondar(item.estoqueAtual, 3),
    arredondar(item.coberturaDias, 1),
    arredondar(item.mediaDiaria, 3),
    item.dataUltimoMovimento ?? "",
  ]);
}
