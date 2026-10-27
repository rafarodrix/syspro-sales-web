import { describe, expect, it } from "vitest";
import { dividirPeriodoKardex, montarRelatorioCompras } from "@/lib/relatorio-compras";
import type { MovimentoKardex } from "@/lib/kardex";
import type { VendaProduto } from "@/lib/syspro-api";

function venda(codigo: string, quantidade: number, descricao = `Produto ${codigo}`) {
  return {
    produto_id: codigo,
    produto_codigo_auxiliar: codigo,
    produto_descricao: descricao,
    produto_un: "UN",
    produto_qtde: quantidade,
    produto_vlr_total_liquido: quantidade * 10,
  } as VendaProduto;
}

function movimento(
  codigo: string,
  data: string,
  grupo: string,
  quantidade: number,
  saldo: number,
  valorTotal = 0,
) {
  return {
    produtoIdProduto: codigo,
    produtoCodigoAuxiliar: codigo,
    produtoDescricao: `Produto ${codigo}`,
    dataMovimento: data,
    grupoDocumento: grupo,
    quantidadeMovimentada: quantidade,
    valorTotal,
    saldo,
  } as MovimentoKardex;
}

describe("relatorio de compras", () => {
  it("combina vendas, devolucoes EDV e o saldo do movimento mais recente", () => {
    const relatorio = montarRelatorioCompras(
      [venda("SP1002A", 20), venda("SP1002A", 12), venda("SK202", 8)],
      [
        movimento("SP1002A", "2026-09-10", "EDV", 3, 17, 45),
        movimento("SP1002A", "2026-10-15", "EVD", -1, 20),
        movimento("SK202", "2026-10-14", "EDV", 1, 8, 12),
      ],
      { inicial: "2026-08-01", final: "2026-10-16" },
    );

    expect(relatorio.itens[0]).toMatchObject({
      codigo: "SP1002A",
      quantidadeVendida: 32,
      quantidadeDevolvida: 3,
      quantidadeLiquidaReal: 29,
      demandaLiquida: 29,
      taxaDevolucao: 9.375,
      valorVendido: 320,
      valorDevolvido: 45,
      valorVendaLiquida: 275,
      estoqueAtual: 20,
      dataUltimoMovimento: "2026-10-15",
      curva: "A",
    });
    expect(relatorio.resumo).toMatchObject({
      totalProdutos: 2,
      quantidadeVendida: 40,
      quantidadeDevolvida: 4,
      quantidadeLiquidaReal: 36,
      demandaLiquida: 36,
      taxaDevolucao: 10,
      valorVendido: 400,
      valorDevolvido: 57,
      valorVendaLiquida: 343,
      taxaDevolucaoValor: expect.closeTo(14.25, 5),
      produtosSemSaldo: 0,
      produtosSemSaldoLocalizado: 0,
    });
  });

  it("usa exclusivamente o último movimento do grupo de estoque definido na empresa", () => {
    const relatorio = montarRelatorioCompras(
      [venda("PROD-1", 5)],
      [
        { ...movimento("PROD-1", "2026-10-20", "EVP", -1, 90), grupoEstoque: "GERAL" },
        { ...movimento("PROD-1", "2026-10-18", "ENP", -1, 12), grupoEstoque: " furo " },
        { ...movimento("PROD-1", "2026-10-21", "EPD", 1, 15), grupoEstoque: "FURO" },
      ],
      { inicial: "2026-10-01", final: "2026-10-31" },
      { grupoEstoquePadrao: "Furo" },
    );

    expect(relatorio.itens[0]).toMatchObject({
      estoqueAtual: 15,
      dataUltimoMovimento: "2026-10-21",
    });
  });

  it("não relaciona venda e Kardex apenas pelo código auxiliar", () => {
    const itemVendido = {
      ...venda("{47E770D8-EE38-474E-AFF3-3A1A51E3EDC4}", 10, "Água desmineralizada"),
      produto_codigo_auxiliar: "1263",
    };
    const relatorio = montarRelatorioCompras(
      [itemVendido],
      [{
        ...movimento("OUTRO-ID", "2026-10-10", "EDV", 2, 8, 20),
        produtoCodigoAuxiliar: "1263",
      }],
      { inicial: "2026-10-01", final: "2026-10-31" },
    );

    expect(relatorio.itens[0]).toMatchObject({
      codigo: "1263",
      quantidadeDevolvida: 0,
      quantidadeLiquidaReal: 10,
      estoqueAtual: null,
    });
  });

  it("não usa descrição como compatibilidade entre IDs diferentes", () => {
    const relatorio = montarRelatorioCompras(
      [venda("{47E770D8-EE38-474E-AFF3-3A1A51E3EDC4}", 10, "Água  desmineralizada")],
      [{
        ...movimento("OUTRO-ID", "2026-10-10", "EDV", 2, 8, 20),
        produtoCodigoAuxiliar: "1263",
        produtoDescricao: "AGUA DESMINERALIZADA",
      }],
      { inicial: "2026-10-01", final: "2026-10-31" },
    );

    expect(relatorio.itens[0]).toMatchObject({ quantidadeDevolvida: 0, estoqueAtual: null });
  });

  it("relaciona por ID e expõe marca e custos médios", () => {
    const relatorio = montarRelatorioCompras(
      [{
        ...venda("AUX-1", 2, "Produto com marca"),
        produto_id: "GUID-1",
        produto_codigo_auxiliar: "AUX-1",
        produto_vlr_custo_aquisicao: 10,
        produto_vlr_custo_reposicao: 12,
      }],
      [{
        ...movimento("OUTRO-AUX", "2026-10-10", "EVD", -1, 8),
        produtoIdProduto: "GUID-1",
        produtoMarca: "MARCA TESTE",
      }],
      { inicial: "2026-10-01", final: "2026-10-31" },
    );

    expect(relatorio.itens[0]).toMatchObject({
      produtoId: "GUID-1",
      marca: "MARCA TESTE",
      custoAquisicaoMedio: 10,
      custoReposicaoMedio: 12,
      estoqueAtual: 8,
    });
  });
  it("calcula custo total das mercadorias e margem com custo de reposição", () => {
    const relatorio = montarRelatorioCompras(
      [{
        ...venda("AUX-9", 10, "Produto margem"),
        produto_id: "GUID-9",
        produto_codigo_auxiliar: "AUX-9",
        produto_vlr_total_liquido: 200,
        produto_vlr_custo_aquisicao: 10,
        produto_vlr_custo_reposicao: 15,
      }],
      [],
      { inicial: "2026-10-01", final: "2026-10-31" },
    );

    expect(relatorio.itens[0]).toMatchObject({
      custoReposicaoMedio: 15,
      custoTotalMercadorias: 150,
      margemBrutaPercentual: 25,
    });
    expect(relatorio.resumo).toMatchObject({
      custoTotalMercadorias: 150,
      valorVendaLiquida: 200,
      margemBruta: 50,
      margemBrutaPercentual: 25,
      coberturaCusto: 100,
    });
  });

  it("mantém custo total e margem nulos quando a API não informa custo", () => {
    const relatorio = montarRelatorioCompras(
      [{
        ...venda("AUX-8", 4, "Produto sem custo"),
        produto_id: "GUID-8",
        produto_vlr_total_liquido: 120,
      }],
      [],
      { inicial: "2026-10-01", final: "2026-10-31" },
    );

    expect(relatorio.itens[0].custoTotalMercadorias).toBeNull();
    expect(relatorio.itens[0].margemBrutaPercentual).toBeNull();
    expect(relatorio.resumo.coberturaCusto).toBe(0);
  });

  it("não usa custo de aquisição como fallback da margem", () => {
    const relatorio = montarRelatorioCompras(
      [{
        ...venda("AUX-SEM-REP", 4, "Produto apenas com aquisição"),
        produto_id: "GUID-SEM-REP",
        produto_vlr_total_liquido: 120,
        produto_vlr_custo_aquisicao: 7,
      }],
      [],
      { inicial: "2026-10-01", final: "2026-10-31" },
    );

    expect(relatorio.itens[0]).toMatchObject({
      custoAquisicaoMedio: 7,
      custoReposicaoMedio: null,
      custoTotalMercadorias: null,
      margemBrutaPercentual: null,
    });
    expect(relatorio.resumo.coberturaCusto).toBe(0);
  });

  it("valoriza o estoque atual pelo custo de aquisição e de reposição", () => {
    const relatorio = montarRelatorioCompras(
      [{
        ...venda("AUX-6", 10, "Produto com estoque"),
        produto_id: "GUID-6",
        produto_codigo_auxiliar: "AUX-6",
        produto_vlr_total_liquido: 200,
        produto_vlr_custo_aquisicao: 10,
        produto_vlr_custo_reposicao: 15,
      }],
      [movimento("GUID-6", "2026-10-10", "EVP", -40, 40)],
      { inicial: "2026-10-01", final: "2026-10-31" },
    );

    expect(relatorio.itens[0]).toMatchObject({
      estoqueAtual: 40,
      custoEstoqueAquisicao: 400,
      custoEstoqueReposicao: 600,
    });
    expect(relatorio.resumo).toMatchObject({
      custoEstoqueAquisicao: 400,
      custoEstoqueReposicao: 600,
    });
  });

  it("mantém valores de estoque nulos quando não há saldo localizado", () => {
    const relatorio = montarRelatorioCompras(
      [{
        ...venda("AUX-5", 3, "Produto sem saldo"),
        produto_id: "GUID-5",
        produto_vlr_custo_aquisicao: 7,
        produto_vlr_custo_reposicao: 9,
      }],
      [],
      { inicial: "2026-10-01", final: "2026-10-31" },
    );

    expect(relatorio.itens[0].custoEstoqueAquisicao).toBeNull();
    expect(relatorio.itens[0].custoEstoqueReposicao).toBeNull();
    expect(relatorio.resumo.custoEstoqueAquisicao).toBe(0);
    expect(relatorio.resumo.custoEstoqueReposicao).toBe(0);
  });

  it("não deixa a cobertura de custo passar de 100% com produto só de devolução", () => {
    const relatorio = montarRelatorioCompras(
      [{
        ...venda("AUX-7", 5, "Produto com venda"),
        produto_id: "GUID-7",
        produto_codigo_auxiliar: "AUX-7",
        produto_vlr_total_liquido: 100,
        produto_vlr_custo_reposicao: 8,
      }],
      [
        { ...movimento("GUID-SEM-VENDA", "2026-10-10", "EDV", 3, 4, 30), produtoIdProduto: "GUID-SEM-VENDA" },
      ],
      { inicial: "2026-10-01", final: "2026-10-31" },
    );

    expect(relatorio.resumo.coberturaCusto).toBeLessThanOrEqual(100);
    expect(relatorio.resumo.coberturaCusto).toBe(100);
  });

  it("nao soma EDV fora do periodo de vendas, mas usa o movimento no saldo atual", () => {
    const relatorio = montarRelatorioCompras(
      [venda("10", 5)],
      [movimento("10", "2026-10-10", "EDV", 2, 9, 20)],
      { inicial: "2026-09-01", final: "2026-09-30" },
    );

    expect(relatorio.itens[0]).toMatchObject({ quantidadeDevolvida: 0, estoqueAtual: 9 });
  });

  it("classifica como C quando as devolucoes anulam toda a demanda", () => {
    const relatorio = montarRelatorioCompras(
      [venda("10", 5)],
      [movimento("10", "2026-10-10", "EDV", 5, 5, 50)],
      { inicial: "2026-10-01", final: "2026-10-10" },
    );

    expect(relatorio.itens[0]).toMatchObject({ demandaLiquida: 0, curva: "C" });
  });

  it("ignora EDC porque representa devolução de compra", () => {
    const relatorio = montarRelatorioCompras(
      [venda("10", 5)],
      [movimento("10", "2026-10-10", "EDC", 2, 9, 20)],
      { inicial: "2026-10-01", final: "2026-10-10" },
    );

    expect(relatorio.itens[0]).toMatchObject({
      quantidadeDevolvida: 0,
      quantidadeLiquidaReal: 5,
      valorDevolvido: 0,
      demandaLiquida: 5,
      valorVendaLiquida: 50,
    });
  });

  it("inclui EDV mesmo quando o produto não teve venda no período", () => {
    const relatorio = montarRelatorioCompras(
      [],
      [movimento("DEV-1", "2026-10-10", "EDV", 2, 7, 35)],
      { inicial: "2026-10-01", final: "2026-10-10" },
    );

    expect(relatorio.itens[0]).toMatchObject({
      codigo: "DEV-1",
      quantidadeVendida: 0,
      quantidadeDevolvida: 2,
      quantidadeLiquidaReal: -2,
      demandaLiquida: 0,
      valorVendido: 0,
      valorDevolvido: 35,
      valorVendaLiquida: -35,
      curva: "C",
    });
    expect(relatorio.resumo).toMatchObject({
      valorVendido: 0,
      valorDevolvido: 35,
      valorVendaLiquida: -35,
      quantidadeLiquidaReal: -2,
    });
  });

  it("calcula demanda, cobertura e separa estoque zerado de saldo não localizado", () => {
    const relatorio = montarRelatorioCompras(
      [venda("A", 10), venda("B", 5)],
      [movimento("A", "2026-10-10", "EVD", -1, 0)],
      { inicial: "2026-10-01", final: "2026-10-10" },
    );

    expect(relatorio.itens.find((item) => item.codigo === "A")).toMatchObject({
      demandaLiquida: 10,
      mediaDiaria: 1,
      coberturaDias: 0,
    });
    expect(relatorio.itens.find((item) => item.codigo === "B")?.coberturaDias).toBeNull();
    expect(relatorio.resumo).toMatchObject({
      produtosSemSaldo: 1,
      produtosSemSaldoLocalizado: 1,
    });
  });

  it("divide consultas longas em janelas inclusivas de no maximo 31 dias", () => {
    expect(dividirPeriodoKardex("2026-07-19", "2026-10-16")).toEqual([
      { inicial: "2026-07-19", final: "2026-08-18" },
      { inicial: "2026-08-19", final: "2026-09-18" },
      { inicial: "2026-09-19", final: "2026-10-16" },
    ]);
  });

  it("aceita datas no formato DD/MM/AAAA sem perder as janelas do Kardex", () => {
    expect(dividirPeriodoKardex("01/10/2026", "19/10/2026")).toEqual([
      { inicial: "2026-10-01", final: "2026-10-19" },
    ]);
  });
});
