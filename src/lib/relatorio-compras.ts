import { grupoDefineSaldo, type MovimentoKardex } from "@/lib/kardex";
import type { VendaProduto } from "@/lib/syspro-api";
import { normalizarDataIso } from "@/lib/periodo";
export { normalizarDataIso } from "@/lib/periodo";
import {
  calcularCoberturaEstoque,
  calcularDemandaLiquida,
  calcularDiasInclusivos,
  calcularPercentual,
  classificarCurvaABC,
  normalizarCodigoProduto,
  paraNumero,
  valorLiquidoItem,
  type ClasseCurvaABC,
} from "@/lib/metricas-negocio";

export type ClasseCurvaCompras = ClasseCurvaABC;

export interface ItemRelatorioCompras {
  codigo: string;
  produto: string;
  unidade: string;
  curva: ClasseCurvaCompras;
  quantidadeVendida: number;
  quantidadeDevolvida: number;
  quantidadeLiquidaReal: number;
  demandaLiquida: number;
  taxaDevolucao: number;
  valorVendido: number;
  valorDevolvido: number;
  valorVendaLiquida: number;
  taxaDevolucaoValor: number;
  estoqueAtual: number | null;
  mediaDiaria: number;
  coberturaDias: number | null;
  dataUltimoMovimento: string | null;
  produtoId?: string;
  marca?: string;
  custoAquisicaoMedio?: number | null;
  custoReposicaoMedio?: number | null;
  /** Custo de reposição médio × quantidade líquida real (CMV de reposição). */
  custoTotalMercadorias?: number | null;
  /** (venda líquida real − custo total mercadorias) / venda líquida real × 100. */
  margemBrutaPercentual?: number | null;
  /** Custo de aquisição médio × estoque atual (capital imobilizado). */
  custoEstoqueAquisicao?: number | null;
  /** Custo de reposição médio × estoque atual (valor de reposição do estoque). */
  custoEstoqueReposicao?: number | null;
}

export interface ResumoRelatorioCompras {
  totalProdutos: number;
  quantidadeVendida: number;
  quantidadeDevolvida: number;
  quantidadeLiquidaReal: number;
  demandaLiquida: number;
  taxaDevolucao: number;
  valorVendido: number;
  valorDevolvido: number;
  valorVendaLiquida: number;
  taxaDevolucaoValor: number;
  produtosSemSaldo: number;
  produtosSemSaldoLocalizado: number;
  custoTotalMercadorias: number;
  margemBruta: number;
  margemBrutaPercentual: number;
  /** Percentual da demanda de compras que possui custo informado pela API. */
  coberturaCusto: number;
  /** Soma do estoque atual valorizado pelo custo de aquisição. */
  custoEstoqueAquisicao: number;
  /** Soma do estoque atual valorizado pelo custo de reposição. */
  custoEstoqueReposicao: number;
}

export interface RelatorioCompras {
  itens: ItemRelatorioCompras[];
  resumo: ResumoRelatorioCompras;
}

function estaNoPeriodo(data: string, inicial: string, final: string): boolean {
  const dataIso = data.slice(0, 10);
  return dataIso >= inicial && dataIso <= final;
}

export function montarRelatorioCompras(
  vendas: VendaProduto[],
  movimentos: MovimentoKardex[],
  periodo: { inicial: string; final: string },
  empresa?: { grupoEstoquePadrao?: string },
): RelatorioCompras {
  const porProduto = new Map<
    string,
    Omit<ItemRelatorioCompras, "curva"> & {
      ordemUltimoMovimento: number;
      totalCustoAquisicao: number;
      totalCustoReposicao: number;
      quantidadeComCustoAquisicao: number;
      quantidadeComCustoReposicao: number;
    }
  >();
  const chavePorId = new Map<string, string>();

  for (const venda of vendas) {
    const produtoId = String(venda.produto_id ?? "").trim();
    const idNormalizado = normalizarCodigoProduto(produtoId, "");
    if (!idNormalizado) continue;
    const codigoReferencia = String(venda.produto_codigo_auxiliar ?? "").trim();

    const atual = porProduto.get(idNormalizado) ?? {
      codigo: codigoReferencia,
      produto: venda.produto_descricao?.trim() || "Produto sem descrição",
      unidade: venda.produto_un?.trim() || "-",
      quantidadeVendida: 0,
      quantidadeDevolvida: 0,
      quantidadeLiquidaReal: 0,
      demandaLiquida: 0,
      taxaDevolucao: 0,
      valorVendido: 0,
      valorDevolvido: 0,
      valorVendaLiquida: 0,
      taxaDevolucaoValor: 0,
      estoqueAtual: null,
      mediaDiaria: 0,
      coberturaDias: null,
      dataUltimoMovimento: null,
      produtoId,
      marca: undefined,
      custoAquisicaoMedio: null,
      custoReposicaoMedio: null,
      totalCustoAquisicao: 0,
      totalCustoReposicao: 0,
      quantidadeComCustoAquisicao: 0,
      quantidadeComCustoReposicao: 0,
      ordemUltimoMovimento: -1,
    };
    const quantidade = paraNumero(venda.produto_qtde);
    atual.quantidadeVendida += quantidade;
    atual.valorVendido += valorLiquidoItem(venda);
    const custoAquisicao = paraNumero(venda.produto_vlr_custo_aquisicao);
    const custoReposicao = paraNumero(venda.produto_vlr_custo_reposicao);
    if (custoAquisicao > 0) {
      atual.totalCustoAquisicao += custoAquisicao * quantidade;
      atual.quantidadeComCustoAquisicao += quantidade;
    }
    if (custoReposicao > 0) {
      atual.totalCustoReposicao += custoReposicao * quantidade;
      atual.quantidadeComCustoReposicao += quantidade;
    }
    if (!atual.codigo && codigoReferencia) atual.codigo = codigoReferencia;
    chavePorId.set(idNormalizado, idNormalizado);
    porProduto.set(idNormalizado, atual);
  }

  movimentos.forEach((movimento, indice) => {
    const codigoId = normalizarCodigoProduto(movimento.produtoIdProduto, "");
    const ehDevolucaoVendaNoPeriodo =
      movimento.grupoDocumento.trim().toUpperCase() === "EDV" &&
      estaNoPeriodo(movimento.dataMovimento, periodo.inicial, periodo.final);
    let chave = chavePorId.get(codigoId);
    let atual = chave ? porProduto.get(chave) : undefined;

    if (!atual && codigoId && ehDevolucaoVendaNoPeriodo) {
      chave = codigoId;
      atual = {
        codigo: movimento.produtoCodigoAuxiliar?.trim() || "",
        produto: movimento.produtoDescricao?.trim() || "Produto sem descrição",
        unidade: "-",
        quantidadeVendida: 0,
        quantidadeDevolvida: 0,
        quantidadeLiquidaReal: 0,
        demandaLiquida: 0,
        taxaDevolucao: 0,
        valorVendido: 0,
        valorDevolvido: 0,
        valorVendaLiquida: 0,
        taxaDevolucaoValor: 0,
        estoqueAtual: null,
        mediaDiaria: 0,
        coberturaDias: null,
        dataUltimoMovimento: null,
        produtoId: movimento.produtoIdProduto?.trim(),
        marca: movimento.produtoMarca?.trim() || undefined,
        custoAquisicaoMedio: null,
        custoReposicaoMedio: null,
        totalCustoAquisicao: 0,
        totalCustoReposicao: 0,
        quantidadeComCustoAquisicao: 0,
        quantidadeComCustoReposicao: 0,
        ordemUltimoMovimento: -1,
      };
      chavePorId.set(codigoId, chave);
      porProduto.set(chave, atual);
    }
    if (!atual) return;

    if (ehDevolucaoVendaNoPeriodo) {
      atual.quantidadeDevolvida += Math.abs(movimento.quantidadeMovimentada);
      atual.valorDevolvido += Math.abs(movimento.valorTotal);
    }

    // Saldo atual: ultimo movimento do grupo de estoque configurado (campo produto_grupo_estoque).
    const grupoEstoque = String(movimento.grupoEstoque ?? "").trim().toUpperCase() || "GERAL";
    const grupoPadrao = String(empresa?.grupoEstoquePadrao ?? "GERAL").trim().toUpperCase() || "GERAL";
    if (grupoEstoque !== grupoPadrao) return;
    const dataAtual = movimento.dataMovimento.slice(0, 10);
    const dataAnterior = atual.dataUltimoMovimento?.slice(0, 10) ?? "";
    if (dataAtual > dataAnterior || (dataAtual === dataAnterior && indice > atual.ordemUltimoMovimento)) {
      atual.estoqueAtual = movimento.saldo;
      atual.marca = movimento.produtoMarca?.trim() || atual.marca;
      atual.dataUltimoMovimento = movimento.dataMovimento;
      atual.ordemUltimoMovimento = indice;
    }
  });

  const diasPeriodo = calcularDiasInclusivos(periodo.inicial, periodo.final);
  for (const item of porProduto.values()) {
    item.quantidadeLiquidaReal = item.quantidadeVendida - item.quantidadeDevolvida;
    item.demandaLiquida = calcularDemandaLiquida(item.quantidadeVendida, item.quantidadeDevolvida);
    item.taxaDevolucao = calcularPercentual(item.quantidadeDevolvida, item.quantidadeVendida);
    item.valorVendaLiquida = item.valorVendido - item.valorDevolvido;
    item.taxaDevolucaoValor = calcularPercentual(item.valorDevolvido, item.valorVendido);
    item.mediaDiaria = diasPeriodo > 0 ? item.demandaLiquida / diasPeriodo : 0;
    item.coberturaDias = calcularCoberturaEstoque(item.estoqueAtual, item.demandaLiquida, diasPeriodo);
    item.custoAquisicaoMedio = item.quantidadeComCustoAquisicao > 0
      ? item.totalCustoAquisicao / item.quantidadeComCustoAquisicao
      : null;
    item.custoReposicaoMedio = item.quantidadeComCustoReposicao > 0
      ? item.totalCustoReposicao / item.quantidadeComCustoReposicao
      : null;
    // Margem comercial usa exclusivamente o custo de reposição. O custo de
    // aquisição é mantido apenas para análises de compras/fornecedores.
    const custoUnitario = item.custoReposicaoMedio;
    item.custoTotalMercadorias = custoUnitario === null
      ? null
      : custoUnitario * item.quantidadeLiquidaReal;
    item.margemBrutaPercentual = item.custoTotalMercadorias !== null && item.valorVendaLiquida > 0
      ? ((item.valorVendaLiquida - item.custoTotalMercadorias) / item.valorVendaLiquida) * 100
      : null;
    item.custoEstoqueAquisicao = item.estoqueAtual === null || item.custoAquisicaoMedio == null
      ? null
      : item.custoAquisicaoMedio * item.estoqueAtual;
    item.custoEstoqueReposicao = item.estoqueAtual === null || item.custoReposicaoMedio == null
      ? null
      : item.custoReposicaoMedio * item.estoqueAtual;
  }

  const ordenados = [...porProduto.values()].sort(
    (a, b) => b.demandaLiquida - a.demandaLiquida || a.codigo.localeCompare(b.codigo),
  );
  const totalVendido = ordenados.reduce((total, item) => total + item.quantidadeVendida, 0);
  const totalDevolvido = ordenados.reduce((total, item) => total + item.quantidadeDevolvida, 0);
  const totalDemandaLiquida = ordenados.reduce((total, item) => total + item.demandaLiquida, 0);
  const totalValorVendido = ordenados.reduce((total, item) => total + item.valorVendido, 0);
  const totalValorDevolvido = ordenados.reduce((total, item) => total + item.valorDevolvido, 0);
  let acumulado = 0;

  const itens = ordenados.map((item) => {
    const percentualAntes = totalDemandaLiquida > 0
      ? calcularPercentual(acumulado, totalDemandaLiquida)
      : 100;
    acumulado += item.demandaLiquida;
    const curva = classificarCurvaABC(percentualAntes);
    return {
      codigo: item.codigo,
      produto: item.produto,
      unidade: item.unidade,
      quantidadeVendida: item.quantidadeVendida,
      quantidadeDevolvida: item.quantidadeDevolvida,
      quantidadeLiquidaReal: item.quantidadeLiquidaReal,
      demandaLiquida: item.demandaLiquida,
      taxaDevolucao: item.taxaDevolucao,
      valorVendido: item.valorVendido,
      valorDevolvido: item.valorDevolvido,
      valorVendaLiquida: item.valorVendaLiquida,
      taxaDevolucaoValor: item.taxaDevolucaoValor,
      estoqueAtual: item.estoqueAtual,
      mediaDiaria: item.mediaDiaria,
      coberturaDias: item.coberturaDias,
      dataUltimoMovimento: item.dataUltimoMovimento,
      produtoId: item.produtoId,
      marca: item.marca,
      custoAquisicaoMedio: item.custoAquisicaoMedio,
      custoReposicaoMedio: item.custoReposicaoMedio,
      custoTotalMercadorias: item.custoTotalMercadorias,
      margemBrutaPercentual: item.margemBrutaPercentual,
      custoEstoqueAquisicao: item.custoEstoqueAquisicao,
      custoEstoqueReposicao: item.custoEstoqueReposicao,
      curva,
    };
  });

  const totalCustoEstoqueAquisicao = itens.reduce(
    (total, item) => total + (item.custoEstoqueAquisicao ?? 0),
    0,
  );
  const totalCustoEstoqueReposicao = itens.reduce(
    (total, item) => total + (item.custoEstoqueReposicao ?? 0),
    0,
  );

  const totalCustoMercadorias = itens.reduce(
    (total, item) => total + (item.custoTotalMercadorias ?? 0),
    0,
  );
  const totalVendaLiquida = totalValorVendido - totalValorDevolvido;
  const totalQuantidadeLiquida = totalVendido - totalDevolvido;
  const quantidadeLiquidaComCusto = itens.reduce(
    (total, item) => total + (item.custoTotalMercadorias == null ? 0 : item.demandaLiquida),
    0,
  );
  const margemBruta = totalVendaLiquida - totalCustoMercadorias;

  return {
    itens,
    resumo: {
      totalProdutos: itens.length,
      quantidadeVendida: totalVendido,
      quantidadeDevolvida: totalDevolvido,
      quantidadeLiquidaReal: totalQuantidadeLiquida,
      demandaLiquida: totalDemandaLiquida,
      taxaDevolucao: calcularPercentual(totalDevolvido, totalVendido),
      valorVendido: totalValorVendido,
      valorDevolvido: totalValorDevolvido,
      valorVendaLiquida: totalVendaLiquida,
      taxaDevolucaoValor: calcularPercentual(totalValorDevolvido, totalValorVendido),
      produtosSemSaldo: itens.filter((item) => item.estoqueAtual !== null && item.estoqueAtual <= 0).length,
      produtosSemSaldoLocalizado: itens.filter((item) => item.estoqueAtual === null).length,
      custoTotalMercadorias: totalCustoMercadorias,
      margemBruta,
      margemBrutaPercentual: totalVendaLiquida > 0 ? (margemBruta / totalVendaLiquida) * 100 : 0,
      coberturaCusto: calcularPercentual(quantidadeLiquidaComCusto, totalDemandaLiquida),
      custoEstoqueAquisicao: totalCustoEstoqueAquisicao,
      custoEstoqueReposicao: totalCustoEstoqueReposicao,
    },
  };
}

export function dividirPeriodoKardex(inicialBruto: string, finalBruto: string) {
  const inicial = normalizarDataIso(inicialBruto);
  const final = normalizarDataIso(finalBruto);
  const paraData = (valor: string) => {
    const [ano, mes, dia] = valor.split("-").map(Number);
    return new Date(Date.UTC(ano, mes - 1, dia));
  };
  const paraIso = (data: Date) => data.toISOString().slice(0, 10);
  const periodos: Array<{ inicial: string; final: string }> = [];
  let cursor = paraData(inicial);
  const limite = paraData(final);

  while (cursor <= limite) {
    const fim = new Date(cursor);
    fim.setUTCDate(fim.getUTCDate() + 30);
    if (fim > limite) fim.setTime(limite.getTime());
    periodos.push({ inicial: paraIso(cursor), final: paraIso(fim) });
    cursor = new Date(fim);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return periodos;
}
