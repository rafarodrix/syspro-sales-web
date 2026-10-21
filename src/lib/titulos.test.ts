import { describe, expect, it } from "vitest";
import { normalizarTitulo, resumirTitulos } from "@/lib/titulos";

const referencia = new Date("2026-10-21T00:00:00Z");

function bruto(campos: Record<string, unknown> = {}) {
  return {
    empresa_codigo: "01",
    empresa_razao: "EMPRESA TESTE",
    fornecedor_nome: "FORNECEDOR A",
    titulo_numero: "100",
    titulo_dt_emissao: "2026-09-01",
    titulo_dt_vencimento: "2026-10-01",
    titulo_dt_baixa: null,
    titulo_valor: 100,
    titulo_acrescimo: 0,
    titulo_desconto: 0,
    titulo_vlr_pago: null,
    titulo_forma_pagto: null,
    ...campos,
  };
}

describe("títulos financeiros", () => {
  it("normaliza os campos reais da rota titulo/pagar", () => {
    const titulo = normalizarTitulo(bruto(), referencia);
    expect(titulo.empresaCodigo).toBe("01");
    expect(titulo.participante).toBe("FORNECEDOR A");
    expect(titulo.numero).toBe("100");
    expect(titulo.emissao).toBe("2026-09-01");
    expect(titulo.vencimento).toBe("2026-10-01");
    expect(titulo.valor).toBe(100);
  });

  it("classifica em aberto, vencido e pago", () => {
    expect(normalizarTitulo(bruto({ titulo_dt_vencimento: "2026-10-30" }), referencia).situacao).toBe("aberto");
    const vencido = normalizarTitulo(bruto(), referencia);
    expect(vencido.situacao).toBe("vencido");
    expect(vencido.diasAtraso).toBe(20);
    const pago = normalizarTitulo(
      bruto({ titulo_dt_baixa: "2026-10-02", titulo_vlr_pago: 100 }),
      referencia,
    );
    expect(pago.situacao).toBe("pago");
    expect(pago.saldo).toBe(0);
    expect(pago.diasAtraso).toBe(0);
  });

  it("calcula saldo com acréscimo e desconto", () => {
    const titulo = normalizarTitulo(
      bruto({ titulo_valor: 100, titulo_acrescimo: 10, titulo_desconto: 5, titulo_vlr_pago: 30 }),
      referencia,
    );
    expect(titulo.saldo).toBe(75);
  });

  it("aceita nome de participante de contas a receber", () => {
    const titulo = normalizarTitulo(bruto({ fornecedor_nome: undefined, cliente_nome: "CLIENTE B" }), referencia);
    expect(titulo.participante).toBe("CLIENTE B");
  });

  it("resume valores em aberto, vencidos e a vencer", () => {
    const titulos = [
      normalizarTitulo(bruto({ titulo_valor: 100 }), referencia), // vencido
      normalizarTitulo(bruto({ titulo_valor: 200, titulo_dt_vencimento: "2026-11-10" }), referencia), // a vencer
      normalizarTitulo(bruto({ titulo_valor: 50, titulo_dt_baixa: "2026-10-02", titulo_vlr_pago: 50 }), referencia), // pago
    ];
    const resumo = resumirTitulos(titulos);
    expect(resumo.quantidade).toBe(3);
    expect(resumo.valorTotal).toBe(350);
    expect(resumo.valorPago).toBe(50);
    expect(resumo.emAberto).toBe(300);
    expect(resumo.vencido).toBe(100);
    expect(resumo.aVencer).toBe(200);
    expect(resumo.quantidadeVencidos).toBe(1);
    expect(resumo.atrasoMedioDias).toBe(20);
    expect(resumo.proximoVencimento).toBe("2026-11-10");
  });
});
