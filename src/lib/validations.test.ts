import { describe, expect, it } from "vitest";
import { empresaCreateSchema, limitesEstoqueEmpresaSchema } from "@/lib/validations";

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
