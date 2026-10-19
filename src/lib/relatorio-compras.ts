import type { MovimentoKardex } from "@/lib/kardex";
import type { VendaProduto } from "@/lib/syspro-api";
import {
  calcularCoberturaEstoque,
  calcularDemandaLiquida,
  calcularDiasInclusivos,
  calcularPercentual,
  classificarCurvaABC,
  normalizarCodigoProduto,
  normalizarDescricaoProduto,
  paraNumero,
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
  demandaLiquida: number;
  taxaDevolucao: number;
  estoqueAtual: number | null;
  mediaDiaria: number;
  coberturaDias: number | null;
  dataUltimoMovimento: string | null;
  produtoId?: string;
  marca?: string;
  custoAquisicaoMedio?: number | null;
  custoReposicaoMedio?: number | null;
}

export interface ResumoRelatorioCompras {
  totalProdutos: number;
  quantidadeVendida: number;
  quantidadeDevolvida: number;
  demandaLiquida: number;
  taxaDevolucao: number;
  produtosSemSaldo: number;
  produtosSemSaldoLocalizado: number;
}

export interface RelatorioCompras {
  itens: ItemRelatorioCompras[];
  resumo: ResumoRelatorioCompras;
}

function normalizarCodigo(codigo: string): string {
  return normalizarCodigoProduto(codigo, "");
}

function estaNoPeriodo(data: string, inicial: string, final: string): boolean {
  const dataIso = data.slice(0, 10);
  return dataIso >= inicial && dataIso <= final;
}

export function montarRelatorioCompras(
  vendas: VendaProduto[],
  movimentos: MovimentoKardex[],
  periodo: { inicial: string; final: string },
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
  const chavePorDescricao = new Map<string, string | null>();
  const chavePorId = new Map<string, string>();
  const chavePorAuxiliar = new Map<string, string>();

  for (const venda of vendas) {
    const codigoOriginal = String(
      venda.produto_codigo_auxiliar || venda.produto_id || "",
    ).trim();
    const codigo = normalizarCodigo(codigoOriginal);
    if (!codigo) continue;

    const atual = porProduto.get(codigo) ?? {
      codigo: codigoOriginal,
      produto: venda.produto_descricao?.trim() || "Produto sem descrição",
      unidade: venda.produto_un?.trim() || "-",
      quantidadeVendida: 0,
      quantidadeDevolvida: 0,
      demandaLiquida: 0,
      taxaDevolucao: 0,
      estoqueAtual: null,
      mediaDiaria: 0,
      coberturaDias: null,
      dataUltimoMovimento: null,
      produtoId: String(venda.produto_id ?? "").trim() || undefined,
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
    const idNormalizado = normalizarCodigoProduto(venda.produto_id, "");
    const auxiliarNormalizado = normalizarCodigoProduto(venda.produto_codigo_auxiliar, "");
    if (idNormalizado) chavePorId.set(idNormalizado, codigo);
    if (auxiliarNormalizado) chavePorAuxiliar.set(auxiliarNormalizado, codigo);
    porProduto.set(codigo, atual);
    const descricao = normalizarDescricaoProduto(venda.produto_descricao);
    if (descricao) {
      const chaveExistente = chavePorDescricao.get(descricao);
      if (!chavePorDescricao.has(descricao)) chavePorDescricao.set(descricao, codigo);
      else if (chaveExistente !== codigo) chavePorDescricao.set(descricao, null);
    }
  }

  movimentos.forEach((movimento, indice) => {
    const codigoAuxiliar = normalizarCodigo(movimento.produtoCodigoAuxiliar);
    const codigoId = normalizarCodigoProduto(movimento.produtoIdProduto, "");
    const descricao = normalizarDescricaoProduto(movimento.produtoDescricao);
    const chave = chavePorAuxiliar.get(codigoAuxiliar)
      ?? chavePorId.get(codigoId)
      ?? chavePorDescricao.get(descricao);
    const atual = chave ? porProduto.get(chave) : undefined;
    if (!atual) return;

    if (
      movimento.grupoDocumento.trim().toUpperCase() === "EDC" &&
      estaNoPeriodo(movimento.dataMovimento, periodo.inicial, periodo.final)
    ) {
      atual.quantidadeDevolvida += Math.abs(movimento.quantidadeMovimentada);
    }

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
    item.demandaLiquida = calcularDemandaLiquida(item.quantidadeVendida, item.quantidadeDevolvida);
    item.taxaDevolucao = calcularPercentual(item.quantidadeDevolvida, item.quantidadeVendida);
    item.mediaDiaria = diasPeriodo > 0 ? item.demandaLiquida / diasPeriodo : 0;
    item.coberturaDias = calcularCoberturaEstoque(item.estoqueAtual, item.demandaLiquida, diasPeriodo);
    item.custoAquisicaoMedio = item.quantidadeComCustoAquisicao > 0
      ? item.totalCustoAquisicao / item.quantidadeComCustoAquisicao
      : null;
    item.custoReposicaoMedio = item.quantidadeComCustoReposicao > 0
      ? item.totalCustoReposicao / item.quantidadeComCustoReposicao
      : null;
  }

  const ordenados = [...porProduto.values()].sort(
    (a, b) => b.demandaLiquida - a.demandaLiquida || a.codigo.localeCompare(b.codigo),
  );
  const totalVendido = ordenados.reduce((total, item) => total + item.quantidadeVendida, 0);
  const totalDevolvido = ordenados.reduce((total, item) => total + item.quantidadeDevolvida, 0);
  const totalDemandaLiquida = ordenados.reduce((total, item) => total + item.demandaLiquida, 0);
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
      demandaLiquida: item.demandaLiquida,
      taxaDevolucao: item.taxaDevolucao,
      estoqueAtual: item.estoqueAtual,
      mediaDiaria: item.mediaDiaria,
      coberturaDias: item.coberturaDias,
      dataUltimoMovimento: item.dataUltimoMovimento,
      produtoId: item.produtoId,
      marca: item.marca,
      custoAquisicaoMedio: item.custoAquisicaoMedio,
      custoReposicaoMedio: item.custoReposicaoMedio,
      curva,
    };
  });

  return {
    itens,
    resumo: {
      totalProdutos: itens.length,
      quantidadeVendida: totalVendido,
      quantidadeDevolvida: totalDevolvido,
      demandaLiquida: totalDemandaLiquida,
      taxaDevolucao: calcularPercentual(totalDevolvido, totalVendido),
      produtosSemSaldo: itens.filter((item) => item.estoqueAtual !== null && item.estoqueAtual <= 0).length,
      produtosSemSaldoLocalizado: itens.filter((item) => item.estoqueAtual === null).length,
    },
  };
}

export function dividirPeriodoKardex(inicial: string, final: string) {
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
