import { describe, expect, it } from "vitest";
import {
  COLUNAS_EXPORTACAO_COMPRAS,
  montarLinhasExportacaoCompras,
  numeroPtBr,
  numeroPtBrEnxuto,
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
  custoEstoqueAquisicao: 132.6,
  custoEstoqueReposicao: 156.306,
};

const colunas: string[] = [...COLUNAS_EXPORTACAO_COMPRAS];
const valor = (linha: (string | number)[], coluna: string) => linha[colunas.indexOf(coluna)];

describe("exportacao do relatorio de compras", () => {
  it("coloca codigo e unidade em colunas proprias", () => {
    expect(colunas.slice(0, 3)).toEqual(["Código", "Descrição", "Unidade"]);
    expect(colunas).toContain("Estoque a custo aquisição");
    expect(colunas).toContain("Estoque a custo reposição");
  });

  it("mantem estoque atual ao lado da demanda para compras", () => {
    const indiceDemanda = colunas.indexOf("Demanda para compras");
    expect(colunas[indiceDemanda + 1]).toBe("Estoque atual");
  });

  it("exporta numeros com virgula decimal no padrao pt-BR", () => {
    const [linha] = montarLinhasExportacaoCompras([item], 30);
    expect(valor(linha, "Custo reposição")).toBe("2,61");
    expect(valor(linha, "Estoque a custo aquisição")).toBe("132,60");
    expect(valor(linha, "Estoque a custo reposição")).toBe("156,31");
    expect(valor(linha, "Venda líquida real")).toBe("1844,28");
    expect(valor(linha, "Margem %")).toBe("47,17");
    expect(valor(linha, "Cobertura (dias)")).toBe("3");
  });

  it("formata inteiros sem decimais e nulos como vazio", () => {
    const [linha] = montarLinhasExportacaoCompras([item], 30);
    expect(valor(linha, "Estoque atual")).toBe("60");
    expect(valor(linha, "Vendas no período")).toBe("376");

    const [semValor] = montarLinhasExportacaoCompras(
      [{ ...item, estoqueAtual: null, custoEstoqueAquisicao: null, margemBrutaPercentual: null }],
      30,
    );
    expect(valor(semValor, "Estoque atual")).toBe("");
    expect(valor(semValor, "Estoque a custo aquisição")).toBe("");
    expect(valor(semValor, "Margem %")).toBe("");
    expect(valor(semValor, "Situação")).toBe("Sem saldo localizado");
  });

  it("inclui situacao e sugestao calculadas pela cobertura alvo", () => {
    const [linha30] = montarLinhasExportacaoCompras([item], 30);
    expect(valor(linha30, "Situação")).toBe("Crítica");
    expect(valor(linha30, "Sugestão de compra")).toBe("534");
    expect(valor(linha30, "Custo sugestão")).toBe("1391,12");

    const [linha90] = montarLinhasExportacaoCompras([item], 90);
    expect(valor(linha90, "Situação")).toBe("Crítica");
    expect(valor(linha90, "Sugestão de compra")).toBe("1722");
  });

  it("mantem a mesma quantidade de colunas e valores por linha", () => {
    const linhas = montarLinhasExportacaoCompras([item], 30);
    expect(linhas[0]).toHaveLength(colunas.length);
    expect(linhas[0].slice(0, 4)).toEqual([
      "RQ1010",
      "AGUA BIDESMINERALIZADA 1 L RADNAQ",
      "LT",
      "RADNAQ",
    ]);
  });

  it("formata numeros pt-BR sem separador de milhar", () => {
    expect(numeroPtBr(1234.567)).toBe("1234,57");
    expect(numeroPtBr(-3.5, 1)).toBe("-3,5");
    expect(numeroPtBr(null)).toBe("");
    expect(numeroPtBrEnxuto(18.95, 3)).toBe("18,95");
    expect(numeroPtBrEnxuto(60, 3)).toBe("60");
    expect(numeroPtBrEnxuto(null)).toBe("");
  });
});
