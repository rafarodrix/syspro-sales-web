import type { VendaProduto } from "@/lib/syspro-api";

export interface VendaAgrupada {
  id: string;
  numero: string;
  emissao: string;
  cliente: string;
  cidade: string;
  uf: string;
  vendedor: string;
  departamento: string;
  formaPagamento: string;
  modelo: string;
  itens: VendaProduto[];
  quantidadeItens: number;
  total: number;
}

export interface PontoFaturamento {
  data: string;
  rotulo: string;
  total: number;
  totalAnterior?: number;
}

export interface ProdutoRankeado {
  id: string;
  produto: string;
  departamento?: string;
  quantidade: number;
  total: number;
  percentual: number;
}

export interface ItemRankeado {
  nome: string;
  total: number;
  percentual: number;
  quantidade?: number;
}

export interface ResumoVendas {
  faturamento: number;
  descontos: number;
  frete: number;
  icmsSt: number;
  quantidadeItens: number;
  notas: number;
  clientes: number;
  ticketMedio: number;
  porDepartamento: ItemRankeado[];
  porVendedor: ItemRankeado[];
  porFormaPagamento: ItemRankeado[];
  porModeloDocumento: ItemRankeado[];
  porCidade: ItemRankeado[];
}

export interface VariacaoMetrica {
  atual: number;
  anterior: number;
  diferenca: number;
  percentual: number;
  texto: string;
  positivo: boolean;
  neutro: boolean;
}

export interface DestaquesPeriodo {
  melhorDia?: { data: string; total: number; pedidos: number };
  maiorVenda?: { cliente: string; numero: string; total: number };
  topVendedor?: { nome: string; total: number; percentual: number };
  topDepartamento?: { nome: string; total: number; percentual: number };
}

export type MetricaDeVendas = "faturamento" | "itens" | "notas";

export function paraNumero(valor: number | string | null | undefined): number {
  if (valor == null || valor === "") return 0;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  const texto = String(valor).trim().replace(/\s/g, "");
  const normalizado = texto.includes(",")
    ? texto.replace(/\./g, "").replace(",", ".")
    : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

export function chaveDaNota(venda: VendaProduto): string {
  return [
    venda.empresa_codigo?.trim() || "1",
    venda.nf_modelo?.trim() || "55",
    venda.nf_numero?.trim() || "Sem número",
  ].join("|");
}

export function agruparVendasPorNota(vendas: VendaProduto[]): VendaAgrupada[] {
  const notas = new Map<string, VendaAgrupada>();
  for (const venda of vendas) {
    const numero = venda.nf_numero?.trim() || "Sem número";
    const chave = chaveDaNota(venda);
    const atual = notas.get(chave);
    const qtdItem = paraNumero(venda.produto_qtde);
    const totalItem = paraNumero(venda.produto_vlr_total_item);

    if (atual) {
      atual.itens.push(venda);
      atual.quantidadeItens += qtdItem;
      atual.total += totalItem;
      continue;
    }
    notas.set(chave, {
      id: chave,
      numero,
      emissao: venda.nf_dt_emissao,
      cliente: venda.cliente_nome?.trim() || "Cliente não identificado",
      cidade: venda.cliente_cidade?.trim() || "",
      uf: venda.cliente_uf?.trim() || "",
      vendedor: venda.vendedor_nome?.trim() || "Sem vendedor",
      departamento: venda.produto_departamento?.trim() || "Sem departamento",
      formaPagamento: venda.nf_forma_pagto?.trim() || "Não informado",
      modelo: venda.nf_modelo?.trim() || "55",
      itens: [venda],
      quantidadeItens: qtdItem,
      total: totalItem,
    });
  }
  return [...notas.values()].sort(
    (a, b) => dataParaOrdem(b.emissao) - dataParaOrdem(a.emissao),
  );
}

export function resumoVendas(vendas: VendaProduto[]): ResumoVendas {
  const clientes = new Set<string>();
  const departamentos = new Map<string, number>();
  const vendedores = new Map<string, number>();
  const formasPagamento = new Map<string, number>();
  const modelosDocumento = new Map<string, number>();
  const cidades = new Map<string, number>();

  let faturamento = 0;
  let descontos = 0;
  let frete = 0;
  let icmsSt = 0;
  let quantidadeItens = 0;

  for (const venda of vendas) {
    const total = paraNumero(venda.produto_vlr_total_item);
    faturamento += total;
    descontos += paraNumero(venda.produto_vlr_desconto);
    frete += paraNumero(venda.produto_vlr_frete);
    icmsSt += paraNumero(venda.produto_vlr_icms_stb);
    quantidadeItens += paraNumero(venda.produto_qtde);

    if (venda.cliente_nome?.trim()) {
      clientes.add(venda.cliente_nome.trim().toUpperCase());
    }
    somar(departamentos, venda.produto_departamento, total, "Sem departamento");
    somar(vendedores, venda.vendedor_nome, total, "Sem vendedor");
    somar(formasPagamento, venda.nf_forma_pagto, total, "Não informado");
    somar(modelosDocumento, venda.nf_modelo, total, "Não informado");
    if (venda.cliente_cidade?.trim()) {
      const cid = `${venda.cliente_cidade.trim()}${venda.cliente_uf ? ` - ${venda.cliente_uf.trim()}` : ""}`;
      somar(cidades, cid, total, "Outros");
    }
  }

  const notas = agruparVendasPorNota(vendas).length;
  const ticketMedio = notas ? faturamento / notas : 0;

  return {
    faturamento,
    descontos,
    frete,
    icmsSt,
    quantidadeItens,
    notas,
    clientes: clientes.size,
    ticketMedio,
    porDepartamento: rankear(departamentos, faturamento),
    porVendedor: rankear(vendedores, faturamento),
    porFormaPagamento: rankear(formasPagamento, faturamento),
    porModeloDocumento: rankear(modelosDocumento, faturamento),
    porCidade: rankear(cidades, faturamento),
  };
}

export function produtosMaisVendidos(
  vendas: VendaProduto[],
  limite = 6,
): ProdutoRankeado[] {
  const produtosMap = new Map<
    string,
    { id: string; produto: string; total: number; quantidade: number; departamento?: string }
  >();

  let faturamentoTotal = 0;

  for (const venda of vendas) {
    const id = String(venda.produto_id ?? "").trim() || "SEM-COD";
    const nome = venda.produto_descricao?.trim() || "Produto não identificado";
    const chave = `${id}|${nome}`;
    const total = paraNumero(venda.produto_vlr_total_item);
    const qtd = paraNumero(venda.produto_qtde);
    faturamentoTotal += total;

    const atual = produtosMap.get(chave);
    if (atual) {
      atual.total += total;
      atual.quantidade += qtd;
    } else {
      produtosMap.set(chave, {
        id,
        produto: nome,
        total,
        quantidade: qtd,
        departamento: venda.produto_departamento?.trim(),
      });
    }
  }

  return [...produtosMap.values()]
    .map((p) => ({
      ...p,
      percentual: faturamentoTotal > 0 ? (p.total / faturamentoTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limite);
}

export function calcularVariacao(atual: number, anterior: number): VariacaoMetrica {
  const diferenca = atual - anterior;
  if (anterior === 0) {
    if (atual === 0) {
      return {
        atual,
        anterior,
        diferenca: 0,
        percentual: 0,
        texto: "0,0%",
        positivo: true,
        neutro: true,
      };
    }
    return {
      atual,
      anterior,
      diferenca,
      percentual: 100,
      texto: "+100%",
      positivo: true,
      neutro: false,
    };
  }

  const percentual = ((atual - anterior) / Math.abs(anterior)) * 100;
  const sinal = percentual > 0 ? "+" : "";
  const texto = `${sinal}${percentual.toFixed(1).replace(".", ",")}%`;

  return {
    atual,
    anterior,
    diferenca,
    percentual,
    texto,
    positivo: percentual >= 0,
    neutro: Math.abs(percentual) < 0.01,
  };
}

export function calcularPeriodoAnterior(
  dtInicialInput: string,
  dtFinalInput: string,
): { inicial: string; final: string } {
  const ini = parseDataInput(dtInicialInput);
  const fim = parseDataInput(dtFinalInput);

  const diffMs = fim.getTime() - ini.getTime();
  const duracaoDias = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

  // Período anterior termina 1 dia antes da data inicial atual
  const fimAnterior = new Date(ini.getTime() - 24 * 60 * 60 * 1000);
  const iniAnterior = new Date(fimAnterior.getTime() - (duracaoDias - 1) * 24 * 60 * 60 * 1000);

  return {
    inicial: dataParaInput(iniAnterior),
    final: dataParaInput(fimAnterior),
  };
}

export function dadosPorMetricaComparativa(
  vendasAtuais: VendaProduto[],
  vendasAnteriores: VendaProduto[],
  metrica: MetricaDeVendas,
): PontoFaturamento[] {
  const pontosAtuais = agruparPorDia(vendasAtuais, metrica);
  const pontosAnteriores = agruparPorDia(vendasAnteriores, metrica);

  return pontosAtuais.map((pt, idx) => {
    const ant = pontosAnteriores[idx];
    return {
      ...pt,
      totalAnterior: ant ? ant.total : 0,
    };
  });
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
      notasDoDia.add(chaveDaNota(venda));
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
    for (const [data, notasDoDia] of notas) {
      totais.set(data, notasDoDia.size);
    }
  }

  return [...totais.entries()]
    .map(([data, total]) => ({ data, total, rotulo: data }))
    .sort((a, b) => dataParaOrdem(a.data) - dataParaOrdem(b.data));
}

export function calcularDestaques(
  vendas: VendaProduto[],
  resumo: ResumoVendas,
): DestaquesPeriodo {
  if (!vendas.length) return {};

  const faturamentoPorDiaMap = new Map<string, { total: number; pedidos: Set<string> }>();
  let maiorVenda: { cliente: string; numero: string; total: number } | undefined;

  const notasAgrupadas = agruparVendasPorNota(vendas);
  if (notasAgrupadas.length > 0) {
    const topNota = [...notasAgrupadas].sort((a, b) => b.total - a.total)[0];
    if (topNota) {
      maiorVenda = {
        cliente: topNota.cliente,
        numero: topNota.numero,
        total: topNota.total,
      };
    }
  }

  for (const venda of vendas) {
    const data = venda.nf_dt_emissao || "Sem data";
    const total = paraNumero(venda.produto_vlr_total_item);
    const diaInfo = faturamentoPorDiaMap.get(data) ?? { total: 0, pedidos: new Set() };
    diaInfo.total += total;
    diaInfo.pedidos.add(chaveDaNota(venda));
    faturamentoPorDiaMap.set(data, diaInfo);
  }

  let melhorDia: { data: string; total: number; pedidos: number } | undefined;
  for (const [data, info] of faturamentoPorDiaMap.entries()) {
    if (!melhorDia || info.total > melhorDia.total) {
      melhorDia = {
        data,
        total: info.total,
        pedidos: info.pedidos.size,
      };
    }
  }

  const topVendedor = resumo.porVendedor[0]
    ? {
        nome: resumo.porVendedor[0].nome,
        total: resumo.porVendedor[0].total,
        percentual: resumo.porVendedor[0].percentual,
      }
    : undefined;

  const topDepartamento = resumo.porDepartamento[0]
    ? {
        nome: resumo.porDepartamento[0].nome,
        total: resumo.porDepartamento[0].total,
        percentual: resumo.porDepartamento[0].percentual,
      }
    : undefined;

  return {
    melhorDia,
    maiorVenda,
    topVendedor,
    topDepartamento,
  };
}

function somar(
  totais: Map<string, number>,
  chave: string | null | undefined,
  valor: number,
  fallback: string,
) {
  const nome = chave?.trim() || fallback;
  totais.set(nome, (totais.get(nome) ?? 0) + valor);
}

function rankear(
  totais: Map<string, number>,
  faturamento: number,
): ItemRankeado[] {
  return [...totais.entries()]
    .map(([nome, total]) => ({
      nome,
      total,
      percentual: faturamento ? (total / faturamento) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function dataInputParaSyspro(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function dataParaOrdem(data: string): number {
  const [dia, mes, ano] = data.split("/").map(Number);
  if (!dia || !mes || !ano) return 0;
  return Date.UTC(ano, mes - 1, dia);
}

export function formatarDataInputParaBR(dataInput: string): string {
  if (!dataInput) return "";
  const parts = dataInput.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dataInput;
}

export function parseDataInput(data: string): Date {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

export function dataParaInput(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}
