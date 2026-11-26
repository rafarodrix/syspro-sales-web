import { describe, expect, it } from "vitest";

import {
  grupoEstoqueCorresponde,
  listaGruposEstoque,
  movimentoNoGrupoConfigurado,
  normalizarGrupoEstoque,
  rotuloGruposEstoque,
} from "@/lib/grupo-estoque";

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

  it("configuração sem código pega todos os depósitos do grupo", () => {
    expect(movimentoNoGrupoConfigurado("GERAL (1)", "GERAL")).toBe(true);
    expect(movimentoNoGrupoConfigurado("GERAL (2)", "GERAL")).toBe(true);
    expect(movimentoNoGrupoConfigurado("FISCAL", "GERAL")).toBe(false);
  });

  it("configuração com código isola um depósito", () => {
    expect(movimentoNoGrupoConfigurado("GERAL (2)", "GERAL (2)")).toBe(true);
    expect(movimentoNoGrupoConfigurado("GERAL (1)", "GERAL (2)")).toBe(false);
    expect(movimentoNoGrupoConfigurado("GERAL", "GERAL (2)")).toBe(false);
  });

  it("aceita mais de um depósito/grupo separado por ;", () => {
    expect(movimentoNoGrupoConfigurado("GERAL (1)", "GERAL (1);GERAL (2)")).toBe(true);
    expect(movimentoNoGrupoConfigurado("GERAL (2)", "GERAL (1);GERAL (2)")).toBe(true);
    expect(movimentoNoGrupoConfigurado("GERAL (3)", "GERAL (1);GERAL (2)")).toBe(false);
    expect(movimentoNoGrupoConfigurado("FISCAL", "GERAL;FISCAL")).toBe(true);
    expect(movimentoNoGrupoConfigurado("GERAL (2)", " geral ( 1 ) ; geral ( 2 ) ")).toBe(true);
  });

  it("lista e rótulo da configuração", () => {
    expect(listaGruposEstoque("")).toEqual(["GERAL"]);
    expect(listaGruposEstoque("GERAL (1); GERAL (2)")).toEqual(["GERAL (1)", "GERAL (2)"]);
    expect(rotuloGruposEstoque("GERAL (1);GERAL (2)")).toBe("GERAL (1) + GERAL (2)");
  });
});
