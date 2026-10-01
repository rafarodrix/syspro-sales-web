import { describe, expect, it } from "vitest";
import type { VendaProduto } from "./syspro-api";
import { agruparVendasPorNota } from "./vendas";
import { produtosDasNotas } from "./clientes-produtos";

const base: VendaProduto = {
  empresa_codigo: "1",
  nf_numero: "10",
  nf_modelo: "55",
  nf_dt_emissao: "2026-07-10",
  nf_forma_pagto: "PIX",
  cliente_nome: "ANA",
  cliente_cidade: "São Paulo",
  cliente_uf: "SP",
  vendedor_nome: "Vendedor",
  produto_id: "1",
  produto_descricao: "Produto",
  produto_departamento: "Geral",
  produto_un: "UN",
  produto_qtde: 2,
  produto_vlr_item: 100,
  produto_vlr_icms_stb: 0,
  produto_vlr_desconto: 10,
  produto_vlr_frete: 0,
  produto_vlr_total_item: 100,
  produto_vlr_total_liquido: 90,
};

describe("produtos do detalhe de clientes", () => {
  it("consolida produtos das notas sem contar duas vezes a mesma nota", () => {
    const notas = agruparVendasPorNota([
      base,
      base,
      { ...base, nf_numero: "11", nf_dt_emissao: "2026-08-10" },
    ]);
    expect(produtosDasNotas(notas, false)[0]).toMatchObject({
      quantidade: 6,
      faturamento: 270,
      descontos: 30,
      notas: 2,
    });
    expect(produtosDasNotas(notas, true)).toEqual([
      expect.objectContaining({
        mes: "2026-07",
        quantidade: 4,
        faturamento: 180,
        notas: 1,
      }),
      expect.objectContaining({
        mes: "2026-08",
        quantidade: 2,
        faturamento: 90,
        notas: 1,
      }),
    ]);
  });
  it("separa clientes, empresas e unidades diferentes para o mesmo código de produto", () => {
    const notas = agruparVendasPorNota([
      base,
      { ...base, nf_numero: "11", produto_un: "KG" },
      { ...base, empresa_codigo: "2" },
      { ...base, nf_numero: "12", cliente_nome: "BRUNO" },
    ]);
    expect(produtosDasNotas(notas, false)).toHaveLength(4);
  });
  it("mantém a soma entre a visão mensal e consolidada, inclusive datas BR e inválidas", () => {
    const notas = agruparVendasPorNota([
      base,
      { ...base, nf_numero: "11", nf_dt_emissao: "10/08/2026" },
      { ...base, nf_numero: "12", nf_dt_emissao: "inválida" },
    ]);
    const mensal = produtosDasNotas(notas, true);
    expect(mensal.map((item) => item.mes)).toEqual([
      "2026-07",
      "2026-08",
      "Sem data",
    ]);
    expect(mensal.reduce((total, item) => total + item.faturamento, 0)).toBe(
      produtosDasNotas(notas, false)[0].faturamento,
    );
    expect(produtosDasNotas([], true)).toEqual([]);
  });
});
