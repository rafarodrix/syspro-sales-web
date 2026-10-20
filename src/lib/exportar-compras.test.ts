import { describe, expect, it } from "vitest";
import {
  COLUNAS_EXPORTACAO_COMPRAS,
  montarLinhasExportacaoCompras,
} from "@/lib/exportar-compras";
import type { ItemRelatorioCompras } from "@/lib/relatorio-compras";

const item: ItemRelatorioCompras = {
  codigo: "RQ1010",
  produto: "AGUA BIDESMINERALIZADA 1 L RADNAQ",
  unidade: "LT",
  curva: "A",
  quantidadeVendida: 376,
  quantidadeDevolvida: 2,
  quantidadeLiquidaReal: 374,
  demandaLiquida: 374,
  taxaDevolucao: 0.53,
  valorVendido: 1854.15,
  valorDevolvido: 9.87,
  valorVendaLiquida: 1844.28,
  taxaDevolucaoValor: 0.53,
  estoqueAtual: 60,
  mediaDiaria: 19.789473684,
  coberturaDias: 3.031914893,
  dataUltimoMovimento: "2026-10-20",
  produtoId: "{47E770D8-EE38-474E-AFF3-3A1A51E3EDC4}",
  marca: "RADNAQ",
  custoAquisicaoMedio: 2.21,
  custoReposicaoMedio: 2.6051,
  custoTotalMercadorias: 974.3074,
  margemBrutaPercentual: 47.1716096,
};

describe("exportacao do relatorio de compras", () => {
  it("coloca codigo e unidade em colunas proprias", () => {
    const colunas = [...COLUNAS_EXPORTACAO_COMPRAS];
    expect(colunas.slice(0, 3)).toEqual(["Código", "Descrição", "Unidade"]);
    expect(colunas).toContain("Custo total mercadorias");
    expect(colunas).toContain("Margem %");
  });

  it("mantem a mesma quantidade de colunas e valores por linha", () => {
    const linhas = montarLinhasExportacaoCompras([item]);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toHaveLength(COLUNAS_EXPORTACAO_COMPRAS.length);
    expect(linhas[0].slice(0, 4)).toEqual([
      "RQ1010",
      "AGUA BIDESMINERALIZADA 1 L RADNAQ",
      "LT",
      "RADNAQ",
    ]);
  });

  it("exporta numeros arredondados e usa vazio quando nao ha valor", () => {
    const linhas = montarLinhasExportacaoCompras([
      { ...item, estoqueAtual: null, margemBrutaPercentual: null, custoTotalMercadorias: null },
    ]);
    const indiceEstoque = COLUNAS_EXPORTACAO_COMPRAS.indexOf("Estoque atual");
    const indiceMargem = COLUNAS_EXPORTACAO_COMPRAS.indexOf("Margem %");
    const indiceCustoTotal = COLUNAS_EXPORTACAO_COMPRAS.indexOf("Custo total mercadorias");
    const indiceCobertura = COLUNAS_EXPORTACAO_COMPRAS.indexOf("Cobertura (dias)");

    expect(linhas[0][indiceEstoque]).toBe("");
    expect(linhas[0][indiceMargem]).toBe("");
    expect(linhas[0][indiceCustoTotal]).toBe("");
    expect(linhas[0][indiceCobertura]).toBe(3);
    expect(linhas[0][COLUNAS_EXPORTACAO_COMPRAS.indexOf("Venda líquida real")]).toBe(1844.28);
  });
});
