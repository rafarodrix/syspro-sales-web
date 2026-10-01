import { describe, expect, it } from "vitest";
import { resolverComparacao } from "./periodo-comparacao";

describe("comparação de calendário em Clientes", () => {
  it("compara meses e trimestres completos, sem cortar dias do mês anterior", () => {
    expect(
      resolverComparacao({ inicial: "2026-09-01", final: "2026-09-30" }),
    ).toEqual({ inicial: "2026-08-01", final: "2026-08-31" });
    expect(
      resolverComparacao({ inicial: "2026-07-01", final: "2026-09-30" }),
    ).toEqual({ inicial: "2026-04-01", final: "2026-06-30" });
    expect(
      resolverComparacao({ inicial: "2026-01-01", final: "2026-03-31" }),
    ).toEqual({ inicial: "2025-10-01", final: "2025-12-31" });
  });
  it("mantém semanas consecutivas no automático e oferece o mesmo intervalo mensal", () => {
    const atual = { inicial: "2026-09-01", final: "2026-09-07" };
    expect(resolverComparacao(atual)).toEqual({
      inicial: "2026-08-25",
      final: "2026-08-31",
    });
    expect(resolverComparacao(atual, "mes-anterior")).toEqual({
      inicial: "2026-08-01",
      final: "2026-08-07",
    });
    expect(resolverComparacao(atual, "ano-anterior")).toEqual({
      inicial: "2025-09-01",
      final: "2025-09-07",
    });
  });
  it("trata fevereiro e ano bissexto sem estourar para março", () => {
    expect(
      resolverComparacao(
        { inicial: "2024-03-01", final: "2024-03-31" },
        "mes-anterior",
      ),
    ).toEqual({ inicial: "2024-02-01", final: "2024-02-29" });
    expect(
      resolverComparacao(
        { inicial: "2024-02-01", final: "2024-02-29" },
        "ano-anterior",
      ),
    ).toEqual({ inicial: "2023-02-01", final: "2023-02-28" });
    expect(
      resolverComparacao(
        { inicial: "2026-03-29", final: "2026-03-31" },
        "mes-anterior",
      ),
    ).toEqual({ inicial: "2026-02-28", final: "2026-02-28" });
  });
  it("preserva a opção por dias anteriores para meses completos", () => {
    expect(
      resolverComparacao(
        { inicial: "2026-09-01", final: "2026-09-30" },
        "dias-anteriores",
      ),
    ).toEqual({ inicial: "2026-08-02", final: "2026-08-31" });
  });
  it("valida comparação personalizada e rejeita janelas sobrepostas", () => {
    const atual = { inicial: "2026-07-01", final: "2026-09-30" };
    expect(
      resolverComparacao(atual, "personalizado", {
        inicial: "2025-01-01",
        final: "2025-03-31",
      }),
    ).toEqual({ inicial: "2025-01-01", final: "2025-03-31" });
    expect(() => resolverComparacao(atual, "mes-anterior")).toThrow(
      "terminar antes",
    );
    expect(() =>
      resolverComparacao(atual, "personalizado", {
        inicial: "2026-07-01",
        final: "2026-07-02",
      }),
    ).toThrow("terminar antes");
    expect(() =>
      resolverComparacao(atual, "personalizado", {
        inicial: "2026-02-30",
        final: "2026-03-01",
      }),
    ).toThrow("válido");
  });
});
