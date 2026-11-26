import { calcularMargemItem, calcularPercentual, paraNumero } from "@/lib/metricas-negocio";
import type { VendaProduto } from "@/lib/syspro-api";
import { normalizarDataIso } from "@/lib/periodo";
import { valorItem } from "@/lib/vendas";

export type ClasseFornecedor = "A" | "B" | "C";

export interface LinhaFornecedor {
  fornecedor: string;
  classe: ClasseFornecedor;
  /** % de venda acumulado até este fornecedor (curva ABC). */
  participacaoAcumulada: number;
  valorVendido: number;
  /** Descontos concedidos nos itens do fornecedor. */
  descontos: number;
  /** Frete, seguro e outros acréscimos que entram no valor líquido. */
  acrescimos: number;
  valorLiquido: number;
  lucro: number;
  margem: number | null;
  itens: number;
  skus: number;
  clientes: number;
  participacao: number;
}

export interface ResumoFornecedores {
  vendaTotal: number;
  fornecedoresAtivos: number;
  participacaoTop5: number;
  concentracaoHhi: number;
  margemGeral: number | null;
  /** Itens sem fornecedor no retorno (base antiga do SysproServer). */
  itensSemFornecedor: number;
}

const SEM_FORNECEDOR = "Sem fornecedor informado";

/** Índice Herfindahl-Hirschman (0–10.000): >2.500 indica concentração alta. */
export function concentracaoHhi(participacoes: number[]): number {
  return Math.round(participacoes.reduce((total, valor) => total + valor * valor, 0));
}

export function rotuloConcentracao(hhi: number): "Concentrada" | "Moderada" | "Pulverizada" {
  if (hhi >= 2500) return "Concentrada";
  if (hhi >= 1500) return "Moderada";
  return "Pulverizada";
}

/**
 * Consolida as vendas por fornecedor do produto. O fornecedor vem da própria
 * venda (campo `fornecedor_nome` da rota produto/venda); itens de bases que
 * ainda não devolvem o campo são agrupados em "Sem fornecedor informado" e não
 * entram na conta de concentração.
 */
export function analisarFornecedores(vendas: VendaProduto[]): {
  linhas: LinhaFornecedor[];
  resumo: ResumoFornecedores;
} {
  const mapa = new Map<
    string,
    { valorVendido: number; descontos: number; acrescimos: number; valorLiquido: number; lucro: number; itens: number; skus: Set<string>; clientes: Set<string> }
  >();

  const nomesExibicao = new Map<string, string>();

  for (const venda of vendas) {
    const nomeOriginal = String(venda.fornecedor_nome ?? "").replace(/\s+/g, " ").trim();
    // Agrupa sem diferenciar maiúsculas/minúsculas; mostra o primeiro nome visto.
    const nome = (nomeOriginal || SEM_FORNECEDOR).toUpperCase();
    if (!nomesExibicao.has(nome)) nomesExibicao.set(nome, nomeOriginal || SEM_FORNECEDOR);
    const atual = mapa.get(nome) ?? {
      valorVendido: 0,
      descontos: 0,
      acrescimos: 0,
      valorLiquido: 0,
      lucro: 0,
      itens: 0,
      skus: new Set<string>(),
      clientes: new Set<string>(),
    };

    const bruto = paraNumero(venda.produto_vlr_total_item);
    const liquido = valorItem(venda);
    const margem = calcularMargemItem(venda);

    atual.valorVendido += bruto;
    atual.valorLiquido += liquido;
    atual.descontos += paraNumero(venda.produto_vlr_desconto);
    atual.lucro += margem.lucro ?? 0;
    atual.itens += 1;
    atual.skus.add(String(venda.produto_codigo_auxiliar ?? venda.produto_id ?? ""));
    atual.clientes.add(String(venda.cliente_nome ?? "").trim().toUpperCase());
    mapa.set(nome, atual);
  }

  for (const dados of mapa.values()) {
    // Fecha a conta exibida: bruto − descontos + acréscimos = líquido.
    dados.acrescimos = dados.valorLiquido - dados.valorVendido + dados.descontos;
  }

  const vendaTotal = [...mapa.values()].reduce((total, item) => total + item.valorLiquido, 0);
  const linhas: LinhaFornecedor[] = [...mapa.entries()]
    .map(([chave, dados]) => ({
      fornecedor: nomesExibicao.get(chave) ?? chave,
      classe: "C" as ClasseFornecedor,
      participacaoAcumulada: 0,
      valorVendido: dados.valorVendido,
      descontos: dados.descontos,
      acrescimos: dados.acrescimos,
      valorLiquido: dados.valorLiquido,
      lucro: dados.lucro,
      margem: dados.valorLiquido > 0 ? (dados.lucro / dados.valorLiquido) * 100 : null,
      itens: dados.itens,
      skus: dados.skus.size,
      clientes: dados.clientes.size,
      participacao: calcularPercentual(dados.valorLiquido, vendaTotal),
    }))
    .sort((a, b) => b.valorLiquido - a.valorLiquido);

  // Curva ABC de fornecedores: A até 80% da venda, B até 95%, C o restante.
  let acumulado = 0;
  for (const linha of linhas) {
    const semFornecedor = linha.fornecedor.toUpperCase() === SEM_FORNECEDOR.toUpperCase();
    if (semFornecedor) {
      linha.classe = "C";
      linha.participacaoAcumulada = 100;
      continue;
    }
    acumulado += linha.participacao;
    linha.participacaoAcumulada = Math.min(100, acumulado);
    linha.classe = acumulado <= 80 ? "A" : acumulado <= 95 ? "B" : "C";
  }

  const comFornecedor = linhas.filter((linha) => linha.fornecedor.toUpperCase() !== SEM_FORNECEDOR.toUpperCase());
  const semFornecedor = linhas.find((linha) => linha.fornecedor.toUpperCase() === SEM_FORNECEDOR.toUpperCase());
  const lucroGeral = linhas.reduce((total, linha) => total + linha.lucro, 0);

  return {
    linhas,
    resumo: {
      vendaTotal,
      fornecedoresAtivos: comFornecedor.length,
      participacaoTop5: comFornecedor.slice(0, 5).reduce((total, linha) => total + linha.participacao, 0),
      concentracaoHhi: concentracaoHhi(comFornecedor.map((linha) => linha.participacao)),
      margemGeral: vendaTotal > 0 ? (lucroGeral / vendaTotal) * 100 : null,
      itensSemFornecedor: semFornecedor?.itens ?? 0,
    },
  };
}

export interface EvolucaoFornecedor {
  fornecedor: string;
  /** Valor por mês, na ordem de `meses`. */
  valores: number[];
}

/** Série mensal dos principais fornecedores, para ver quem ganha/perde espaço. */
export function evolucaoFornecedores(
  vendas: VendaProduto[],
  limite = 5,
): { meses: string[]; series: EvolucaoFornecedor[] } {
  const porMes = new Map<string, Map<string, number>>();
  const totalPorFornecedor = new Map<string, number>();

  for (const venda of vendas) {
    const mes = normalizarDataIso(venda.nf_dt_emissao)?.slice(0, 7);
    if (!mes) continue;
    const fornecedor = String(venda.fornecedor_nome ?? "").replace(/\s+/g, " ").trim();
    if (!fornecedor) continue;
    const valor = valorItem(venda);

    const mesAtual = porMes.get(mes) ?? new Map<string, number>();
    mesAtual.set(fornecedor, (mesAtual.get(fornecedor) ?? 0) + valor);
    porMes.set(mes, mesAtual);
    totalPorFornecedor.set(fornecedor, (totalPorFornecedor.get(fornecedor) ?? 0) + valor);
  }

  const meses = [...porMes.keys()].sort();
  const top = [...totalPorFornecedor.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([fornecedor]) => fornecedor);

  return {
    meses,
    series: top.map((fornecedor) => ({
      fornecedor,
      valores: meses.map((mes) => porMes.get(mes)?.get(fornecedor) ?? 0),
    })),
  };
}

export interface ProdutoDoFornecedor {
  codigo: string;
  produto: string;
  quantidade: number;
  venda: number;
  devolvido: number;
  lucro: number;
  margem: number | null;
}

/** Produtos vendidos de cada fornecedor — base do detalhamento na tela e no CSV. */
export function produtosPorFornecedor(vendas: VendaProduto[]): Map<string, ProdutoDoFornecedor[]> {
  const mapa = new Map<string, Map<string, ProdutoDoFornecedor>>();

  for (const venda of vendas) {
    const fornecedor = String(venda.fornecedor_nome ?? "").replace(/\s+/g, " ").trim() || SEM_FORNECEDOR;
    const codigo = String(venda.produto_codigo_auxiliar ?? venda.produto_id ?? "").trim() || venda.produto_descricao;
    const produtos = mapa.get(fornecedor) ?? new Map<string, ProdutoDoFornecedor>();
    const atual = produtos.get(codigo) ?? {
      codigo,
      produto: venda.produto_descricao,
      quantidade: 0,
      venda: 0,
      devolvido: 0,
      lucro: 0,
      margem: null,
    };

    const liquido = valorItem(venda);
    const margemItem = calcularMargemItem(venda);
    atual.quantidade += paraNumero(venda.produto_qtde);
    atual.venda += liquido;
    atual.devolvido += Math.max(0, paraNumero(venda.produto_vlr_total_item) - liquido);
    atual.lucro += margemItem.lucro ?? 0;
    produtos.set(codigo, atual);
    mapa.set(fornecedor, produtos);
  }

  const saida = new Map<string, ProdutoDoFornecedor[]>();
  for (const [fornecedor, produtos] of mapa) {
    saida.set(
      fornecedor,
      [...produtos.values()]
        .map((produto) => ({
          ...produto,
          margem: produto.venda > 0 ? (produto.lucro / produto.venda) * 100 : null,
        }))
        .sort((a, b) => b.venda - a.venda),
    );
  }
  return saida;
}

export interface DevolucaoPorFornecedor {
  fornecedor: string;
  vendido: number;
  devolvido: number;
  /** Devolvido ÷ vendido (%). */
  taxa: number;
  itens: number;
}

/**
 * Devoluções (EDV) por fornecedor. A devolução vem do Kardex (mesma fonte da
 * aba Vendas & Margem), então o produto é ligado ao fornecedor pela venda.
 */
export function devolucoesPorFornecedor(
  itensMargem: { codigo: string; valorVendido: number; valorDevolvido: number }[],
  vendas: VendaProduto[],
): { linhas: DevolucaoPorFornecedor[]; vinculo: number; semVinculo: number } {
  const fornecedorPorCodigo = new Map<string, string>();
  for (const venda of vendas) {
    const codigo = String(venda.produto_codigo_auxiliar ?? venda.produto_id ?? "").trim().toUpperCase();
    const fornecedor = String(venda.fornecedor_nome ?? "").replace(/\s+/g, " ").trim();
    if (codigo && fornecedor) fornecedorPorCodigo.set(codigo, fornecedor);
  }

  const mapa = new Map<string, { vendido: number; devolvido: number; itens: number }>();
  let vinculo = 0;
  let semVinculo = 0;

  // Percorre TODOS os produtos: a taxa precisa do vendido inteiro do fornecedor,
  // não só do que teve devolução (senão a taxa estoura).
  for (const item of itensMargem) {
    const fornecedor = fornecedorPorCodigo.get(String(item.codigo ?? "").trim().toUpperCase());
    const chave = fornecedor ?? SEM_FORNECEDOR;
    const atual = mapa.get(chave) ?? { vendido: 0, devolvido: 0, itens: 0 };
    atual.vendido += item.valorVendido;

    if (item.valorDevolvido > 0) {
      atual.devolvido += item.valorDevolvido;
      atual.itens += 1;
      if (fornecedor) vinculo += 1;
      else semVinculo += 1;
    }
    mapa.set(chave, atual);
  }

  const linhas = [...mapa.entries()]
    .filter(([, dados]) => dados.devolvido > 0)
    .map(([fornecedor, dados]) => ({
      fornecedor,
      vendido: dados.vendido,
      devolvido: dados.devolvido,
      taxa: dados.vendido > 0 ? (dados.devolvido / dados.vendido) * 100 : 0,
      itens: dados.itens,
    }))
    .sort((a, b) => b.devolvido - a.devolvido);

  return { linhas, vinculo, semVinculo };
}
