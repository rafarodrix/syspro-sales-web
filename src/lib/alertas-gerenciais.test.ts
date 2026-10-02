import { describe, expect, it } from "vitest";
import type { VendaProduto } from "@/lib/syspro-api";
import { gerarAlertasGerenciais } from "@/lib/alertas-gerenciais";

function venda(campos: Partial<VendaProduto> = {}): VendaProduto {
  return {
    empresa_codigo: "1",
    nf_numero: "1",
    cliente_nome: "CLIENTE",
    cliente_cidade: "Ituiutaba",
    cliente_uf: "MG",
    produto_id: "P1",
    produto_descricao: "Produto",
    produto_departamento: "Geral",
    produto_un: "UN",
    produto_qtde: 1,
    produto_vlr_item: 100,
    produto_vlr_icms_stb: 0,
    produto_vlr_desconto: 0,
    produto_vlr_frete: 0,
    produto_vlr_total_item: 100,
    produto_vlr_total_liquido: 100,
    vendedor_nome: "VENDEDOR",
    nf_dt_emissao: "2026-10-01",
    nf_modelo: "55",
    nf_forma_pagto: "PIX",
    ...campos,
  };
}

describe("alertas gerenciais", () => {
  it("não cria alertas comparativos sem período anterior", () => {
    expect(gerarAlertasGerenciais([venda()], [])).toEqual([]);
  });

  it("reutiliza diagnósticos e cria links de atenção a partir de sinais reais", () => {
    const anterior = [
      venda({
        nf_numero: "1",
        cliente_nome: "CLIENTE A",
        vendedor_nome: "VENDEDOR A",
        produto_id: "A",
        produto_descricao: "A",
        produto_vlr_total_liquido: 200,
        produto_vlr_desconto: 1,
      }),
      venda({
        nf_numero: "2",
        cliente_nome: "CLIENTE B",
        vendedor_nome: "VENDEDOR B",
        produto_id: "B",
        produto_descricao: "B",
        produto_vlr_total_liquido: 300,
      }),
    ];
    const atual = [
      venda({
        nf_numero: "3",
        cliente_nome: "CLIENTE A",
        vendedor_nome: "VENDEDOR A",
        produto_id: "A",
        produto_descricao: "A",
        produto_vlr_total_liquido: 100,
        produto_vlr_desconto: 20,
      }),
      venda({
        nf_numero: "4",
        cliente_nome: "CLIENTE C",
        vendedor_nome: "VENDEDOR C",
        produto_id: "C",
        produto_descricao: "C",
        produto_vlr_total_liquido: 250,
      }),
    ];

    const alertas = gerarAlertasGerenciais(atual, anterior);
    expect(alertas.some((item) => item.id === "clientes-queda")).toBe(true);
    expect(
      alertas.some((item) => item.id === "desconto-sem-retorno"),
    ).toBe(true);
    expect(alertas.some((item) => item.id === "renovacao-mix")).toBe(true);
  });
});
