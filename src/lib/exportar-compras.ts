/**
 * Colunas e linhas do relatório de compras no formato usado pela exportação
 * (CSV compatível com Excel pt-BR: separador ";" e decimal ",").
 *
 * Código e unidade ficam em colunas próprias e os números saem no padrão
 * brasileiro para o Excel reconhecer como valor sem tratamento manual.
 */
import { rotuloSituacao, situacaoEstoque, sugestaoCompra, custoSugestaoCompra } from "@/lib/compras-compra";
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
  "Estoque atual",
  "Cobertura (dias)",
  "Situação",
  "Sugestão de compra",
  "Custo sugestão",
  "Custo aquisição",
  "Custo reposição",
  "Estoque a custo aquisição",
  "Estoque a custo reposição",
  "Valor vendido",
  "Valor devolvido",
  "Venda líquida real",
  "Margem %",
  "Média diária",
  "Último movimento",
] as const;

/** Número no padrão pt-BR (vírgula decimal, sem separador de milhar). */
export function numeroPtBr(valor: number | null | undefined, casas = 2): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "";
  return valor.toFixed(casas).replace(".", ",");
}

/** Mesmo padrão, removendo zeros à direita (médias, coberturas). */
export function numeroPtBrEnxuto(valor: number | null | undefined, casas = 3): string {
  const formatado = numeroPtBr(valor, casas);
  if (!formatado) return "";
  return formatado.includes(",") ? formatado.replace(/,?0+$/, "") : formatado;
}

/** Inteiro sem decimais quando exato, senão mantém até 3 casas. */
function quantidadePtBr(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "";
  return Number.isInteger(valor) ? String(valor) : numeroPtBr(valor, 3);
}

export function montarLinhasExportacaoCompras(
  itens: ItemRelatorioCompras[],
  alvoDias: number,
): (string | number)[][] {
  return itens.map((item) => [
    item.codigo ?? "",
    item.produto ?? "",
    item.unidade ?? "",
    item.marca ?? "",
    item.curva,
    quantidadePtBr(item.quantidadeVendida),
    quantidadePtBr(item.quantidadeDevolvida),
    quantidadePtBr(item.demandaLiquida),
    quantidadePtBr(item.estoqueAtual),
    numeroPtBrEnxuto(item.coberturaDias, 1),
    rotuloSituacao(situacaoEstoque(item, alvoDias)),
    quantidadePtBr(sugestaoCompra(item, alvoDias)),
    numeroPtBr(custoSugestaoCompra(item, alvoDias)),
    numeroPtBr(item.custoAquisicaoMedio),
    numeroPtBr(item.custoReposicaoMedio),
    numeroPtBr(item.custoEstoqueAquisicao),
    numeroPtBr(item.custoEstoqueReposicao),
    numeroPtBr(item.valorVendido),
    numeroPtBr(item.valorDevolvido),
    numeroPtBr(item.valorVendaLiquida),
    numeroPtBr(item.margemBrutaPercentual),
    numeroPtBrEnxuto(item.mediaDiaria, 3),
    item.dataUltimoMovimento ?? "",
  ]);
}
