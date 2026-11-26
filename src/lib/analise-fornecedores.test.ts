import { describe, expect, it } from "vitest";

import { analisarFornecedores, concentracaoHhi, evolucaoFornecedores, rotuloConcentracao } from "@/lib/analise-fornecedores";

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
