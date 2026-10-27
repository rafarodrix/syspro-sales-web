import { describe, expect, it } from "vitest";
import { erroPeriodo, erroPeriodoSemLimite, normalizarDataIso } from "./periodo";

describe("validação do período de BI", () => {
  it("aceita intervalo inclusivo de até 366 dias", () => {
    expect(erroPeriodo({ inicial: "2024-01-01", final: "2025-01-01" })).toBeNull();
  });

  it("recusa datas impossíveis, ordem inversa e intervalo acima do limite da API", () => {
    expect(erroPeriodo({ inicial: "2026-02-30", final: "2026-03-01" })).toBeTruthy();
    expect(erroPeriodo({ inicial: "2026-09-23", final: "2026-09-22" })).toBeTruthy();
    expect(erroPeriodo({ inicial: "2024-01-01", final: "2025-01-02" })).toBeTruthy();
  });

  it("permite períodos superiores a 366 dias quando a consulta não possui limite", () => {
    expect(erroPeriodoSemLimite({ inicial: "2020-01-01", final: "2026-10-27" })).toBeNull();
    expect(erroPeriodoSemLimite({ inicial: "2026-10-28", final: "2026-10-27" })).toBeTruthy();
  });

  it("normaliza datas brasileiras sem alterar datas ISO", () => {
    expect(normalizarDataIso("20/10/2026")).toBe("2026-10-20");
    expect(normalizarDataIso("2026-10-20")).toBe("2026-10-20");
  });
});
