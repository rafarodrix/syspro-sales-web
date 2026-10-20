import type { MovimentoKardex } from "@/lib/kardex";
import {
  calcularCoberturaEstoque,
  calcularDemandaLiquida,
  calcularDiasInclusivos,
  calcularPercentual,
  normalizarCodigoProduto,
  paraNumero,
  valorLiquidoItem,
} from "@/lib/metricas-negocio";
import type { VendaProduto } from "@/lib/syspro-api";
import { normalizarDataIso } from "@/lib/periodo";

export type SituacaoEstoque = "ruptura" | "critico" | "atencao" | "saudavel" | "excesso" | "sem_giro";

export interface PosicaoEstoque {
  codigo: string;
  produto: string;
  marca: string;
  estoqueAtual: number;
  quantidadeVendida: number;
  quantidadeDevolvida: number;
  valorVendido: number;
  valorDevolvido: number;
  taxaDevolucaoQuantidade: number;
  taxaDevolucaoValor: number;
  demandaLiquida: number;
  mediaDiaria: number;
  coberturaDias: number | null;
  custoAquisicaoMedio: number | null;
  custoReposicaoMedio: number | null;
  valorAquisicao: number | null;
  valorReposicao: number | null;
  ultimaEntrada: string | null;
  ultimaSaida: string | null;
  ultimoMovimento: string | null;
  situacao: SituacaoEstoque;
}

export interface ResumoSaudeEstoque {
  totalProdutos: number;
  valorAquisicao: number;
  valorReposicao: number;
  produtosComCustoAquisicao: number;
  produtosComCustoReposicao: number;
  coberturaCustoAquisicao: number;
  coberturaCustoReposicao: number;
  rupturas: number;
  baixaCobertura: number;
  excesso: number;
  semGiro: number;
  saldosNegativos: number;
  capitalExcesso: number;
  taxaDevolucaoQuantidade: number;
  taxaDevolucaoValor: number;
  devolucoesVendaQuantidade: number;
  devolucoesVendaValor: number;
  movimentosSemProdutoId: number;
}

export interface SaudeEstoque {
  posicoes: PosicaoEstoque[];
  resumo: ResumoSaudeEstoque;
}

interface AcumuladorProduto {
  codigo: string;
  produto: string;
  marca: string;
  estoqueAtual: number;
  quantidadeVendida: number;
  quantidadeDevolvida: number;
  valorVendido: number;
  devolucoesVendaValor: number;
  ultimaEntrada: string | null;
  ultimaSaida: string | null;
  ultimoMovimento: string | null;
  ordemUltimoMovimento: number;
  totalCustoAquisicao: number;
  totalCustoReposicao: number;
  quantidadeComCustoAquisicao: number;
  quantidadeComCustoReposicao: number;
}

const LIMITE_CRITICO_DIAS = 7;
const LIMITE_ATENCAO_DIAS = 15;
const LIMITE_EXCESSO_DIAS = 90;

function dataMaisRecente(atual: string | null, candidata: string): string | null {
  const normalizada = normalizarDataIso(candidata);
  if (!normalizada) return atual;
  return !atual || normalizada > normalizarDataIso(atual) ? candidata : atual;
}

function classificarSituacao(estoque: number, demanda: number, cobertura: number | null): SituacaoEstoque {
  if (demanda > 0 && estoque <= 0) return "ruptura";
  if (demanda <= 0 && estoque > 0) return "sem_giro";
  if (cobertura !== null && cobertura < LIMITE_CRITICO_DIAS) return "critico";
  if (cobertura !== null && cobertura < LIMITE_ATENCAO_DIAS) return "atencao";
  if (cobertura !== null && cobertura > LIMITE_EXCESSO_DIAS) return "excesso";
  return "saudavel";
}

function novoAcumulador(movimento: MovimentoKardex): AcumuladorProduto {
  return {
    codigo: movimento.produtoCodigoAuxiliar?.trim() || "Sem código",
    produto: movimento.produtoDescricao?.trim() || "Produto sem descrição",
    marca: movimento.produtoMarca?.trim() || "—",
    estoqueAtual: movimento.saldo,
    quantidadeVendida: 0,
    quantidadeDevolvida: 0,
    valorVendido: 0,
    devolucoesVendaValor: 0,
    ultimaEntrada: null,
    ultimaSaida: null,
    ultimoMovimento: null,
    ordemUltimoMovimento: -1,
    totalCustoAquisicao: 0,
    totalCustoReposicao: 0,
    quantidadeComCustoAquisicao: 0,
    quantidadeComCustoReposicao: 0,
  };
}

export function montarSaudeEstoque(
  movimentos: MovimentoKardex[],
  vendas: VendaProduto[],
  periodo: { inicial: string; final: string },
): SaudeEstoque {
  const porProduto = new Map<string, AcumuladorProduto>();
  let movimentosSemProdutoId = 0;

  movimentos.forEach((movimento, indice) => {
    const produtoId = normalizarCodigoProduto(movimento.produtoIdProduto, "");
    if (!produtoId) {
      movimentosSemProdutoId += 1;
      return;
    }

    const atual = porProduto.get(produtoId) ?? novoAcumulador(movimento);
    const quantidade = Math.abs(movimento.quantidadeMovimentada);
    const dataMovimento = normalizarDataIso(movimento.dataMovimento);
    const dataUltimo = normalizarDataIso(atual.ultimoMovimento ?? "");

    if (movimento.classificacao.categoria === "devolucao_venda") {
      atual.quantidadeDevolvida += quantidade;
      atual.devolucoesVendaValor += Math.abs(movimento.valorTotal);
    }
    if (movimento.direcao === "entrada") atual.ultimaEntrada = dataMaisRecente(atual.ultimaEntrada, movimento.dataMovimento);
    if (movimento.direcao === "saida") atual.ultimaSaida = dataMaisRecente(atual.ultimaSaida, movimento.dataMovimento);

    if (dataMovimento > dataUltimo || (dataMovimento === dataUltimo && indice > atual.ordemUltimoMovimento)) {
      atual.estoqueAtual = movimento.saldo;
      atual.ultimoMovimento = movimento.dataMovimento;
      atual.ordemUltimoMovimento = indice;
      atual.codigo = movimento.produtoCodigoAuxiliar?.trim() || atual.codigo;
      atual.produto = movimento.produtoDescricao?.trim() || atual.produto;
      atual.marca = movimento.produtoMarca?.trim() || atual.marca;
    }
    porProduto.set(produtoId, atual);
  });

  for (const venda of vendas) {
    const produtoId = normalizarCodigoProduto(venda.produto_id, "");
    const atual = produtoId ? porProduto.get(produtoId) : undefined;
    if (!atual) continue;

    const quantidade = Math.abs(paraNumero(venda.produto_qtde));
    const custoAquisicao = paraNumero(venda.produto_vlr_custo_aquisicao);
    const custoReposicao = paraNumero(venda.produto_vlr_custo_reposicao);
    // Quantidade vendida vem da rota produto/venda (EVP/EVD), não do Kardex:
    // o Kardex repete linhas de movimento e infla a quantidade; ENP é reemissão fiscal e não conta.
    atual.quantidadeVendida += quantidade;
    atual.valorVendido += Math.abs(valorLiquidoItem(venda));
    if (custoAquisicao > 0 && quantidade > 0) {
      atual.totalCustoAquisicao += custoAquisicao * quantidade;
      atual.quantidadeComCustoAquisicao += quantidade;
    }
    if (custoReposicao > 0 && quantidade > 0) {
      atual.totalCustoReposicao += custoReposicao * quantidade;
      atual.quantidadeComCustoReposicao += quantidade;
    }
    if (atual.codigo === "Sem código" && venda.produto_codigo_auxiliar?.trim()) atual.codigo = venda.produto_codigo_auxiliar.trim();
  }

  const diasPeriodo = calcularDiasInclusivos(normalizarDataIso(periodo.inicial), normalizarDataIso(periodo.final));
  const posicoes = [...porProduto.values()].map((item): PosicaoEstoque => {
    const demandaLiquida = calcularDemandaLiquida(item.quantidadeVendida, item.quantidadeDevolvida);
    const mediaDiaria = diasPeriodo > 0 ? demandaLiquida / diasPeriodo : 0;
    const coberturaDias = calcularCoberturaEstoque(item.estoqueAtual, demandaLiquida, diasPeriodo);
    const custoAquisicaoMedio = item.quantidadeComCustoAquisicao > 0
      ? item.totalCustoAquisicao / item.quantidadeComCustoAquisicao
      : null;
    const custoReposicaoMedio = item.quantidadeComCustoReposicao > 0
      ? item.totalCustoReposicao / item.quantidadeComCustoReposicao
      : null;
    const estoqueValorizavel = Math.max(0, item.estoqueAtual);
    const taxaDevolucaoQuantidade = calcularPercentual(item.quantidadeDevolvida, item.quantidadeVendida);
    const taxaDevolucaoValor = calcularPercentual(item.devolucoesVendaValor, item.valorVendido);

    return {
      codigo: item.codigo,
      produto: item.produto,
      marca: item.marca,
      estoqueAtual: item.estoqueAtual,
      quantidadeVendida: item.quantidadeVendida,
      quantidadeDevolvida: item.quantidadeDevolvida,
      valorVendido: item.valorVendido,
      valorDevolvido: item.devolucoesVendaValor,
      taxaDevolucaoQuantidade,
      taxaDevolucaoValor,
      demandaLiquida,
      mediaDiaria,
      coberturaDias,
      custoAquisicaoMedio,
      custoReposicaoMedio,
      valorAquisicao: custoAquisicaoMedio === null ? null : estoqueValorizavel * custoAquisicaoMedio,
      valorReposicao: custoReposicaoMedio === null ? null : estoqueValorizavel * custoReposicaoMedio,
      ultimaEntrada: item.ultimaEntrada,
      ultimaSaida: item.ultimaSaida,
      ultimoMovimento: item.ultimoMovimento,
      situacao: classificarSituacao(item.estoqueAtual, demandaLiquida, coberturaDias),
    };
  }).sort((a, b) => {
    const prioridade: Record<SituacaoEstoque, number> = { ruptura: 0, critico: 1, atencao: 2, sem_giro: 3, excesso: 4, saudavel: 5 };
    return prioridade[a.situacao] - prioridade[b.situacao] || (b.valorReposicao ?? 0) - (a.valorReposicao ?? 0);
  });

  const produtosComCustoAquisicao = posicoes.filter((item) => item.custoAquisicaoMedio !== null).length;
  const produtosComCustoReposicao = posicoes.filter((item) => item.custoReposicaoMedio !== null).length;
  const quantidadeVendida = posicoes.reduce((total, item) => total + item.quantidadeVendida, 0);
  const quantidadeDevolvida = posicoes.reduce((total, item) => total + item.quantidadeDevolvida, 0);
  const valorVendido = posicoes.reduce((total, item) => total + item.valorVendido, 0);
  const valorDevolvido = posicoes.reduce((total, item) => total + item.valorDevolvido, 0);

  return {
    posicoes,
    resumo: {
      totalProdutos: posicoes.length,
      valorAquisicao: posicoes.reduce((total, item) => total + (item.valorAquisicao ?? 0), 0),
      valorReposicao: posicoes.reduce((total, item) => total + (item.valorReposicao ?? 0), 0),
      produtosComCustoAquisicao,
      produtosComCustoReposicao,
      coberturaCustoAquisicao: calcularPercentual(produtosComCustoAquisicao, posicoes.length),
      coberturaCustoReposicao: calcularPercentual(produtosComCustoReposicao, posicoes.length),
      rupturas: posicoes.filter((item) => item.situacao === "ruptura").length,
      baixaCobertura: posicoes.filter((item) => item.situacao === "critico" || item.situacao === "atencao").length,
      excesso: posicoes.filter((item) => item.situacao === "excesso").length,
      semGiro: posicoes.filter((item) => item.situacao === "sem_giro").length,
      saldosNegativos: posicoes.filter((item) => item.estoqueAtual < 0).length,
      capitalExcesso: posicoes
        .filter((item) => item.situacao === "excesso")
        .reduce((total, item) => total + (item.valorReposicao ?? 0), 0),
      taxaDevolucaoQuantidade: calcularPercentual(quantidadeDevolvida, quantidadeVendida),
      taxaDevolucaoValor: calcularPercentual(valorDevolvido, valorVendido),
      devolucoesVendaQuantidade: quantidadeDevolvida,
      devolucoesVendaValor: valorDevolvido,
      movimentosSemProdutoId,
    },
  };
}
