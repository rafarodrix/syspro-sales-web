import { describe, expect, it } from "vitest";
import { GUIAS_RELATORIOS } from "@/components/relatorio-guia";

describe("guias dos relatorios", () => {
  it("explica a formula dos campos calculados de compras", () => {
    const termos = GUIAS_RELATORIOS.compras.glossario ?? [];
    const nomes = termos.map((item) => item.termo);

    for (const esperado of [
      "Demanda para compras",
      "Curva ABC (por demanda)",
      "Cobertura",
      "Cobertura alvo",
      "Situação de estoque",
      "Sugestão de compra (un)",
      "Custo sugestão",
      "Estoque a custo aquisição / reposição",
      "Margem",
      "Capital parado",
    ]) {
      expect(nomes).toContain(esperado);
    }

    const comFormula = termos.filter((item) => item.definicao.startsWith("Fórmula"));
    expect(comFormula.length).toBeGreaterThanOrEqual(8);
  });

  it("descreve a formula da curva ABC do relatorio de faturamento", () => {
    const curva = (GUIAS_RELATORIOS["curva-abc"].glossario ?? [])
      .find((item) => item.termo === "Curva ABC / Pareto");
    expect(curva?.definicao).toContain("80% = classe A");
  });

  it("nao herda termos do panorama no relatorio de compras", () => {
    const nomes = (GUIAS_RELATORIOS.compras.glossario ?? []).map((item) => item.termo);
    expect(nomes).not.toContain("Pedidos / NF");
    expect(nomes).not.toContain("Ticket médio");
  });

  it("mantem os termos do panorama nos relatorios da central", () => {
    const nomes = (GUIAS_RELATORIOS["curva-abc"].glossario ?? []).map((item) => item.termo);
    expect(nomes).toContain("Ticket médio");
  });
});
