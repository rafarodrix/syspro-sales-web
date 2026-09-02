import type { VendaProduto } from "@/lib/syspro-api";

export interface VendaAgrupada {
  id: string;
  numero: string;
  emissao: string;
  cliente: string;
  cidade: string;
  uf: string;
  itens: VendaProduto[];
  quantidadeItens: number;
  total: number;
}

export interface PontoFaturamento {
  data: string;
  rotulo: string;
  total: number;
}
export interface ProdutoRankeado {
  produto: string;
  total: number;
}

export type MetricaDeVendas = "faturamento" | "itens" | "notas";

export function paraNumero(valor: number | string | null | undefined): number {
  if (valor == null || valor === "") return 0;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  const texto = valor.trim().replace(/\s/g, "");
  const normalizado = texto.includes(",")
    ? texto.replace(/\./g, "").replace(",", ".")
    : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

export function agruparVendasPorNota(vendas: VendaProduto[]): VendaAgrupada[] {
  const notas = new Map<string, VendaAgrupada>();
  for (const venda of vendas) {
    const numero = venda.nf_numero?.trim() || "Sem número";
    const chave = [numero, venda.nf_dt_emissao, venda.cliente_nome].join("|");
    const atual = notas.get(chave);
    if (atual) {
      atual.itens.push(venda);
      atual.quantidadeItens += paraNumero(venda.produto_qtde);
      atual.total += paraNumero(venda.produto_vlr_total_item);
      continue;
    }
    notas.set(chave, {
      id: chave,
      numero,
      emissao: venda.nf_dt_emissao,
      cliente: venda.cliente_nome,
      cidade: venda.cliente_cidade,
      uf: venda.cliente_uf,
      itens: [venda],
      quantidadeItens: paraNumero(venda.produto_qtde),
      total: paraNumero(venda.produto_vlr_total_item),
    });
  }
  return [...notas.values()].sort(
    (a, b) => dataParaOrdem(b.emissao) - dataParaOrdem(a.emissao),
  );
}

export function faturamentoPorDia(vendas: VendaProduto[]): PontoFaturamento[] {
  return agruparPorDia(vendas, "faturamento");
}

export function dadosPorMetrica(
  vendas: VendaProduto[],
  metrica: MetricaDeVendas,
): PontoFaturamento[] {
  return agruparPorDia(vendas, metrica);
}

function agruparPorDia(
  vendas: VendaProduto[],
  metrica: MetricaDeVendas,
): PontoFaturamento[] {
  const totais = new Map<string, number>();
  const notas = new Map<string, Set<string>>();
  for (const venda of vendas) {
    const data = venda.nf_dt_emissao || "Sem data";
    if (metrica === "notas") {
      const notasDoDia = notas.get(data) ?? new Set<string>();
      notasDoDia.add(venda.nf_numero);
      notas.set(data, notasDoDia);
      continue;
    }
    totais.set(
      data,
      (totais.get(data) ?? 0) +
        (metrica === "faturamento"
          ? paraNumero(venda.produto_vlr_total_item)
          : paraNumero(venda.produto_qtde)),
    );
  }
  if (metrica === "notas") {
    for (const [data, notasDoDia] of notas) totais.set(data, notasDoDia.size);
  }
  return [...totais.entries()]
    .map(([data, total]) => ({ data, total, rotulo: data }))
    .sort((a, b) => dataParaOrdem(a.data) - dataParaOrdem(b.data));
}

export function produtosMaisVendidos(
  vendas: VendaProduto[],
  limite = 5,
): ProdutoRankeado[] {
  const totais = new Map<string, number>();
  for (const venda of vendas) {
    const produto = venda.produto_descricao?.trim() || "Produto não informado";
    totais.set(
      produto,
      (totais.get(produto) ?? 0) + paraNumero(venda.produto_vlr_total_item),
    );
  }
  return [...totais.entries()]
    .map(([produto, total]) => ({ produto, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limite);
}

export function dataInputParaSyspro(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function dataParaOrdem(data: string): number {
  const [dia, mes, ano] = data.split("/").map(Number);
  if (!dia || !mes || !ano) return 0;
  return Date.UTC(ano, mes - 1, dia);
}
