import { describe, expect, it } from "vitest";
import type { VendaProduto } from "@/lib/syspro-api";
import { agruparVendasPorNota, valorItem } from "@/lib/vendas";
import { periodoConsultaValido } from "@/lib/sales-service";

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
