import { describe, expect, it } from "vitest";

import {
  analisarFornecedores,
  concentracaoHhi,
  devolucoesPorFornecedor,
  evolucaoFornecedores,
  produtosPorFornecedor,
  rotuloConcentracao,
} from "@/lib/analise-fornecedores";

function venda(over: Record<string, unknown> = {}) {
  return {
    empresa_codigo: "1",
    nf_numero: "1",
    nf_dt_emissao: "2026-11-05",
    cliente_nome: "Cliente A",
    produto_id: "P1",
    produto_codigo_auxiliar: "P1",
    produto_descricao: "Produto",
    produto_departamento: "GERAL",
    produto_un: "UN",
    produto_qtde: 1,
    produto_vlr_item: 100,
    produto_vlr_total_item: 100,
    produto_vlr_total_liquido: 100,
    produto_vlr_desconto: 0,
    produto_vlr_custo_reposicao: 60,
    vendedor_nome: "V",
    fornecedor_nome: "Fornecedor X",
    ...over,
  } as never;
}

describe("análise por fornecedor", () => {
  it("consolida venda, desconto, lucro e margem por fornecedor", () => {
    const { linhas, resumo } = analisarFornecedores([
      venda({ fornecedor_nome: "Fornecedor X", produto_vlr_total_item: 100, produto_vlr_total_liquido: 90 }),
      venda({ fornecedor_nome: "fornecedor   x ", produto_codigo_auxiliar: "P2", produto_vlr_total_item: 100, produto_vlr_total_liquido: 100 }),
      venda({ fornecedor_nome: "Fornecedor Y", produto_vlr_total_item: 200, produto_vlr_total_liquido: 200 }),
    ]);

    expect(linhas).toHaveLength(2);
    const x = linhas.find((linha) => linha.fornecedor === "Fornecedor X")!;
    expect(x.valorLiquido).toBe(190);
    expect(x.descontos).toBe(0);
    // venda líquida pode ser maior que a bruta (frete/outros entram no líquido)
    expect(x.valorVendido).toBe(200);
    // bruto − descontos + acréscimos = líquido (conta visível na tabela)
    expect(x.valorVendido - x.descontos + x.acrescimos).toBeCloseTo(x.valorLiquido, 5);
    expect(x.skus).toBe(2);
    expect(x.margem).toBeCloseTo(((90 - 60) + (100 - 60)) / 190 * 100, 5);
    expect(resumo.fornecedoresAtivos).toBe(2);
    expect(resumo.vendaTotal).toBe(390);
  });

  it("separa itens sem fornecedor do cálculo de concentração", () => {
    const { linhas, resumo } = analisarFornecedores([
      venda({ fornecedor_nome: "" }),
      venda({ fornecedor_nome: "Fornecedor Y" }),
    ]);

    expect(linhas.map((linha) => linha.fornecedor)).toContain("Sem fornecedor informado");
    expect(resumo.itensSemFornecedor).toBe(1);
    expect(resumo.fornecedoresAtivos).toBe(1);
  });

  it("classifica concentração pelo HHI", () => {
    expect(concentracaoHhi([100])).toBe(10000);
    expect(rotuloConcentracao(10000)).toBe("Concentrada");
    expect(rotuloConcentracao(1800)).toBe("Moderada");
    expect(rotuloConcentracao(600)).toBe("Pulverizada");
  });

  it("monta a evolução mensal dos principais fornecedores", () => {
    const { meses, series } = evolucaoFornecedores([
      venda({ nf_dt_emissao: "2026-09-10", fornecedor_nome: "A", produto_vlr_total_liquido: 50 }),
      venda({ nf_dt_emissao: "2026-10-10", fornecedor_nome: "A", produto_vlr_total_liquido: 70 }),
      venda({ nf_dt_emissao: "2026-10-11", fornecedor_nome: "B", produto_vlr_total_liquido: 30 }),
    ]);

    expect(meses).toEqual(["2026-09", "2026-10"]);
    expect(series[0]).toEqual({ fornecedor: "A", valores: [50, 70] });
    expect(series[1]).toEqual({ fornecedor: "B", valores: [0, 30] });
  });
});

describe("curva ABC, produtos e devoluções por fornecedor", () => {
  function v(over: Record<string, unknown> = {}) {
    return {
      nf_dt_emissao: "2026-11-05",
      cliente_nome: "Cliente",
      produto_id: "P1",
      produto_codigo_auxiliar: "P1",
      produto_descricao: "Produto",
      produto_qtde: 1,
      produto_vlr_item: 100,
      produto_vlr_total_item: 100,
      produto_vlr_total_liquido: 100,
      produto_vlr_desconto: 0,
      produto_vlr_custo_reposicao: 60,
      fornecedor_nome: "A",
      ...over,
    } as never;
  }

  it("classifica fornecedores em A/B/C por participação acumulada", () => {
    const vendas = [
      v({ fornecedor_nome: "Grande", produto_vlr_total_liquido: 80 }),
      v({ fornecedor_nome: "Medio", produto_vlr_total_liquido: 15 }),
      v({ fornecedor_nome: "Pequeno", produto_vlr_total_liquido: 5 }),
    ];
    const { linhas } = analisarFornecedores(vendas);
    expect(linhas.map((linha) => [linha.fornecedor, linha.classe])).toEqual([
      ["Grande", "A"],
      ["Medio", "B"],
      ["Pequeno", "C"],
    ]);
    expect(linhas[0].participacaoAcumulada).toBeCloseTo(80, 0);
  });

  it("agrupa produtos por fornecedor somando quantidade e venda", () => {
    const mapa = produtosPorFornecedor([
      v({ fornecedor_nome: "A", produto_codigo_auxiliar: "X", produto_qtde: 2, produto_vlr_total_liquido: 50 }),
      v({ fornecedor_nome: "A", produto_codigo_auxiliar: "X", produto_qtde: 1, produto_vlr_total_liquido: 25 }),
      v({ fornecedor_nome: "B", produto_codigo_auxiliar: "Y", produto_vlr_total_liquido: 40 }),
    ]);
    const deA = mapa.get("A")!;
    expect(deA).toHaveLength(1);
    expect(deA[0].quantidade).toBe(3);
    expect(deA[0].venda).toBe(75);
    expect(mapa.get("B")![0].produto).toBe("Produto");
  });

  it("atribui devolução ao fornecedor e usa o vendido total na taxa", () => {
    const { linhas, vinculo, semVinculo } = devolucoesPorFornecedor(
      [
        { codigo: "X", valorVendido: 1000, valorDevolvido: 100 },
        { codigo: "ORFAO", valorVendido: 500, valorDevolvido: 50 },
        { codigo: "Z", valorVendido: 1000, valorDevolvido: 0 },
      ],
      [
        v({ fornecedor_nome: "A", produto_codigo_auxiliar: "X" }),
        v({ fornecedor_nome: "A", produto_codigo_auxiliar: "Z" }),
      ],
    );
    expect(vinculo).toBe(1);
    expect(semVinculo).toBe(1);
    expect(linhas[0].fornecedor).toBe("A");
    expect(linhas[0].devolvido).toBe(100);
    // 100 devolvido sobre 2.000 vendidos (X + Z), não sobre 1.000
    expect(linhas[0].vendido).toBe(2000);
    expect(linhas[0].taxa).toBeCloseTo(5, 5);
    // produto sem venda no período: aparece, mas sem base para taxa
    expect(linhas[1].fornecedor).toBe("Sem fornecedor informado");
    expect(linhas[1].taxa).toBeCloseTo(10, 5);
    expect(
      devolucoesPorFornecedor([{ codigo: "NAO-VENDIDO", valorVendido: 0, valorDevolvido: 50 }], []).linhas[0].taxa,
    ).toBeNull();
  });
});
