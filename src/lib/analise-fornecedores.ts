import { calcularMargemItem, calcularPercentual, paraNumero } from "@/lib/metricas-negocio";
import type { VendaProduto } from "@/lib/syspro-api";
import { normalizarDataIso } from "@/lib/periodo";
import { valorItem } from "@/lib/vendas";

export interface LinhaFornecedor {
  fornecedor: string;
  valorVendido: number;
  /** Descontos concedidos nos itens do fornecedor. */
  descontos: number;
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
    { valorVendido: number; descontos: number; valorLiquido: number; lucro: number; itens: number; skus: Set<string>; clientes: Set<string> }
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

  const vendaTotal = [...mapa.values()].reduce((total, item) => total + item.valorLiquido, 0);
  const linhas: LinhaFornecedor[] = [...mapa.entries()]
    .map(([chave, dados]) => ({
      fornecedor: nomesExibicao.get(chave) ?? chave,
      valorVendido: dados.valorVendido,
      descontos: dados.descontos,
      valorLiquido: dados.valorLiquido,
      lucro: dados.lucro,
      margem: dados.valorLiquido > 0 ? (dados.lucro / dados.valorLiquido) * 100 : null,
      itens: dados.itens,
      skus: dados.skus.size,
      clientes: dados.clientes.size,
      participacao: calcularPercentual(dados.valorLiquido, vendaTotal),
    }))
    .sort((a, b) => b.valorLiquido - a.valorLiquido);

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
