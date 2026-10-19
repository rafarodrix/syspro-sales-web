import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consultarVendas: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/syspro-api", () => ({
  consultarVendas: mocks.consultarVendas,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
}));

import {
  obterVendas,
  periodoConsultaValido,
  SalesIntegrationError,
  SalesQueryError,
  type EmpresaInfo,
} from "@/lib/sales-service";

const empresaA: EmpresaInfo = {
  id: "a",
  cnpj: "00000000000100",
  razaoSocial: "Empresa A",
  empresaCodigo: "1",
  sysproBaseUrl: "http://localhost:8080",
  sysproUseIis: true,
};
const empresaB: EmpresaInfo = {
  id: "b",
  cnpj: "00000000000200",
  razaoSocial: "Empresa B",
  empresaCodigo: "2",
  sysproBaseUrl: "http://localhost:8080",
};

let sequencia = 0;
function parametros(extra: Partial<Parameters<typeof obterVendas>[0]> = {}) {
  sequencia += 1;
  return {
    actorId: `usuario-${sequencia}`,
    empresasLiberadas: [empresaA, empresaB],
    empresaSelecionadaId: "a",
    dtInicial: `2026-01-${String(sequencia).padStart(2, "0")}`,
    dtFinal: `2026-02-${String(sequencia).padStart(2, "0")}`,
    enforceRateLimit: false,
    ...extra,
  };
}

beforeEach(() => {
  mocks.consultarVendas.mockReset();
  mocks.checkRateLimit.mockReset().mockReturnValue({ success: true });
});

afterEach(() => vi.restoreAllMocks());

describe("serviço de vendas", () => {
  it("consulta, filtra pela empresa e acrescenta metadados", async () => {
    mocks.consultarVendas.mockResolvedValue([
      { empresa_codigo: "1", nf_numero: "1" },
      { empresa_codigo: "2", nf_numero: "2" },
    ]);
    const signal = new AbortController().signal;

    const vendas = await obterVendas(parametros({ signal }));

    expect(mocks.consultarVendas).toHaveBeenCalledWith(
      { baseUrl: empresaA.sysproBaseUrl, useIis: true },
      expect.objectContaining({ dtInicial: expect.stringMatching(/^\d{2}\/01\/2026$/), dtFinal: expect.stringMatching(/^\d{2}\/02\/2026$/) }),
      signal,
    );
    expect(vendas).toEqual([
      expect.objectContaining({ empresa_codigo: "1", empresa_id: "a", empresa_nome: "Empresa A", empresa_cnpj: empresaA.cnpj }),
    ]);
  });

  it("consolida todas as empresas e ignora filial sem URL configurada", async () => {
    mocks.consultarVendas
      .mockResolvedValueOnce([{ empresa_codigo: "1", nf_numero: "1" }])
      .mockResolvedValueOnce([{ empresa_codigo: "2", nf_numero: "2" }]);
    const semUrl = { ...empresaB, id: "sem-url", sysproBaseUrl: null };

    const vendas = await obterVendas(parametros({
      empresasLiberadas: [empresaA, empresaB, semUrl],
      empresaSelecionadaId: "todas",
    }));

    expect(mocks.consultarVendas).toHaveBeenCalledTimes(2);
    expect(vendas.map((v) => v.empresa_id)).toEqual(["a", "b"]);
  });

  it("consulta somente a seleção customizada autorizada", async () => {
    mocks.consultarVendas
      .mockResolvedValueOnce([{ empresa_codigo: "1" }])
      .mockResolvedValueOnce([{ empresa_codigo: "2" }]);

    const vendas = await obterVendas(parametros({ empresaSelecionadaId: " a, b " }));

    expect(mocks.consultarVendas).toHaveBeenCalledTimes(2);
    expect(vendas).toHaveLength(2);
  });

  it("usa cache e permite forçar atualização", async () => {
    mocks.consultarVendas
      .mockResolvedValueOnce([{ empresa_codigo: "1", nf_numero: "cache-1" }])
      .mockResolvedValueOnce([{ empresa_codigo: "1", nf_numero: "cache-2" }]);
    const base = parametros({ dtInicial: "2025-04-01", dtFinal: "2025-04-30" });

    const primeira = await obterVendas(base);
    const segunda = await obterVendas(base);
    const atualizada = await obterVendas({ ...base, forcarAtualizacao: true });

    expect(mocks.consultarVendas).toHaveBeenCalledTimes(2);
    expect(segunda).toEqual(primeira);
    expect(atualizada[0].nf_numero).toBe("cache-2");
  });

  it("aplica rate limit por usuário quando habilitado", async () => {
    mocks.checkRateLimit.mockReturnValue({ success: false });

    await expect(obterVendas(parametros({ enforceRateLimit: true }))).rejects.toEqual(
      expect.objectContaining({ name: "SalesQueryError", status: 429 }),
    );
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(expect.stringMatching(/^vendas:usuario-/), 45, 60_000);
  });

  it("converte falha da integração sem devolver consolidação parcial", async () => {
    mocks.consultarVendas.mockRejectedValue(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const erro = await obterVendas(parametros()).catch((error) => error);

    expect(erro).toBeInstanceOf(SalesIntegrationError);
    expect(erro.message).toContain("totais incompletos");
  });

  it("rejeita período e empresa não autorizada com erro de consulta", async () => {
    await expect(obterVendas(parametros({ dtInicial: "2026-02-01", dtFinal: "2026-01-01" })))
      .rejects.toBeInstanceOf(SalesQueryError);
    await expect(obterVendas(parametros({ empresaSelecionadaId: "x" })))
      .rejects.toMatchObject({ status: 400 });
  });
});

describe("validação de período de vendas", () => {
  it.each([
    ["01/01/2026", "31/12/2026", true],
    ["2024-02-29", "2024-02-29", true],
    ["31/02/2026", "01/03/2026", false],
    ["2026/01/01", "2026-01-02", false],
    ["2026-01-02", "2026-01-01", false],
    ["2025-01-01", "2026-01-03", false],
  ])("valida %s até %s", (inicial, final, esperado) => {
    expect(periodoConsultaValido(inicial, final)).toBe(esperado);
  });
});
