import { describe, expect, it } from "vitest";

import { mesmaEmpresaCodigo, normalizarEmpresaCodigo } from "@/lib/empresa-codigo";

describe("código de empresa do Syspro", () => {
  it("trata zeros à esquerda como o mesmo código", () => {
    expect(normalizarEmpresaCodigo("1")).toBe("1");
    expect(normalizarEmpresaCodigo("01")).toBe("1");
    expect(normalizarEmpresaCodigo("001")).toBe("1");
    expect(normalizarEmpresaCodigo(" 001 ")).toBe("1");
  });

  it("compara cadastro com retorno da API", () => {
    expect(mesmaEmpresaCodigo("001", "1")).toBe(true);
    expect(mesmaEmpresaCodigo("01", "1")).toBe(true);
    expect(mesmaEmpresaCodigo("2", "1")).toBe(false);
    expect(mesmaEmpresaCodigo("", "1")).toBe(false);
  });

  it("mantém códigos alfanuméricos", () => {
    expect(mesmaEmpresaCodigo("fil01", "FIL01")).toBe(true);
    expect(mesmaEmpresaCodigo("0", "00")).toBe(true);
  });
});
