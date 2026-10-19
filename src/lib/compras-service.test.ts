import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obterMovimentosEstoque: vi.fn(),
  dividirPeriodoKardex: vi.fn(),
  montarRelatorioCompras: vi.fn(),
  obterVendas: vi.fn(),
  periodoConsultaValido: vi.fn(),
}));

vi.mock("@/lib/estoque-service", () => ({
  obterMovimentosEstoque: mocks.obterMovimentosEstoque,
}));

vi.mock("@/lib/relatorio-compras", () => ({
  dividirPeriodoKardex: mocks.dividirPeriodoKardex,
  montarRelatorioCompras: mocks.montarRelatorioCompras,
}));

vi.mock("@/lib/sales-service", () => ({
  obterVendas: mocks.obterVendas,
  periodoConsultaValido: mocks.periodoConsultaValido,
  SalesQueryError: class SalesQueryError extends Error {
    constructor(message: string, public status: number) {
      super(message);
      this.name = "SalesQueryError";
    }
  },
}));

import { obterRelatorioCompras } from "@/lib/compras-service";

const empresa = {
  id: "empresa-1",
  cnpj: "00000000000100",
  razaoSocial: "Empresa 1",
  empresaCodigo: "1",
  sysproBaseUrl: "http://localhost:8080",
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-19T15:00:00Z"));
  mocks.periodoConsultaValido.mockReset().mockReturnValue(true);
  mocks.dividirPeriodoKardex.mockReset().mockReturnValue([
    { inicial: "2026-09-01", final: "2026-10-01" },
    { inicial: "2026-10-02", final: "2026-10-19" },
  ]);
  mocks.obterVendas.mockReset().mockResolvedValue([{ empresa_codigo: "1", nf_numero: "10" }]);
  mocks.obterMovimentosEstoque.mockReset()
    .mockResolvedValueOnce([{ documento: "A" }])
    .mockResolvedValueOnce([{ documento: "B" }]);
  mocks.montarRelatorioCompras.mockReset().mockReturnValue({ itens: [], resumo: { totalProdutos: 0 } });
});

afterEach(() => vi.useRealTimers());

describe("orquestração do relatório de compras", () => {
  it("rejeita período inválido antes de consultar integrações", async () => {
    mocks.periodoConsultaValido.mockReturnValue(false);

    await expect(obterRelatorioCompras({
      actorId: "usuario-1",
      empresa,
      dtInicial: "2026-10-20",
      dtFinal: "2026-10-01",
    })).rejects.toMatchObject({ name: "SalesQueryError", status: 400 });

    expect(mocks.obterVendas).not.toHaveBeenCalled();
    expect(mocks.obterMovimentosEstoque).not.toHaveBeenCalled();
  });

  it("consulta vendas e Kardex até hoje para obter o estoque atual", async () => {
    const signal = new AbortController().signal;

    const resultado = await obterRelatorioCompras({
      actorId: "usuario-1",
      empresa,
      dtInicial: "2026-09-01",
      dtFinal: "2026-09-30",
      forcarAtualizacao: true,
      signal,
    });

    expect(mocks.dividirPeriodoKardex).toHaveBeenCalledWith("2026-09-01", "2026-10-19");
    expect(mocks.obterVendas).toHaveBeenCalledWith({
      actorId: "usuario-1",
      empresasLiberadas: [empresa],
      empresaSelecionadaId: empresa.id,
      dtInicial: "2026-09-01",
      dtFinal: "2026-09-30",
      forcarAtualizacao: true,
      signal,
      enforceRateLimit: false,
    });
    expect(mocks.obterMovimentosEstoque).toHaveBeenCalledTimes(2);
    expect(mocks.obterMovimentosEstoque).toHaveBeenNthCalledWith(1, {
      empresa,
      dtInicial: "2026-09-01",
      dtFinal: "2026-10-01",
      signal,
    });
    expect(mocks.montarRelatorioCompras).toHaveBeenCalledWith(
      [{ empresa_codigo: "1", nf_numero: "10" }],
      [{ documento: "A" }, { documento: "B" }],
      { inicial: "2026-09-01", final: "2026-09-30" },
    );
    expect(resultado).toEqual({ itens: [], resumo: { totalProdutos: 0 } });
  });

  it("não estende o Kardex quando o período começa no futuro", async () => {
    mocks.dividirPeriodoKardex.mockReturnValue([]);

    await obterRelatorioCompras({
      actorId: "usuario-1",
      empresa,
      dtInicial: "2027-01-01",
      dtFinal: "2027-01-31",
    });

    expect(mocks.dividirPeriodoKardex).toHaveBeenCalledWith("2027-01-01", "2027-01-31");
    expect(mocks.obterMovimentosEstoque).not.toHaveBeenCalled();
    expect(mocks.montarRelatorioCompras).toHaveBeenCalledWith(
      expect.any(Array),
      [],
      { inicial: "2027-01-01", final: "2027-01-31" },
    );
  });
});
