import { describe, expect, it } from "vitest";
import { empresaCreateSchema, kardexQuerySchema, limitesEstoqueEmpresaSchema, vendasQuerySchema } from "@/lib/validations";

describe("limites de estoque por empresa", () => {
  it("aceita uma sequência válida de cobertura", () => {
    expect(limitesEstoqueEmpresaSchema.safeParse({
      coberturaCriticaDias: 7,
      coberturaAtencaoDias: 15,
      coberturaExcessoDias: 90,
      coberturaCompraDias: 30,
    }).success).toBe(true);
  });

  it("rejeita limites fora de ordem", () => {
    const resultado = limitesEstoqueEmpresaSchema.safeParse({
      coberturaCriticaDias: 20,
      coberturaAtencaoDias: 15,
      coberturaExcessoDias: 10,
      coberturaCompraDias: 30,
    });

    expect(resultado.success).toBe(false);
  });

  it("mantém defaults compatíveis ao cadastrar uma empresa", () => {
    const resultado = empresaCreateSchema.parse({
      cnpj: "00000000000191",
      razaoSocial: "Empresa QA",
      empresaCodigo: "1",
      sysproBaseUrl: "http://localhost:8080",
      sysproUseIis: false,
    });

    expect(resultado).toMatchObject({
      coberturaCriticaDias: 7,
      coberturaAtencaoDias: 15,
      coberturaExcessoDias: 90,
      coberturaCompraDias: 30,
    });
  });
});

describe("consulta de vendas e compras", () => {
  it("não aceita o grupo de estoque do navegador como parâmetro da consulta", () => {
    const resultado = vendasQuerySchema.parse({
      empresaId: "empresa-1",
      dtInicial: "01/10/2026",
      dtFinal: "31/10/2026",
      grupoEstoquePadrao: "OUTRO-GRUPO",
    });

    expect(resultado).not.toHaveProperty("grupoEstoquePadrao");
  });
});

describe("consulta do Kardex", () => {
  it("exige e normaliza o código auxiliar do produto", () => {
    const resultado = kardexQuerySchema.parse({
      empresaId: "empresa-1",
      codigoAuxiliar: " 5374 ",
      dtInicial: "01/01/2020",
      dtFinal: "27/10/2026",
    });

    expect(resultado.codigoAuxiliar).toBe("5374");
    expect(kardexQuerySchema.safeParse({
      empresaId: "empresa-1",
      dtInicial: "01/10/2026",
      dtFinal: "27/10/2026",
    }).success).toBe(false);
  });
});
