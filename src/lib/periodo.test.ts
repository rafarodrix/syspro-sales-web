import { describe, expect, it } from "vitest";
import { erroPeriodo } from "./periodo";

describe("validação do período de BI", () => {
  it("aceita intervalo inclusivo de até 366 dias", () => {
    expect(erroPeriodo({ inicial: "2024-01-01", final: "2025-01-01" })).toBeNull();
  });

  it("recusa datas impossíveis, ordem inversa e intervalo acima do limite da API", () => {
    expect(erroPeriodo({ inicial: "2026-02-30", final: "2026-03-01" })).toBeTruthy();
    expect(erroPeriodo({ inicial: "2026-09-23", final: "2026-09-22" })).toBeTruthy();
    expect(erroPeriodo({ inicial: "2024-01-01", final: "2025-01-02" })).toBeTruthy();
  });
});
