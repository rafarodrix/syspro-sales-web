import { describe, expect, it } from "vitest";
import type { VendaProduto } from "@/lib/syspro-api";
import {
  agruparVendasPorNota,
  analiseDescontos,
  analiseEmpresas,
  analiseEvolucaoVendas,
  analiseProdutosPorDimensao,
  analiseClientesNovosRecorrentes,
  analiseContribuicaoVariacao,
  analiseDescontoSemRetorno,
  analiseDriversVendedores,
  classeAPerdendoParticipacao,
  mudancaMixTopProdutos,
  analiseUFs,
  analiseSazonalidade,
  calcularVariacao,
  calcularVariacoesPeriodo,
  dadosPorMetricaComparativa,
  concentracaoTopN,
  resumoVendas,
  maioresCrescimentosProdutos,
  valorItem,
} from "@/lib/vendas";
import { periodoConsultaValido } from "@/lib/sales-service";
import { resolverEmpresaSelecionada } from "@/lib/empresa-selecao";

function vendaBase(campos: Partial<VendaProduto> = {}): VendaProduto {
  return {
    empresa_codigo: "1",
    nf_numero: "100",
    cliente_nome: "Cliente",
    cliente_cidade: "Belo Horizonte",
    cliente_uf: "MG",
    produto_id: "P1",
    produto_descricao: "Produto",
    produto_departamento: "Geral",
    produto_un: "UN",
    produto_qtde: 1,
    produto_vlr_item: 100,
    produto_vlr_icms_stb: 0,
    produto_vlr_desconto: 10,
    produto_vlr_frete: 5,
    produto_vlr_total_item: 100,
    vendedor_nome: "Vendedor",
    nf_dt_emissao: "2026-09-01",
    nf_modelo: "55",
    nf_forma_pagto: "PIX",
    ...campos,
  };
}

describe("cálculos de vendas", () => {
  it("preserva uma seleção consolidada personalizada de empresas autorizadas", () => {
    const empresas = [{ id: "a" }, { id: "b" }];
    expect(resolverEmpresaSelecionada("a,b", empresas)).toBe("a,b");
    expect(resolverEmpresaSelecionada("a,invalida", empresas)).toBe("a");
  });

  it("usa o valor líquido informado pela API", () => {
    expect(valorItem(vendaBase({ produto_vlr_total_liquido: 91 }))).toBe(91);
  });

  it("recompõe o líquido quando a API não fornece esse campo", () => {
    const venda = vendaBase({
      produto_vlr_total_liquido: undefined,
      produto_vlr_seguro: 2,
      produto_vlr_outros: 3,
    });
    expect(valorItem(venda)).toBe(100);
  });

  it("usa o mesmo cálculo ao agrupar os itens de uma nota", () => {
    const notas = agruparVendasPorNota([
      vendaBase({ produto_vlr_total_liquido: undefined }),
      vendaBase({ produto_id: "P2", produto_vlr_total_liquido: 50 }),
    ]);
    expect(notas).toHaveLength(1);
    expect(notas[0].total).toBe(145);
  });

  it("rejeita datas inexistentes antes de consultar o Syspro", () => {
    expect(periodoConsultaValido("31/02/2026", "01/03/2026")).toBe(false);
    expect(periodoConsultaValido("01/09/2026", "30/09/2026")).toBe(true);
  });
});

describe("métricas de gestão (comparativo e concentração)", () => {
  it("consolida a evolução por data e por mês de emissão", () => {
    const resultado = analiseEvolucaoVendas([
      vendaBase({ nf_numero: "1", nf_dt_emissao: "2026-09-02", produto_vlr_total_liquido: 200, produto_vlr_desconto: 20 }),
      vendaBase({ nf_numero: "2", nf_dt_emissao: "2026-09-01", produto_vlr_total_liquido: 100, produto_vlr_desconto: 10 }),
      vendaBase({ nf_numero: "3", nf_dt_emissao: "inválida", produto_vlr_total_liquido: 300 }),
    ]);

    expect(resultado.diario).toEqual([
      expect.objectContaining({ periodo: "2026-09-01", faturamento: 100, pedidos: 1, descontos: 10 }),
      expect.objectContaining({ periodo: "2026-09-02", faturamento: 200, pedidos: 1, descontos: 20 }),
    ]);
    expect(resultado.mensal).toEqual([
      expect.objectContaining({ periodo: "2026-09", faturamento: 300, pedidos: 2, descontos: 30 }),
    ]);
  });

  it("separa empresas e não mistura NFs de mesmo número na consolidação", () => {
    const resultado = analiseEmpresas([
      vendaBase({ empresa_codigo: "1", nf_numero: "100", produto_vlr_total_liquido: 100 }),
      vendaBase({ empresa_codigo: "2", nf_numero: "100", produto_vlr_total_liquido: 200 }),
    ]);

    expect(resultado).toHaveLength(2);
    expect(resultado).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "1", faturamento: 100, pedidos: 1, percentual: expect.closeTo(33.33, 1) }),
      expect.objectContaining({ id: "2", faturamento: 200, pedidos: 1, percentual: expect.closeTo(66.67, 1) }),
    ]));
  });

  it("consolida produtos dentro de cada cliente ou vendedor", () => {
    const vendas = [
      vendaBase({ nf_numero: "1", cliente_nome: "Cliente A", vendedor_nome: "Vendedor A", produto_id: "P1", produto_vlr_total_liquido: 100, produto_qtde: 2 }),
      vendaBase({ nf_numero: "2", cliente_nome: "Cliente A", vendedor_nome: "Vendedor A", produto_id: "P1", produto_vlr_total_liquido: 50, produto_qtde: 1 }),
    ];

    expect(analiseProdutosPorDimensao(vendas, "cliente")[0]).toMatchObject({ dimensao: "Cliente A", produtoId: "P1", pedidos: 2, quantidade: 3, faturamento: 150 });
    expect(analiseProdutosPorDimensao(vendas, "vendedor")[0]).toMatchObject({ dimensao: "Vendedor A", produtoId: "P1", pedidos: 2, quantidade: 3, faturamento: 150 });
  });

  it("agrupa descontos também pela forma de pagamento da nota", () => {
    const relatorio = analiseDescontos([
      vendaBase({ nf_forma_pagto: "PIX", produto_vlr_desconto: 10 }),
      vendaBase({ nf_numero: "101", nf_forma_pagto: "Cartão", produto_vlr_desconto: 20 }),
    ]);

    expect(relatorio.porFormaPagamento).toEqual(expect.arrayContaining([
      expect.objectContaining({ nome: "PIX", desconto: 10, pedidos: 1 }),
      expect.objectContaining({ nome: "Cartão", desconto: 20, pedidos: 1 }),
    ]));
  });

  it("calcula variação de faturamento, notas, ticket e clientes entre períodos", () => {
    const atual = [vendaBase({ nf_numero: "1", cliente_nome: "CLIENTE A", produto_vlr_total_liquido: 200 })];
    const anterior = [vendaBase({ nf_numero: "2", cliente_nome: "CLIENTE A", produto_vlr_total_liquido: 100 })];

    const variacoes = calcularVariacoesPeriodo(atual, anterior);

    expect(variacoes.temAnterior).toBe(true);
    expect(variacoes.faturamento.diferenca).toBe(100);
    expect(variacoes.faturamento.percentual).toBe(100);
    expect(variacoes.notas.diferenca).toBe(0);
    expect(variacoes.clientes.diferenca).toBe(0);
  });

  it("soma corretamente a concentração do Top N em um ranking", () => {
    const ranking = [
      { nome: "C1", faturamento: 500 },
      { nome: "C2", faturamento: 300 },
      { nome: "C3", faturamento: 200 },
    ];

    expect(concentracaoTopN(ranking, 2).percentualTop).toBe(80);
    expect(concentracaoTopN(ranking, 2).faturamentoTop).toBe(800);
    expect(concentracaoTopN(ranking, 10).itensNoTop).toBe(3);
    expect(concentracaoTopN([], 5).percentualTop).toBe(0);
  });

  it("separa clientes novos, recorrentes e inativos comparando os períodos", () => {
    const anterior = [
      vendaBase({ nf_numero: "1", cliente_nome: "CLIENTE ANTIGO", produto_vlr_total_liquido: 100 }),
      vendaBase({ nf_numero: "2", cliente_nome: "CONSUMIDOR FINAL", produto_vlr_total_liquido: 50 }),
    ];
    const atual = [
      vendaBase({ nf_numero: "3", cliente_nome: "CLIENTE ANTIGO", produto_vlr_total_liquido: 150 }),
      vendaBase({ nf_numero: "4", cliente_nome: "CLIENTE NOVO", produto_vlr_total_liquido: 80 }),
    ];

    const resultado = analiseClientesNovosRecorrentes(atual, anterior);

    expect(resultado.recorrentes).toBe(1);
    expect(resultado.novos).toBe(1);
    expect(resultado.inativos).toBe(0);
    expect(resultado.ativosAtual).toBe(2);
    expect(resultado.receitaRecorrentes).toBe(150);
    expect(resultado.receitaNovos).toBe(80);
    expect(resultado.percentualReceitaRecorrentes).toBeCloseTo(65.22, 1);
  });

  it("aponta os produtos com maior crescimento de receita entre períodos", () => {
    const atual = [
      vendaBase({ nf_numero: "1", produto_id: "P1", produto_descricao: "Produto Um", produto_vlr_total_liquido: 200 }),
      vendaBase({ nf_numero: "2", produto_id: "P2", produto_descricao: "Produto Dois", produto_vlr_total_liquido: 300 }),
      vendaBase({ nf_numero: "3", produto_id: "P3", produto_descricao: "Produto Novo", produto_vlr_total_liquido: 500 }),
    ];
    const anterior = [
      vendaBase({ nf_numero: "4", produto_id: "P1", produto_descricao: "Produto Um", produto_vlr_total_liquido: 50 }),
      vendaBase({ nf_numero: "5", produto_id: "P2", produto_descricao: "Produto Dois", produto_vlr_total_liquido: 400 }),
    ];

    const crescimentos = maioresCrescimentosProdutos(atual, anterior);

    expect(crescimentos).toHaveLength(1);
    expect(crescimentos[0].id).toBe("P1");
    expect(crescimentos[0].variacao.diferenca).toBe(150);
  });

  it("agrega as vendas por UF com faturamento, pedidos e clientes", () => {
    const vendas = [
      vendaBase({ nf_numero: "1", cliente_nome: "CLIENTE A", cliente_cidade: "Belo Horizonte", cliente_uf: "MG", produto_vlr_total_liquido: 100 }),
      vendaBase({ nf_numero: "2", cliente_nome: "CLIENTE B", cliente_cidade: "Uberlândia", cliente_uf: "MG", produto_vlr_total_liquido: 50 }),
      vendaBase({ nf_numero: "3", cliente_nome: "CLIENTE C", cliente_cidade: "São Paulo", cliente_uf: "sp", produto_vlr_total_liquido: 200 }),
    ];

    const ufs = analiseUFs(vendas);

    expect(ufs).toHaveLength(2);
    const mg = ufs.find((item) => item.uf === "MG");
    const sp = ufs.find((item) => item.uf === "SP");
    expect(mg?.faturamento).toBe(150);
    expect(mg?.pedidos).toBe(2);
    expect(mg?.clientes).toBe(2);
    expect(mg?.cidades).toBe(2);
    expect(sp?.faturamento).toBe(200);
    expect(sp?.percentual).toBeCloseTo(57.14, 1);
  });


  it("não representa base zero como crescimento de 100%", () => {
    const variacao = calcularVariacao(500, 0);
    expect(variacao.texto).toBe("Sem base");
    expect(variacao.semBase).toBe(true);
    expect(variacao.percentual).toBe(0);
  });

  it("calcula SKUs por pedido sem somar unidades físicas incompatíveis", () => {
    const vendas = [
      vendaBase({
        nf_numero: "1",
        produto_id: "P1",
        produto_un: "UN",
        produto_qtde: 10,
      }),
      vendaBase({
        nf_numero: "1",
        produto_id: "P2",
        produto_un: "KG",
        produto_qtde: 25,
      }),
      vendaBase({
        nf_numero: "2",
        produto_id: "P1",
        produto_un: "UN",
        produto_qtde: 5,
      }),
    ];

    const resumo = resumoVendas(vendas);
    expect(resumo.notas).toBe(2);
    expect(resumo.skusPorNota).toBe(1.5);
  });

  it("normaliza sazonalidade por quantidade de ocorrências no calendário", () => {
    const vendas = [
      vendaBase({
        nf_numero: "1",
        nf_dt_emissao: "2026-09-07",
        produto_vlr_total_liquido: 100,
      }),
      vendaBase({
        nf_numero: "2",
        nf_dt_emissao: "2026-09-14",
        produto_vlr_total_liquido: 300,
      }),
      vendaBase({
        nf_numero: "3",
        nf_dt_emissao: "2026-09-01",
        produto_vlr_total_liquido: 500,
      }),
    ];

    const resultado = analiseSazonalidade(vendas, {
      inicial: "2026-09-01",
      final: "2026-09-30",
    });
    const segunda = resultado.porDiaSemana.find(
      (item) => item.dia === "Segunda-feira",
    );
    const terca = resultado.porDiaSemana.find(
      (item) => item.dia === "Terça-feira",
    );

    expect(segunda?.ocorrencias).toBe(4);
    expect(segunda?.faturamentoMedioPorOcorrencia).toBe(100);
    expect(terca?.ocorrencias).toBe(5);
    expect(terca?.faturamentoMedioPorOcorrencia).toBe(100);
  });

  it("preenche dias sem venda antes de alinhar séries comparativas", () => {
    const atual = [
      vendaBase({
        nf_numero: "1",
        nf_dt_emissao: "2026-10-01",
        produto_vlr_total_liquido: 100,
      }),
      vendaBase({
        nf_numero: "2",
        nf_dt_emissao: "2026-10-03",
        produto_vlr_total_liquido: 300,
      }),
    ];
    const anterior = [
      vendaBase({
        nf_numero: "3",
        nf_dt_emissao: "2026-09-01",
        produto_vlr_total_liquido: 50,
      }),
      vendaBase({
        nf_numero: "4",
        nf_dt_emissao: "2026-09-02",
        produto_vlr_total_liquido: 60,
      }),
      vendaBase({
        nf_numero: "5",
        nf_dt_emissao: "2026-09-03",
        produto_vlr_total_liquido: 70,
      }),
    ];

    const serie = dadosPorMetricaComparativa(
      atual,
      anterior,
      "faturamento",
      { inicial: "2026-10-01", final: "2026-10-03" },
      { inicial: "2026-09-01", final: "2026-09-03" },
    );

    expect(serie.map((item) => item.total)).toEqual([100, 0, 300]);
    expect(serie.map((item) => item.totalAnterior)).toEqual([50, 60, 70]);
  });


  it("explica a variação de receita por cliente sem incluir consumidor genérico", () => {
    const atual = [
      vendaBase({ nf_numero: "1", cliente_nome: "CLIENTE A", produto_vlr_total_liquido: 200 }),
      vendaBase({ nf_numero: "2", cliente_nome: "CLIENTE B", produto_vlr_total_liquido: 80 }),
      vendaBase({ nf_numero: "3", cliente_nome: "CONSUMIDOR FINAL", produto_vlr_total_liquido: 500 }),
    ];
    const anterior = [
      vendaBase({ nf_numero: "4", cliente_nome: "CLIENTE A", produto_vlr_total_liquido: 100 }),
      vendaBase({ nf_numero: "5", cliente_nome: "CLIENTE C", produto_vlr_total_liquido: 120 }),
    ];

    const resultado = analiseContribuicaoVariacao(
      atual,
      anterior,
      "cliente",
    );

    expect(resultado.crescimento[0]).toMatchObject({
      nome: "CLIENTE A",
      diferenca: 100,
    });
    expect(resultado.queda[0]).toMatchObject({
      nome: "CLIENTE C",
      diferenca: -120,
    });
    expect(
      [...resultado.crescimento, ...resultado.queda].some((item) =>
        item.nome.includes("CONSUMIDOR"),
      ),
    ).toBe(false);
  });

  it("classifica crescimento de vendedor por volume e sinaliza ticket em queda", () => {
    const anterior = [
      vendaBase({ nf_numero: "1", vendedor_nome: "VENDEDOR A", produto_vlr_total_liquido: 100 }),
      vendaBase({ nf_numero: "2", vendedor_nome: "VENDEDOR A", produto_vlr_total_liquido: 100 }),
    ];
    const atual = [
      vendaBase({ nf_numero: "3", vendedor_nome: "VENDEDOR A", produto_vlr_total_liquido: 80 }),
      vendaBase({ nf_numero: "4", vendedor_nome: "VENDEDOR A", produto_vlr_total_liquido: 80 }),
      vendaBase({ nf_numero: "5", vendedor_nome: "VENDEDOR A", produto_vlr_total_liquido: 80 }),
    ];

    const resultado = analiseDriversVendedores(atual, anterior);
    expect(resultado[0]).toMatchObject({
      vendedor: "VENDEDOR A",
      driver: "volume",
      ticketEmQueda: true,
      diferencaFaturamento: 40,
    });
  });

  it("sinaliza aumento de desconto sem crescimento de receita", () => {
    const anterior = [
      vendaBase({
        nf_numero: "1",
        vendedor_nome: "VENDEDOR A",
        produto_vlr_total_liquido: 100,
        produto_vlr_desconto: 1,
      }),
    ];
    const atual = [
      vendaBase({
        nf_numero: "2",
        vendedor_nome: "VENDEDOR A",
        produto_vlr_total_liquido: 90,
        produto_vlr_desconto: 10,
      }),
    ];

    const alertas = analiseDescontoSemRetorno(atual, anterior);
    expect(alertas).toHaveLength(1);
    expect(alertas[0].vendedor).toBe("VENDEDOR A");
    expect(alertas[0].aumentoPp).toBeGreaterThan(1);
    expect(alertas[0].variacaoFaturamento).toBe(-10);
  });

  it("mede renovação do top de produtos e perda de participação na classe A", () => {
    const anterior = [
      vendaBase({ nf_numero: "1", produto_id: "A", produto_descricao: "A", produto_vlr_total_liquido: 800 }),
      vendaBase({ nf_numero: "2", produto_id: "B", produto_descricao: "B", produto_vlr_total_liquido: 150 }),
      vendaBase({ nf_numero: "3", produto_id: "C", produto_descricao: "C", produto_vlr_total_liquido: 50 }),
    ];
    const atual = [
      vendaBase({ nf_numero: "4", produto_id: "A", produto_descricao: "A", produto_vlr_total_liquido: 600 }),
      vendaBase({ nf_numero: "5", produto_id: "D", produto_descricao: "D", produto_vlr_total_liquido: 300 }),
      vendaBase({ nf_numero: "6", produto_id: "B", produto_descricao: "B", produto_vlr_total_liquido: 100 }),
    ];

    const mix = mudancaMixTopProdutos(atual, anterior, 3);
    expect(mix.itensNovosNoTop).toBe(1);
    expect(mix.renovacaoPercentual).toBeCloseTo(33.33, 1);

    const quedasA = classeAPerdendoParticipacao(atual, anterior);
    expect(quedasA.some((item) => item.id === "A")).toBe(true);
  });
});
