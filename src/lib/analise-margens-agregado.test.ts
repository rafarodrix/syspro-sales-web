import { describe, expect, it } from "vitest";

import { agregarMargens, faixaDeMargem, type ItemAnaliseMargem } from "@/lib/analise-margens";

function item(over: Partial<ItemAnaliseMargem>): ItemAnaliseMargem {
  return {
    codigo: "X",
    produto: "Produto",
    unidade: "UN",
    curva: "A",
    quantidadeVendida: 0,
    quantidadeDevolvida: 0,
    quantidadeLiquidaReal: 0,
    demandaLiquida: 0,
    taxaDevolucao: 0,
    valorVendido: 0,
    valorDevolvido: 0,
    valorVendaLiquida: 0,
    taxaDevolucaoValor: 0,
    estoqueAtual: 0,
    mediaDiaria: 0,
    coberturaDias: null,
    diasComEstoque: 0,
    diasEmRuptura: 0,
    diasConsiderados: 0,
    semBaseEstoque: false,
    dataUltimoMovimento: null,
    empresaId: "e1",
    empresaNome: "Empresa",
    custoAntesEdv: null,
    lucroAntesEdv: null,
    margemAntesEdv: null,
    custoDepoisEdv: null,
    lucroDepoisEdv: 0,
    margemDepoisEdv: 0,
    impactoLucroEdv: null,
    ...over,
  } as ItemAnaliseMargem;
}

describe("agrupamento de margens", () => {
  it("classifica a margem em faixas", () => {
    expect(faixaDeMargem(-1)).toBe("negativa");
    expect(faixaDeMargem(5)).toBe("ate10");
    expect(faixaDeMargem(15)).toBe("10a20");
    expect(faixaDeMargem(25)).toBe("20a30");
    expect(faixaDeMargem(45)).toBe("acima30");
    expect(faixaDeMargem(null)).toBe("sem-custo");
  });

  it("soma venda, devolução e líquido por curva", () => {
    const linhas = agregarMargens(
      [
        item({ curva: "A", valorVendido: 100, valorDevolvido: 10, valorVendaLiquida: 90, lucroDepoisEdv: 27 }),
        item({ curva: "A", valorVendido: 50, valorDevolvido: 0, valorVendaLiquida: 50, lucroDepoisEdv: 15 }),
        item({ curva: "B", valorVendido: 40, valorDevolvido: 5, valorVendaLiquida: 35, lucroDepoisEdv: 7 }),
      ],
      "curva",
    );

    expect(linhas.map((linha) => linha.chave)).toEqual(["curva-A", "curva-B"]);
    expect(linhas[0]).toMatchObject({
      produtos: 2,
      vendaTotal: 150,
      devolucoes: 10,
      vendaLiquida: 140,
      lucro: 42,
      margem: 30,
    });
  });

  it("ordena as faixas da pior para a melhor e separa sem custo", () => {
    const linhas = agregarMargens(
      [
        item({ margemDepoisEdv: -5, lucroDepoisEdv: -5, valorVendaLiquida: 100 }),
        item({ margemDepoisEdv: 25, lucroDepoisEdv: 25, valorVendaLiquida: 100 }),
        item({ margemDepoisEdv: null, lucroDepoisEdv: null, valorVendaLiquida: 100 }),
      ],
      "faixa",
    );

    expect(linhas.map((linha) => linha.chave)).toEqual(["negativa", "20a30", "sem-custo"]);
    expect(linhas[0].margem).toBeCloseTo(-5, 5);
  });
});
