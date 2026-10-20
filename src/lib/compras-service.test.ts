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

vi.mock("@/lib/relatorio-compras", async () => {
  const real = await vi.importActual<typeof import("@/lib/relatorio-compras")>("@/lib/relatorio-compras");
  return {
    dividirPeriodoKardex: mocks.dividirPeriodoKardex,
    montarRelatorioCompras: mocks.montarRelatorioCompras,
    normalizarDataIso: real.normalizarDataIso,
  };
});

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
import { SysproApiError } from "@/lib/syspro-api";

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
  mocks.obterVendas.mockReset().mockResolvedValue([
    { empresa_codigo: "1", nf_numero: "10", produto_id: "P1" },
  ]);
  mocks.obterMovimentosEstoque.mockReset()
    .mockResolvedValueOnce([{ documento: "A", produtoIdProduto: "P1", produtoCodigoAuxiliar: "REF-1" }])
    .mockResolvedValueOnce([{ documento: "B", produtoIdProduto: "P1", produtoCodigoAuxiliar: "REF-1" }]);
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
      [{ empresa_codigo: "1", nf_numero: "10", produto_id: "P1" }],
      [
        { documento: "A", produtoIdProduto: "P1", produtoCodigoAuxiliar: "REF-1" },
        { documento: "B", produtoIdProduto: "P1", produtoCodigoAuxiliar: "REF-1" },
      ],
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

  it("subdivide a janela do Kardex quando a resposta excede o limite", async () => {
    mocks.dividirPeriodoKardex.mockReturnValue([
      { inicial: "2026-09-01", final: "2026-09-30" },
    ]);
    mocks.obterMovimentosEstoque.mockReset().mockImplementation(({ dtInicial, dtFinal }) => {
      if (dtInicial === "2026-09-01" && dtFinal === "2026-09-30") {
        return Promise.reject(new SysproApiError(
          "A resposta da API Syspro excede o limite permitido.",
          502,
        ));
      }
      return Promise.resolve([{
        documento: `${dtInicial}:${dtFinal}`,
        produtoIdProduto: "P1",
        produtoCodigoAuxiliar: "REF-1",
      }, {
        documento: "produto-fora-do-relatorio",
        produtoIdProduto: "P2",
        produtoCodigoAuxiliar: "REF-2",
      }]);
    });

    await obterRelatorioCompras({
      actorId: "usuario-1",
      empresa,
      dtInicial: "2026-09-01",
      dtFinal: "2026-09-30",
    });

    expect(mocks.obterMovimentosEstoque).toHaveBeenCalledTimes(3);
    expect(mocks.obterMovimentosEstoque).toHaveBeenNthCalledWith(2, {
      empresa,
      dtInicial: "2026-09-01",
      dtFinal: "2026-09-15",
      signal: undefined,
    });
    expect(mocks.obterMovimentosEstoque).toHaveBeenNthCalledWith(3, {
      empresa,
      dtInicial: "2026-09-16",
      dtFinal: "2026-09-30",
      signal: undefined,
    });
    expect(mocks.montarRelatorioCompras).toHaveBeenCalledWith(
      expect.any(Array),
      [
        { documento: "2026-09-01:2026-09-15", produtoIdProduto: "P1", produtoCodigoAuxiliar: "REF-1" },
        { documento: "2026-09-16:2026-09-30", produtoIdProduto: "P1", produtoCodigoAuxiliar: "REF-1" },
      ],
      { inicial: "2026-09-01", final: "2026-09-30" },
    );
  });

  it("consulta o Kardex mesmo sem vendas para localizar devolucoes EDV", async () => {
    mocks.obterVendas.mockResolvedValue([]);

    await obterRelatorioCompras({
      actorId: "usuario-1",
      empresa,
      dtInicial: "2026-09-01",
      dtFinal: "2026-09-30",
    });

    expect(mocks.obterMovimentosEstoque).toHaveBeenCalledTimes(2);
    expect(mocks.montarRelatorioCompras).toHaveBeenCalledWith(
      [],
      [],
      { inicial: "2026-09-01", final: "2026-09-30" },
    );
  });

  it("inclui EDV de produto sem venda no período e acompanha seus movimentos seguintes", async () => {
    mocks.obterVendas.mockResolvedValue([]);
    mocks.obterMovimentosEstoque.mockReset()
      .mockResolvedValueOnce([{
        documento: "DEV-1",
        grupoDocumento: "EDV",
        produtoIdProduto: "P-DEV",
        produtoCodigoAuxiliar: "REF-DEV",
      }])
      .mockResolvedValueOnce([{
        documento: "MOV-POSTERIOR",
        grupoDocumento: "EVD",
        produtoIdProduto: "P-DEV",
        produtoCodigoAuxiliar: "REF-DEV",
      }]);

    await obterRelatorioCompras({
      actorId: "usuario-1",
      empresa,
      dtInicial: "2026-09-01",
      dtFinal: "2026-09-30",
    });

    expect(mocks.montarRelatorioCompras).toHaveBeenCalledWith(
      [],
      [
        expect.objectContaining({ documento: "DEV-1", produtoIdProduto: "P-DEV" }),
        expect.objectContaining({ documento: "MOV-POSTERIOR", produtoIdProduto: "P-DEV" }),
      ],
      { inicial: "2026-09-01", final: "2026-09-30" },
    );
  });

  it("ignora movimento com descrição igual quando o ID do produto diverge", async () => {
    mocks.dividirPeriodoKardex.mockReturnValue([
      { inicial: "2026-09-01", final: "2026-09-30" },
    ]);
    mocks.obterVendas.mockResolvedValue([{
      empresa_codigo: "1",
      nf_numero: "10",
      produto_id: "{47E770D8-EE38-474E-AFF3-3A1A51E3EDC4}",
      produto_descricao: "Água desmineralizada",
    }]);
    const movimento = {
      documento: "EDC-1",
      produtoIdProduto: "OUTRO-ID",
      produtoCodigoAuxiliar: "1263",
      produtoDescricao: "AGUA DESMINERALIZADA",
    };
    mocks.obterMovimentosEstoque.mockReset().mockResolvedValue([movimento]);

    await obterRelatorioCompras({
      actorId: "usuario-1",
      empresa,
      dtInicial: "2026-09-01",
      dtFinal: "2026-09-30",
    });

    expect(mocks.montarRelatorioCompras).toHaveBeenCalledWith(
      expect.any(Array),
      [],
      { inicial: "2026-09-01", final: "2026-09-30" },
    );
  });
});
