import { describe, expect, it } from "vitest";

import { grupoEstoqueCorresponde, normalizarGrupoEstoque } from "@/lib/grupo-estoque";

describe("grupo de estoque do Syspro", () => {
  it("remove o código do depósito entre parênteses", () => {
    expect(normalizarGrupoEstoque("GERAL (2)")).toBe("GERAL");
    expect(normalizarGrupoEstoque(" geral ( 1 ) ")).toBe("GERAL");
    expect(normalizarGrupoEstoque("FISCAL")).toBe("FISCAL");
  });

  it("trata vazio como GERAL, que é o padrão da empresa", () => {
    expect(normalizarGrupoEstoque(null)).toBe("GERAL");
    expect(normalizarGrupoEstoque("   ")).toBe("GERAL");
    expect(normalizarGrupoEstoque(undefined)).toBe("GERAL");
  });

  it("considera o depósito do mesmo grupo do padrão configurado", () => {
    expect(grupoEstoqueCorresponde("GERAL (1)", "GERAL")).toBe(true);
    expect(grupoEstoqueCorresponde("GERAL (2)", "GERAL")).toBe(true);
    expect(grupoEstoqueCorresponde("GERAL", "GERAL")).toBe(true);
    expect(grupoEstoqueCorresponde("FISCAL", "GERAL")).toBe(false);
    expect(grupoEstoqueCorresponde("GARANTIA PECAS ENVIAR FORNECEDOR", "GERAL")).toBe(false);
  });
});
