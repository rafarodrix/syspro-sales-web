import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consultarKardex: vi.fn(),
}));

vi.mock("@/lib/syspro-api", () => ({
  consultarKardex: mocks.consultarKardex,
  SysproApiError: class SysproApiError extends Error {},
}));

import { obterMovimentosEstoque } from "@/lib/estoque-service";

const empresa = {
  id: "empresa-1",
  cnpj: "12345678000199",
  razaoSocial: "Empresa QA",
  empresaCodigo: "1",
  sysproBaseUrl: "http://localhost:8080",
  sysproUseIis: false,
};

function movimento(codigoAuxiliar: string) {
  return {
    empresa_codigo: "1",
    empresa_nome: "Empresa QA",
    produto_id_produto: `id-${codigoAuxiliar}`,
    produto_codigo_auxiliar: codigoAuxiliar,
    produto_descricao: `Produto ${codigoAuxiliar}`,
    kardex_data_movimento: "2026-10-01",
    kardex_qtde_movimento: 1,
    kardex_qtde_saldo: 1,
    kardex_cd_grupo_documento: "EA",
    kardex_operacao: "E",
  };
}

describe("serviço de estoque", () => {
  beforeEach(() => mocks.consultarKardex.mockReset());

  it("consulta um período longo e preserva somente o código auxiliar solicitado", async () => {
    mocks.consultarKardex.mockResolvedValue([
      movimento("AUX-1"),
      movimento("OUTRO"),
    ]);

    const resultado = await obterMovimentosEstoque({
      empresa,
      codigoAuxiliar: " aux-1 ",
      dtInicial: "01/01/2020",
      dtFinal: "27/10/2026",
    });

    expect(mocks.consultarKardex).toHaveBeenCalledWith(
      { baseUrl: "http://localhost:8080", useIis: false },
      { dtInicial: "01/01/2020", dtFinal: "27/10/2026", codigoAuxiliar: "aux-1" },
      undefined,
    );
    expect(resultado).toHaveLength(1);
    expect(resultado[0].produtoCodigoAuxiliar).toBe("AUX-1");
  });
});
