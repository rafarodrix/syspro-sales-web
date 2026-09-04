import type { VendaProduto, VendaComEmpresa } from "@/lib/syspro-api";

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
  empresaId?: string;
  empresaNome?: string;
  empresaCnpj?: string;
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
  faturamentoBruto: number;
  descontos: number;
  frete: number;
  icmsSt: number;
  quantidadeItens: number;
  notas: number;
  clientes: number;
  ticketMedio: number;
  itensPorNota: number;
  skusPorNota: number;
  taxaDesconto: number;
  taxaFrete: number;
  clientesRecorrentes: number;
  percentualRecorrencia: number;
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

// ==========================================
// Tipos para Relatórios Avançados
// ==========================================

export interface ItemCurvaABC {
  id: string;
  produto: string;
  departamento: string;
  un: string;
  quantidade: number;
  total: number;
  precoMedio: number;
  percentual: number;
  percentualAcumulado: number;
  classe: "A" | "B" | "C";
}

export interface RelatorioCurvaABC {
  itens: ItemCurvaABC[];
  faturamentoTotal: number;
  totalItens: number;
  resumoA: { faturamento: number; itens: number; percentualFaturamento: number; percentualItens: number };
  resumoB: { faturamento: number; itens: number; percentualFaturamento: number; percentualItens: number };
  resumoC: { faturamento: number; itens: number; percentualFaturamento: number; percentualItens: number };
}

export interface ItemDepartamentoAnalise {
  nome: string;
  faturamento: number;
  percentual: number;
  quantidadeItens: number;
  quantidadeProdutosDistintos: number;
  ticketMedioPorItem: number;
  produtos: {
    id: string;
    produto: string;
    un: string;
    quantidade: number;
    total: number;
    precoMedio: number;
    percentual: number;
  }[];
}

export interface ItemVendedorAnalise {
  nome: string;
  faturamento: number;
  percentual: number;
  pedidos: number;
  clientes: number;
  ticketMedio: number;
  quantidadeItens: number;
  descontoConcedido: number;
  taxaDesconto: number;
  principalProduto?: string;
}

export interface ItemClienteAnalise {
  nome: string;
  cidade: string;
  uf: string;
  pedidos: number;
  quantidadeItens: number;
  faturamento: number;
  descontos: number;
  ticketMedio: number;
  percentual: number;
  percentualAcumulado: number;
  classe: "A" | "B" | "C";
}

export interface RelatorioClientes {
  itens: ItemClienteAnalise[];
  totalClientes: number;
  clientesRecorrentes: number;
  clientesPontuais: number;
  taxaRecorrencia: number;
  concentracaoTop5: number;
  concentracaoTop10: number;
  ticketMedioPorCliente: number;
}

export interface ItemDescontoAnalise {
  nome: string;
  faturamentoBruto: number;
  faturamentoLiquido: number;
  desconto: number;
  taxaDesconto: number;
  pedidos?: number;
}

export interface RelatorioDescontos {
  descontoTotal: number;
  faturamentoBruto: number;
  faturamentoLiquido: number;
  taxaDescontoGlobal: number;
  porVendedor: ItemDescontoAnalise[];
  porDepartamento: ItemDescontoAnalise[];
  porFormaPagamento: ItemDescontoAnalise[];
  porCliente: ItemDescontoAnalise[];
}

export interface ItemDiaSemanaAnalise {
  dia: string;
  indice: number;
  faturamento: number;
  pedidos: number;
  ticketMedio: number;
  percentual: number;
}

export interface RelatorioSazonalidade {
  porDiaSemana: ItemDiaSemanaAnalise[];
  porQuinzena: {
    quinzena: string;
    faturamento: number;
    pedidos: number;
    ticketMedio: number;
    percentual: number;
  }[];
}

export interface ItemGeograficoAnalise {
  cidade: string;
  uf: string;
  faturamento: number;
  frete: number;
  percentual: number;
  pedidos: number;
  clientes: number;
  ticketMedio: number;
}

export interface ItemFinanceiroAnalise {
  nome: string;
  total: number;
  percentual: number;
  pedidos: number;
  ticketMedio: number;
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

export function valorItem(venda: VendaProduto): number {
  // Valor FINAL do item (bruto - desconto + frete + outros + seguro).
  // produto_vlr_total_item é o BRUTO (não abate desconto) — sempre usar o líquido.
  const liquidoInformado = venda.produto_vlr_total_liquido;
  if (liquidoInformado !== undefined && liquidoInformado !== null && liquidoInformado !== "") {
    return paraNumero(liquidoInformado);
  }

  return (
    paraNumero(venda.produto_vlr_total_item)
    - paraNumero(venda.produto_vlr_desconto)
    + paraNumero(venda.produto_vlr_frete)
    + paraNumero(venda.produto_vlr_seguro)
    + paraNumero(venda.produto_vlr_outros)
  );
}

export function chaveDaNota(venda: VendaProduto | VendaComEmpresa): string {
  const empresaId = (venda as VendaComEmpresa).empresa_id || venda.empresa_codigo?.trim() || "1";
  return [
    empresaId,
    venda.nf_modelo?.trim() || "55",
    venda.nf_numero?.trim() || "Sem número",
  ].join("|");
}

export function agruparVendasPorNota(vendas: (VendaProduto | VendaComEmpresa)[]): VendaAgrupada[] {
  const notas = new Map<string, VendaAgrupada>();
  for (const venda of vendas) {
    const vEmp = venda as VendaComEmpresa;
    const numero = venda.nf_numero?.trim() || "Sem número";
    const chave = chaveDaNota(venda);
    const atual = notas.get(chave);
    const qtdItem = paraNumero(venda.produto_qtde);
    const totalItem = valorItem(venda);

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
      empresaId: vEmp.empresa_id,
      empresaNome: vEmp.empresa_nome,
      empresaCnpj: vEmp.empresa_cnpj,
    });
  }
  return [...notas.values()].sort(
    (a, b) => dataParaOrdem(b.emissao) - dataParaOrdem(a.emissao),
  );
}

export function isClienteConsumidorGenerico(nome: string | null | undefined): boolean {
  if (!nome) return true;
  const limpo = nome.trim().toUpperCase();
  const termos = [
    "CONSUMIDOR",
    "CONSUMIDOR FINAL",
    "CLIENTE NAO IDENTIFICADO",
    "CLIENTE NÃO IDENTIFICADO",
    "NAO IDENTIFICADO",
    "NÃO IDENTIFICADO",
    "VENDA A VISTA",
    "VENDA BALCAO",
    "VENDA BALCÃO",
    "CLIENTE BALCAO",
    "CLIENTE BALCÃO",
    "DIVERSOS",
    "CLIENTE DIVERSOS",
    "SEM CADASTRO",
    "NAO INFORMADO",
    "NÃO INFORMADO",
    "SEM CLIENTE",
  ];
  return termos.some((t) => limpo === t || limpo.startsWith("CONSUMIDOR"));
}

export function resumoVendas(vendas: VendaProduto[]): ResumoVendas {
  const clienteNotasCount = new Map<string, Set<string>>();
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
    const total = valorItem(venda);
    const desc = paraNumero(venda.produto_vlr_desconto);
    const frt = paraNumero(venda.produto_vlr_frete);
    const st = paraNumero(venda.produto_vlr_icms_stb);
    const qtd = paraNumero(venda.produto_qtde);
    const chaveNota = chaveDaNota(venda);

    faturamento += total;
    descontos += desc;
    frete += frt;
    icmsSt += st;
    quantidadeItens += qtd;

    const nomeCliente = venda.cliente_nome?.trim().toUpperCase() || "CLIENTE NÃO IDENTIFICADO";
    const notasDoCli = clienteNotasCount.get(nomeCliente) ?? new Set<string>();
    notasDoCli.add(chaveNota);
    clienteNotasCount.set(nomeCliente, notasDoCli);

    somar(departamentos, venda.produto_departamento, total, "Sem departamento");
    somar(vendedores, venda.vendedor_nome, total, "Sem vendedor");
    somar(formasPagamento, venda.nf_forma_pagto, total, "Não informado");
    somar(modelosDocumento, venda.nf_modelo, total, "Não informado");
    if (venda.cliente_cidade?.trim()) {
      const cid = `${venda.cliente_cidade.trim()}${venda.cliente_uf ? ` - ${venda.cliente_uf.trim()}` : ""}`;
      somar(cidades, cid, total, "Outros");
    }
  }

  const notasAgrupadas = agruparVendasPorNota(vendas);
  const totalNotas = notasAgrupadas.length;
  const ticketMedio = totalNotas ? faturamento / totalNotas : 0;
  const faturamentoBruto = faturamento + descontos;

  const itensPorNota = totalNotas ? quantidadeItens / totalNotas : 0;
  const skusPorNota = totalNotas ? vendas.length / totalNotas : 0;
  const taxaDesconto = faturamentoBruto > 0 ? (descontos / faturamentoBruto) * 100 : 0;
  const taxaFrete = faturamento > 0 ? (frete / faturamento) * 100 : 0;

  let clientesCadastradosCount = 0;
  let clientesRecorrentes = 0;
  for (const [nomeCli, notasDoCli] of clienteNotasCount.entries()) {
    if (!isClienteConsumidorGenerico(nomeCli)) {
      clientesCadastradosCount++;
      if (notasDoCli.size >= 2) clientesRecorrentes++;
    }
  }
  const totalClientes = clienteNotasCount.size;
  const percentualRecorrencia =
    clientesCadastradosCount > 0 ? (clientesRecorrentes / clientesCadastradosCount) * 100 : 0;

  return {
    faturamento,
    faturamentoBruto,
    descontos,
    frete,
    icmsSt,
    quantidadeItens,
    notas: totalNotas,
    clientes: totalClientes,
    ticketMedio,
    itensPorNota,
    skusPorNota,
    taxaDesconto,
    taxaFrete,
    clientesRecorrentes,
    percentualRecorrencia,
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
    const total = valorItem(venda);
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

// ==========================================
// Funções Analíticas Especializadas
// ==========================================

export function calcularCurvaABC(vendas: VendaProduto[]): RelatorioCurvaABC {
  const produtosMap = new Map<
    string,
    {
      id: string;
      produto: string;
      departamento: string;
      un: string;
      quantidade: number;
      total: number;
    }
  >();

  let faturamentoTotal = 0;

  for (const venda of vendas) {
    const id = String(venda.produto_id ?? "").trim() || "SEM-COD";
    const nome = venda.produto_descricao?.trim() || "Produto sem descrição";
    const chave = `${id}|${nome}`;
    const total = valorItem(venda);
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
        departamento: venda.produto_departamento?.trim() || "Sem departamento",
        un: venda.produto_un?.trim() || "UN",
        quantidade: qtd,
        total,
      });
    }
  }

  const produtosOrdenados = [...produtosMap.values()].sort((a, b) => b.total - a.total);

  let acumulado = 0;
  let fatA = 0, itensA = 0;
  let fatB = 0, itensB = 0;
  let fatC = 0, itensC = 0;

  const itensABC: ItemCurvaABC[] = produtosOrdenados.map((p) => {
    acumulado += p.total;
    const percentual = faturamentoTotal > 0 ? (p.total / faturamentoTotal) * 100 : 0;
    const percentualAcumulado = faturamentoTotal > 0 ? (acumulado / faturamentoTotal) * 100 : 0;

    let classe: "A" | "B" | "C";
    if (percentualAcumulado <= 80 || (acumulado - p.total) / (faturamentoTotal || 1) < 0.8) {
      classe = "A";
      fatA += p.total;
      itensA += 1;
    } else if (percentualAcumulado <= 95 || (acumulado - p.total) / (faturamentoTotal || 1) < 0.95) {
      classe = "B";
      fatB += p.total;
      itensB += 1;
    } else {
      classe = "C";
      fatC += p.total;
      itensC += 1;
    }

    const precoMedio = p.quantidade > 0 ? p.total / p.quantidade : 0;

    return {
      ...p,
      precoMedio,
      percentual,
      percentualAcumulado,
      classe,
    };
  });

  const totalItens = itensABC.length || 1;

  return {
    itens: itensABC,
    faturamentoTotal,
    totalItens: itensABC.length,
    resumoA: {
      faturamento: fatA,
      itens: itensA,
      percentualFaturamento: faturamentoTotal > 0 ? (fatA / faturamentoTotal) * 100 : 0,
      percentualItens: (itensA / totalItens) * 100,
    },
    resumoB: {
      faturamento: fatB,
      itens: itensB,
      percentualFaturamento: faturamentoTotal > 0 ? (fatB / faturamentoTotal) * 100 : 0,
      percentualItens: (itensB / totalItens) * 100,
    },
    resumoC: {
      faturamento: fatC,
      itens: itensC,
      percentualFaturamento: faturamentoTotal > 0 ? (fatC / faturamentoTotal) * 100 : 0,
      percentualItens: (itensC / totalItens) * 100,
    },
  };
}

export function analiseDepartamentos(vendas: VendaProduto[]): ItemDepartamentoAnalise[] {
  const deptosMap = new Map<
    string,
    {
      nome: string;
      faturamento: number;
      quantidadeItens: number;
      produtosMap: Map<string, { id: string; produto: string; un: string; quantidade: number; total: number }>;
    }
  >();

  let faturamentoTotal = 0;

  for (const venda of vendas) {
    const nomeDepto = venda.produto_departamento?.trim() || "Sem departamento";
    const total = valorItem(venda);
    const qtd = paraNumero(venda.produto_qtde);
    const idProd = String(venda.produto_id ?? "").trim() || "SEM-COD";
    const nomeProd = venda.produto_descricao?.trim() || "Produto sem descrição";
    const chaveProd = `${idProd}|${nomeProd}`;

    faturamentoTotal += total;

    let depto = deptosMap.get(nomeDepto);
    if (!depto) {
      depto = {
        nome: nomeDepto,
        faturamento: 0,
        quantidadeItens: 0,
        produtosMap: new Map(),
      };
      deptosMap.set(nomeDepto, depto);
    }

    depto.faturamento += total;
    depto.quantidadeItens += qtd;

    const prodAtual = depto.produtosMap.get(chaveProd);
    if (prodAtual) {
      prodAtual.total += total;
      prodAtual.quantidade += qtd;
    } else {
      depto.produtosMap.set(chaveProd, {
        id: idProd,
        produto: nomeProd,
        un: venda.produto_un?.trim() || "UN",
        quantidade: qtd,
        total,
      });
    }
  }

  return [...deptosMap.values()]
    .map((d) => {
      const produtos = [...d.produtosMap.values()]
        .map((p) => ({
          ...p,
          precoMedio: p.quantidade > 0 ? p.total / p.quantidade : 0,
          percentual: d.faturamento > 0 ? (p.total / d.faturamento) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total);

      return {
        nome: d.nome,
        faturamento: d.faturamento,
        percentual: faturamentoTotal > 0 ? (d.faturamento / faturamentoTotal) * 100 : 0,
        quantidadeItens: d.quantidadeItens,
        quantidadeProdutosDistintos: produtos.length,
        ticketMedioPorItem: d.quantidadeItens > 0 ? d.faturamento / d.quantidadeItens : 0,
        produtos,
      };
    })
    .sort((a, b) => b.faturamento - a.faturamento);
}

export function analiseVendedores(vendas: VendaProduto[]): ItemVendedorAnalise[] {
  const vendedoresMap = new Map<
    string,
    {
      nome: string;
      faturamento: number;
      desconto: number;
      quantidadeItens: number;
      notas: Set<string>;
      clientes: Set<string>;
      produtosMap: Map<string, number>;
    }
  >();

  let faturamentoTotal = 0;

  for (const venda of vendas) {
    const nomeVend = venda.vendedor_nome?.trim() || "Sem vendedor";
    const total = valorItem(venda);
    const desc = paraNumero(venda.produto_vlr_desconto);
    const qtd = paraNumero(venda.produto_qtde);
    const chaveNota = chaveDaNota(venda);
    const cliente = venda.cliente_nome?.trim().toUpperCase();
    const nomeProd = venda.produto_descricao?.trim() || "Produto";

    faturamentoTotal += total;

    let vend = vendedoresMap.get(nomeVend);
    if (!vend) {
      vend = {
        nome: nomeVend,
        faturamento: 0,
        desconto: 0,
        quantidadeItens: 0,
        notas: new Set(),
        clientes: new Set(),
        produtosMap: new Map(),
      };
      vendedoresMap.set(nomeVend, vend);
    }

    vend.faturamento += total;
    vend.desconto += desc;
    vend.quantidadeItens += qtd;
    vend.notas.add(chaveNota);
    if (cliente) vend.clientes.add(cliente);
    vend.produtosMap.set(nomeProd, (vend.produtosMap.get(nomeProd) ?? 0) + total);
  }

  return [...vendedoresMap.values()]
    .map((v) => {
      const topProd = [...v.produtosMap.entries()].sort((a, b) => b[1] - a[1])[0];
      const pedidos = v.notas.size;
      const faturamentoBruto = v.faturamento + v.desconto;
      const taxaDesconto = faturamentoBruto > 0 ? (v.desconto / faturamentoBruto) * 100 : 0;

      return {
        nome: v.nome,
        faturamento: v.faturamento,
        percentual: faturamentoTotal > 0 ? (v.faturamento / faturamentoTotal) * 100 : 0,
        pedidos,
        clientes: v.clientes.size,
        quantidadeItens: v.quantidadeItens,
        ticketMedio: pedidos > 0 ? v.faturamento / pedidos : 0,
        descontoConcedido: v.desconto,
        taxaDesconto,
        principalProduto: topProd ? topProd[0] : undefined,
      };
    })
    .sort((a, b) => b.faturamento - a.faturamento);
}

export function analiseClientes(vendas: VendaProduto[]): RelatorioClientes {
  const clientesMap = new Map<
    string,
    {
      nome: string;
      cidade: string;
      uf: string;
      faturamento: number;
      descontos: number;
      quantidadeItens: number;
      notas: Set<string>;
    }
  >();

  let faturamentoTotal = 0;

  for (const venda of vendas) {
    const nome = venda.cliente_nome?.trim() || "Cliente não identificado";
    const total = valorItem(venda);
    const desc = paraNumero(venda.produto_vlr_desconto);
    const qtd = paraNumero(venda.produto_qtde);
    const chaveNota = chaveDaNota(venda);

    faturamentoTotal += total;

    let cli = clientesMap.get(nome);
    if (!cli) {
      cli = {
        nome,
        cidade: venda.cliente_cidade?.trim() || "—",
        uf: venda.cliente_uf?.trim() || "—",
        faturamento: 0,
        descontos: 0,
        quantidadeItens: 0,
        notas: new Set(),
      };
      clientesMap.set(nome, cli);
    }

    cli.faturamento += total;
    cli.descontos += desc;
    cli.quantidadeItens += qtd;
    cli.notas.add(chaveNota);
  }

  const clientesOrdenados = [...clientesMap.values()].sort((a, b) => b.faturamento - a.faturamento);

  let acumulado = 0;
  let clientesCadastradosCount = 0;
  let recorrentes = 0;

  const itensClientes: ItemClienteAnalise[] = clientesOrdenados.map((c) => {
    acumulado += c.faturamento;
    const pedidos = c.notas.size;
    const isGenerico = isClienteConsumidorGenerico(c.nome);

    if (!isGenerico) {
      clientesCadastradosCount++;
      if (pedidos >= 2) recorrentes++;
    }

    const percentual = faturamentoTotal > 0 ? (c.faturamento / faturamentoTotal) * 100 : 0;
    const percentualAcumulado = faturamentoTotal > 0 ? (acumulado / faturamentoTotal) * 100 : 0;

    let classe: "A" | "B" | "C";
    if (percentualAcumulado <= 80 || (acumulado - c.faturamento) / (faturamentoTotal || 1) < 0.8) {
      classe = "A";
    } else if (percentualAcumulado <= 95 || (acumulado - c.faturamento) / (faturamentoTotal || 1) < 0.95) {
      classe = "B";
    } else {
      classe = "C";
    }

    return {
      nome: c.nome,
      cidade: c.cidade,
      uf: c.uf,
      pedidos,
      quantidadeItens: c.quantidadeItens,
      faturamento: c.faturamento,
      descontos: c.descontos,
      ticketMedio: pedidos > 0 ? c.faturamento / pedidos : 0,
      percentual,
      percentualAcumulado,
      classe,
    };
  });

  const totalClientes = itensClientes.length;
  const pontuais = Math.max(0, clientesCadastradosCount - recorrentes);
  const taxaRecorrencia =
    clientesCadastradosCount > 0 ? (recorrentes / clientesCadastradosCount) * 100 : 0;

  const top5Fat = itensClientes.slice(0, 5).reduce((acc, c) => acc + c.faturamento, 0);
  const top10Fat = itensClientes.slice(0, 10).reduce((acc, c) => acc + c.faturamento, 0);

  const concentracaoTop5 = faturamentoTotal > 0 ? (top5Fat / faturamentoTotal) * 100 : 0;
  const concentracaoTop10 = faturamentoTotal > 0 ? (top10Fat / faturamentoTotal) * 100 : 0;
  const ticketMedioPorCliente = totalClientes > 0 ? faturamentoTotal / totalClientes : 0;

  return {
    itens: itensClientes,
    totalClientes,
    clientesRecorrentes: recorrentes,
    clientesPontuais: pontuais,
    taxaRecorrencia,
    concentracaoTop5,
    concentracaoTop10,
    ticketMedioPorCliente,
  };
}

export function analiseDescontos(vendas: VendaProduto[]): RelatorioDescontos {
  const vendMap = new Map<string, { faturamento: number; desconto: number; notas: Set<string> }>();
  const deptoMap = new Map<string, { faturamento: number; desconto: number; notas: Set<string> }>();
  const formaPagamentoMap = new Map<string, { faturamento: number; desconto: number; notas: Set<string> }>();
  const cliMap = new Map<string, { faturamento: number; desconto: number; notas: Set<string> }>();

  let faturamentoTotal = 0;
  let descontoTotal = 0;

  for (const venda of vendas) {
    const total = valorItem(venda);
    const desc = paraNumero(venda.produto_vlr_desconto);
    const chaveNota = chaveDaNota(venda);
    const vend = venda.vendedor_nome?.trim() || "Sem vendedor";
    const depto = venda.produto_departamento?.trim() || "Sem departamento";
    const formaPagamento = venda.nf_forma_pagto?.trim() || "Não informado";
    const cli = venda.cliente_nome?.trim() || "Cliente não identificado";

    faturamentoTotal += total;
    descontoTotal += desc;

    // Vendedor
    let vData = vendMap.get(vend);
    if (!vData) {
      vData = { faturamento: 0, desconto: 0, notas: new Set() };
      vendMap.set(vend, vData);
    }
    vData.faturamento += total;
    vData.desconto += desc;
    vData.notas.add(chaveNota);

    // Departamento
    let dData = deptoMap.get(depto);
    if (!dData) {
      dData = { faturamento: 0, desconto: 0, notas: new Set() };
      deptoMap.set(depto, dData);
    }
    dData.faturamento += total;
    dData.desconto += desc;
    dData.notas.add(chaveNota);

    // Forma de pagamento
    let fpData = formaPagamentoMap.get(formaPagamento);
    if (!fpData) {
      fpData = { faturamento: 0, desconto: 0, notas: new Set() };
      formaPagamentoMap.set(formaPagamento, fpData);
    }
    fpData.faturamento += total;
    fpData.desconto += desc;
    fpData.notas.add(chaveNota);

    // Cliente
    let cData = cliMap.get(cli);
    if (!cData) {
      cData = { faturamento: 0, desconto: 0, notas: new Set() };
      cliMap.set(cli, cData);
    }
    cData.faturamento += total;
    cData.desconto += desc;
    cData.notas.add(chaveNota);
  }

  const faturamentoBruto = faturamentoTotal + descontoTotal;
  const taxaDescontoGlobal = faturamentoBruto > 0 ? (descontoTotal / faturamentoBruto) * 100 : 0;

  function formatarRankingDesconto(map: Map<string, { faturamento: number; desconto: number; notas: Set<string> }>): ItemDescontoAnalise[] {
    return [...map.entries()]
      .map(([nome, d]) => {
        const bruto = d.faturamento + d.desconto;
        const taxa = bruto > 0 ? (d.desconto / bruto) * 100 : 0;
        return {
          nome,
          faturamentoBruto: bruto,
          faturamentoLiquido: d.faturamento,
          desconto: d.desconto,
          taxaDesconto: taxa,
          pedidos: d.notas.size,
        };
      })
      .sort((a, b) => b.desconto - a.desconto);
  }

  return {
    descontoTotal,
    faturamentoBruto,
    faturamentoLiquido: faturamentoTotal,
    taxaDescontoGlobal,
    porVendedor: formatarRankingDesconto(vendMap),
    porDepartamento: formatarRankingDesconto(deptoMap),
    porFormaPagamento: formatarRankingDesconto(formaPagamentoMap),
    porCliente: formatarRankingDesconto(cliMap),
  };
}

export function extrairDataInfo(
  dataStr: string | null | undefined,
): { dia: number; mes: number; ano: number; dayOfWeek: number } | null {
  if (!dataStr) return null;
  const texto = String(dataStr).trim();
  if (!texto) return null;

  // Se contiver '/', ex: '02/09/2026' ou '02/09/2026 14:30:00'
  if (texto.includes("/")) {
    const apenasData = texto.split(" ")[0].split("T")[0];
    const partes = apenasData.split("/");
    if (partes.length >= 3) {
      const p0 = parseInt(partes[0], 10);
      const p1 = parseInt(partes[1], 10);
      const p2 = parseInt(partes[2], 10);

      let dia = p0;
      let mes = p1;
      let ano = p2;

      // Se o primeiro campo for o ano (ex: 2026/09/02)
      if (p0 > 1000) {
        ano = p0;
        mes = p1;
        dia = p2;
      }

      if (!isNaN(dia) && !isNaN(mes) && !isNaN(ano) && ano > 1900) {
        const d = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0));
        return { dia, mes, ano, dayOfWeek: d.getUTCDay() };
      }
    }
  }

  // Se contiver '-', ex: '2026-09-02' ou '2026-09-02T14:30:00'
  if (texto.includes("-")) {
    const apenasData = texto.split(" ")[0].split("T")[0];
    const partes = apenasData.split("-");
    if (partes.length >= 3) {
      const p0 = parseInt(partes[0], 10);
      const p1 = parseInt(partes[1], 10);
      const p2 = parseInt(partes[2], 10);

      let ano = p0;
      let mes = p1;
      let dia = p2;

      // Se for DD-MM-AAAA
      if (p2 > 1000) {
        dia = p0;
        mes = p1;
        ano = p2;
      }

      if (!isNaN(dia) && !isNaN(mes) && !isNaN(ano) && ano > 1900) {
        const d = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0));
        return { dia, mes, ano, dayOfWeek: d.getUTCDay() };
      }
    }
  }

  const d = new Date(texto);
  if (!isNaN(d.getTime())) {
    return {
      dia: d.getUTCDate(),
      mes: d.getUTCMonth() + 1,
      ano: d.getUTCFullYear(),
      dayOfWeek: d.getUTCDay(),
    };
  }

  return null;
}

export function analiseSazonalidade(vendas: VendaProduto[]): RelatorioSazonalidade {
  const nomesDias = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];

  const diasSemanaMap = new Map<number, { faturamento: number; notas: Set<string> }>();
  for (let i = 0; i < 7; i++) {
    diasSemanaMap.set(i, { faturamento: 0, notas: new Set() });
  }

  const quinzena1 = { faturamento: 0, notas: new Set<string>() };
  const quinzena2 = { faturamento: 0, notas: new Set<string>() };

  let faturamentoTotal = 0;

  for (const venda of vendas) {
    const total = valorItem(venda);
    const chaveNota = chaveDaNota(venda);
    const infoData = extrairDataInfo(venda.nf_dt_emissao);

    faturamentoTotal += total;

    if (infoData) {
      const diaData = diasSemanaMap.get(infoData.dayOfWeek);
      if (diaData) {
        diaData.faturamento += total;
        diaData.notas.add(chaveNota);
      }

      if (infoData.dia <= 15) {
        quinzena1.faturamento += total;
        quinzena1.notas.add(chaveNota);
      } else {
        quinzena2.faturamento += total;
        quinzena2.notas.add(chaveNota);
      }
    }
  }

  const porDiaSemana: ItemDiaSemanaAnalise[] = [1, 2, 3, 4, 5, 6, 0].map((indice) => {
    const d = diasSemanaMap.get(indice)!;
    const pedidos = d.notas.size;
    return {
      dia: nomesDias[indice],
      indice,
      faturamento: d.faturamento,
      pedidos,
      ticketMedio: pedidos > 0 ? d.faturamento / pedidos : 0,
      percentual: faturamentoTotal > 0 ? (d.faturamento / faturamentoTotal) * 100 : 0,
    };
  });

  const porQuinzena = [
    {
      quinzena: "1ª Quinzena (Dias 01 a 15)",
      faturamento: quinzena1.faturamento,
      pedidos: quinzena1.notas.size,
      ticketMedio: quinzena1.notas.size > 0 ? quinzena1.faturamento / quinzena1.notas.size : 0,
      percentual: faturamentoTotal > 0 ? (quinzena1.faturamento / faturamentoTotal) * 100 : 0,
    },
    {
      quinzena: "2ª Quinzena (Dias 16 em diante)",
      faturamento: quinzena2.faturamento,
      pedidos: quinzena2.notas.size,
      ticketMedio: quinzena2.notas.size > 0 ? quinzena2.faturamento / quinzena2.notas.size : 0,
      percentual: faturamentoTotal > 0 ? (quinzena2.faturamento / faturamentoTotal) * 100 : 0,
    },
  ];

  return {
    porDiaSemana,
    porQuinzena,
  };
}

export function analiseGeografica(vendas: VendaProduto[]): ItemGeograficoAnalise[] {
  const pracaMap = new Map<
    string,
    {
      cidade: string;
      uf: string;
      faturamento: number;
      frete: number;
      notas: Set<string>;
      clientes: Set<string>;
    }
  >();

  let faturamentoTotal = 0;

  for (const venda of vendas) {
    const cidade = venda.cliente_cidade?.trim() || "Não informada";
    const uf = venda.cliente_uf?.trim() || "—";
    const chave = `${cidade}|${uf}`;
    const total = valorItem(venda);
    const freteItem = paraNumero(venda.produto_vlr_frete);
    const chaveNota = chaveDaNota(venda);
    const cliente = venda.cliente_nome?.trim().toUpperCase();

    faturamentoTotal += total;

    let praca = pracaMap.get(chave);
    if (!praca) {
      praca = {
        cidade,
        uf,
        faturamento: 0,
        frete: 0,
        notas: new Set(),
        clientes: new Set(),
      };
      pracaMap.set(chave, praca);
    }

    praca.faturamento += total;
    praca.frete += freteItem;
    praca.notas.add(chaveNota);
    if (cliente) praca.clientes.add(cliente);
  }

  return [...pracaMap.values()]
    .map((p) => ({
      cidade: p.cidade,
      uf: p.uf,
      faturamento: p.faturamento,
      frete: p.frete,
      percentual: faturamentoTotal > 0 ? (p.faturamento / faturamentoTotal) * 100 : 0,
      pedidos: p.notas.size,
      clientes: p.clientes.size,
      ticketMedio: p.notas.size > 0 ? p.faturamento / p.notas.size : 0,
    }))
    .sort((a, b) => b.faturamento - a.faturamento);
}

export function analiseFinanceira(vendas: VendaProduto[]): {
  formasPagamento: ItemFinanceiroAnalise[];
  modelosDocumento: ItemFinanceiroAnalise[];
} {
  const fpMap = new Map<string, { faturamento: number; notas: Set<string> }>();
  const modMap = new Map<string, { faturamento: number; notas: Set<string> }>();

  let faturamentoTotal = 0;

  for (const venda of vendas) {
    const fp = venda.nf_forma_pagto?.trim() || "Não informado";
    const mod = venda.nf_modelo?.trim() ? `Modelo ${venda.nf_modelo.trim()}` : "Não informado";
    const total = valorItem(venda);
    const chaveNota = chaveDaNota(venda);

    faturamentoTotal += total;

    let atualFp = fpMap.get(fp);
    if (!atualFp) {
      atualFp = { faturamento: 0, notas: new Set() };
      fpMap.set(fp, atualFp);
    }
    atualFp.faturamento += total;
    atualFp.notas.add(chaveNota);

    let atualMod = modMap.get(mod);
    if (!atualMod) {
      atualMod = { faturamento: 0, notas: new Set() };
      modMap.set(mod, atualMod);
    }
    atualMod.faturamento += total;
    atualMod.notas.add(chaveNota);
  }

  const formasPagamento = [...fpMap.entries()]
    .map(([nome, dados]) => ({
      nome,
      total: dados.faturamento,
      percentual: faturamentoTotal > 0 ? (dados.faturamento / faturamentoTotal) * 100 : 0,
      pedidos: dados.notas.size,
      ticketMedio: dados.notas.size > 0 ? dados.faturamento / dados.notas.size : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const modelosDocumento = [...modMap.entries()]
    .map(([nome, dados]) => ({
      nome,
      total: dados.faturamento,
      percentual: faturamentoTotal > 0 ? (dados.faturamento / faturamentoTotal) * 100 : 0,
      pedidos: dados.notas.size,
      ticketMedio: dados.notas.size > 0 ? dados.faturamento / dados.notas.size : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return { formasPagamento, modelosDocumento };
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
          ? valorItem(venda)
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
    const total = valorItem(venda);
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
  const info = extrairDataInfo(data);
  if (!info) return 0;
  return Date.UTC(info.ano, info.mes - 1, info.dia);
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

// ==========================================
// Comparativos de período e concentração
// (métricas padrão de gestão comercial)
// ==========================================

export interface VariacoesPeriodoVendas {
  /** Tem dados do período anterior para comparar */
  temAnterior: boolean;
  faturamento: VariacaoMetrica;
  notas: VariacaoMetrica;
  ticketMedio: VariacaoMetrica;
  clientes: VariacaoMetrica;
  quantidadeItens: VariacaoMetrica;
}

/** Variação das métricas principais entre o período atual e o período anterior equivalente. */
export function calcularVariacoesPeriodo(
  vendasAtuais: VendaProduto[],
  vendasAnteriores: VendaProduto[],
): VariacoesPeriodoVendas {
  const atual = resumoVendas(vendasAtuais);
  const anterior = resumoVendas(vendasAnteriores);
  return {
    temAnterior: vendasAnteriores.length > 0,
    faturamento: calcularVariacao(atual.faturamento, anterior.faturamento),
    notas: calcularVariacao(atual.notas, anterior.notas),
    ticketMedio: calcularVariacao(atual.ticketMedio, anterior.ticketMedio),
    clientes: calcularVariacao(atual.clientes, anterior.clientes),
    quantidadeItens: calcularVariacao(atual.quantidadeItens, anterior.quantidadeItens),
  };
}

export interface ConcentracaoTop {
  topN: number;
  itensNoTop: number;
  faturamentoTop: number;
  faturamentoTotal: number;
  percentualTop: number;
}

/**
 * Soma do faturamento dos N maiores itens de um ranking já calculado
 * (clientes, produtos, departamentos...). Quanto maior o % no Top 10,
 * maior a dependência da receita em poucos itens.
 */
export function concentracaoTopN<T extends { faturamento: number }>(
  itens: T[],
  topN: number,
  faturamentoTotal?: number,
): ConcentracaoTop {
  const ordenados = [...itens].sort((a, b) => b.faturamento - a.faturamento);
  const top = ordenados.slice(0, topN);
  const faturamentoTop = top.reduce((soma, item) => soma + item.faturamento, 0);
  const total = faturamentoTotal ?? itens.reduce((soma, item) => soma + item.faturamento, 0);
  return {
    topN,
    itensNoTop: top.length,
    faturamentoTop,
    faturamentoTotal: total,
    percentualTop: total > 0 ? (faturamentoTop / total) * 100 : 0,
  };
}

export interface ClientesNovosRecorrentes {
  /** Clientes ativos no período atual (exclui consumidor/balcão genérico) */
  ativosAtual: number;
  /** Clientes que não compraram no período anterior (base nova) */
  novos: number;
  /** Clientes que compraram nos dois períodos */
  recorrentes: number;
  /** Clientes do período anterior que não compraram no atual (inatividade) */
  inativos: number;
  /** Faturamento atual vindo de clientes novos */
  receitaNovos: number;
  /** Faturamento atual vindo de clientes recorrentes */
  receitaRecorrentes: number;
  /** % do faturamento (clientes cadastrados) vindo de recorrentes */
  percentualReceitaRecorrentes: number;
}

/** Chave canônica de cliente (ignora consumidor genérico de balcão). */
function chaveClienteCadastrado(nome: string | null | undefined): string | null {
  if (!nome) return null;
  const chave = nome.trim().toUpperCase();
  if (isClienteConsumidorGenerico(chave)) return null;
  return chave;
}

/**
 * Separa a base de clientes do período atual entre novos e recorrentes,
 * comparando com o período anterior equivalente. Clientes de balcão
 * (CONSUMIDOR etc.) ficam de fora por não representarem um cadastro.
 */
export function analiseClientesNovosRecorrentes(
  vendasAtuais: VendaProduto[],
  vendasAnteriores: VendaProduto[],
): ClientesNovosRecorrentes {
  const baseAnterior = new Set<string>();
  let receitaAnterior = 0;
  for (const venda of vendasAnteriores) {
    const chave = chaveClienteCadastrado(venda.cliente_nome);
    if (!chave) continue;
    baseAnterior.add(chave);
    receitaAnterior += valorItem(venda);
  }

  const ativosAtual = new Set<string>();
  const novos = new Set<string>();
  const recorrentes = new Set<string>();
  let receitaNovos = 0;
  let receitaRecorrentes = 0;

  for (const venda of vendasAtuais) {
    const chave = chaveClienteCadastrado(venda.cliente_nome);
    if (!chave) continue;
    ativosAtual.add(chave);
    const totalItem = valorItem(venda);
    if (baseAnterior.has(chave)) {
      recorrentes.add(chave);
      receitaRecorrentes += totalItem;
    } else {
      novos.add(chave);
      receitaNovos += totalItem;
    }
  }

  let inativos = 0;
  if (vendasAnteriores.length > 0) {
    for (const chave of baseAnterior) {
      if (!ativosAtual.has(chave)) inativos++;
    }
  }

  const receitaCadastrados = receitaNovos + receitaRecorrentes;

  return {
    ativosAtual: ativosAtual.size,
    novos: novos.size,
    recorrentes: recorrentes.size,
    inativos: receitaAnterior > 0 ? inativos : 0,
    receitaNovos,
    receitaRecorrentes,
    percentualReceitaRecorrentes:
      receitaCadastrados > 0 ? (receitaRecorrentes / receitaCadastrados) * 100 : 0,
  };
}

export interface CrescimentoProduto {
  id: string;
  produto: string;
  totalAtual: number;
  totalAnterior: number;
  variacao: VariacaoMetrica;
}

function agregaReceitaPorProduto(vendas: VendaProduto[]): Map<string, { id: string; produto: string; total: number }> {
  const mapa = new Map<string, { id: string; produto: string; total: number }>();
  for (const venda of vendas) {
    const id = String(venda.produto_id ?? "").trim() || "SEM-COD";
    const produto = venda.produto_descricao?.trim() || "Produto não identificado";
    const chave = `${id}|${produto}`;
    const atual = mapa.get(chave) ?? { id, produto, total: 0 };
    atual.total += valorItem(venda);
    mapa.set(chave, atual);
  }
  return mapa;
}

/**
 * Produtos presentes nos dois períodos com maior crescimento de receita
 * em R$ (período atual vs. anterior). Só considera produtos comparáveis
 * (venderam nos dois períodos) para não distorcer com lançamentos novos.
 */
export function maioresCrescimentosProdutos(
  vendasAtuais: VendaProduto[],
  vendasAnteriores: VendaProduto[],
  limite = 5,
): CrescimentoProduto[] {
  const atualMap = agregaReceitaPorProduto(vendasAtuais);
  const anteriorMap = agregaReceitaPorProduto(vendasAnteriores);

  const crescimentos: CrescimentoProduto[] = [];
  for (const [chave, atual] of atualMap) {
    const anterior = anteriorMap.get(chave);
    if (!anterior || anterior.total <= 0) continue;
    crescimentos.push({
      id: atual.id,
      produto: atual.produto,
      totalAtual: atual.total,
      totalAnterior: anterior.total,
      variacao: calcularVariacao(atual.total, anterior.total),
    });
  }

  return crescimentos
    .filter((item) => item.variacao.diferenca > 0)
    .sort((a, b) => b.variacao.diferenca - a.variacao.diferenca)
    .slice(0, limite);
}

// ==========================================
// Distribuição geográfica por UF
// ==========================================

export interface ItemUFVendas {
  uf: string;
  faturamento: number;
  frete: number;
  percentual: number;
  pedidos: number;
  clientes: number;
  cidades: number;
  ticketMedio: number;
}

/** Distribuição das vendas por UF — o mesmo dado de cidades, agregado por estado. */
export function analiseUFs(vendas: VendaProduto[]): ItemUFVendas[] {
  const porUf = new Map<
    string,
    { uf: string; faturamento: number; frete: number; notas: Set<string>; clientes: Set<string>; cidades: Set<string> }
  >();
  let faturamentoTotal = 0;

  for (const venda of vendas) {
    const total = valorItem(venda);
    const uf = venda.cliente_uf?.trim().toUpperCase() || "—";
    faturamentoTotal += total;

    const atual = porUf.get(uf) ?? { uf, faturamento: 0, frete: 0, notas: new Set(), clientes: new Set(), cidades: new Set() };
    atual.faturamento += total;
    atual.frete += paraNumero(venda.produto_vlr_frete);
    atual.notas.add(chaveDaNota(venda));
    if (venda.cliente_nome?.trim()) atual.clientes.add(venda.cliente_nome.trim().toUpperCase());
    if (venda.cliente_cidade?.trim()) atual.cidades.add(venda.cliente_cidade.trim());
    porUf.set(uf, atual);
  }

  return [...porUf.values()]
    .map((dados) => {
      const pedidos = dados.notas.size;
      return {
        uf: dados.uf,
        faturamento: dados.faturamento,
        frete: dados.frete,
        percentual: faturamentoTotal > 0 ? (dados.faturamento / faturamentoTotal) * 100 : 0,
        pedidos,
        clientes: dados.clientes.size,
        cidades: dados.cidades.size,
        ticketMedio: pedidos > 0 ? dados.faturamento / pedidos : 0,
      };
    })
    .sort((a, b) => b.faturamento - a.faturamento);
}
