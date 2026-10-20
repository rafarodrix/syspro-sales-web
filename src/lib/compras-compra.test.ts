import { describe, expect, it } from "vitest";
import {
  custoSugestaoCompra,
  ordenarItensCompras,
  resumirDecisaoCompra,
  rotuloSituacao,
  situacaoEstoque,
  sugestaoCompra,
} from "@/lib/compras-compra";
import type { ItemRelatorioCompras } from "@/lib/relatorio-compras";

function item(parcial: Partial<ItemRelatorioCompras> = {}): ItemRelatorioCompras {
  return {
    codigo: "P1",
    produto: "Produto 1",
    unidade: "UN",
    curva: "A",
    quantidadeVendida: 300,
    quantidadeDevolvida: 0,
    quantidadeLiquidaReal: 300,
    demandaLiquida: 300,
    taxaDevolucao: 0,
    valorVendido: 3000,
    valorDevolvido: 0,
    valorVendaLiquida: 3000,
    taxaDevolucaoValor: 0,
    estoqueAtual: 0,
    mediaDiaria: 10,
    coberturaDias: 0,
    dataUltimoMovimento: "2026-10-19",
    produtoId: "ID-1",
    marca: "MARCA",
    custoAquisicaoMedio: 5,
    custoReposicaoMedio: 8,
    custoTotalMercadorias: 2400,
    margemBrutaPercentual: 20,
    custoEstoqueAquisicao: 0,
    custoEstoqueReposicao: 0,
    ...parcial,
  };
}

describe("decisao de compra", () => {
  it("sugere a quantidade para atingir a cobertura alvo", () => {
    // media 10/dia, alvo 30 dias = 300; estoque 40 => sugere 260
    expect(sugestaoCompra(item({ estoqueAtual: 40 }), 30)).toBe(260);
    expect(sugestaoCompra(item({ estoqueAtual: 400 }), 30)).toBe(0);
    expect(sugestaoCompra(item({ demandaLiquida: 0, mediaDiaria: 0 }), 30)).toBe(0);
  });

  it("calcula o custo da sugestao pelo custo de reposicao", () => {
    expect(custoSugestaoCompra(item({ estoqueAtual: 40 }), 30)).toBe(260 * 8);
    expect(custoSugestaoCompra(item({ estoqueAtual: 40, custoReposicaoMedio: null }), 30)).toBeNull();
  });

  it("classifica ruptura, critica, abaixo, saudavel e excesso", () => {
    expect(situacaoEstoque(item({ estoqueAtual: 0 }), 30)).toBe("ruptura");
    expect(situacaoEstoque(item({ estoqueAtual: 60, coberturaDias: 6 }), 30)).toBe("critica");
    expect(situacaoEstoque(item({ estoqueAtual: 200, coberturaDias: 20 }), 30)).toBe("abaixo");
    expect(situacaoEstoque(item({ estoqueAtual: 300, coberturaDias: 30 }), 30)).toBe("saudavel");
    expect(situacaoEstoque(item({ estoqueAtual: 700, coberturaDias: 70 }), 30)).toBe("excesso");
  });

  it("classifica produtos sem demanda e sem saldo localizado", () => {
    expect(situacaoEstoque(item({ demandaLiquida: 0, mediaDiaria: 0 }), 30)).toBe("sem-demanda");
    expect(situacaoEstoque(item({ estoqueAtual: null, coberturaDias: null }), 30)).toBe("sem-saldo");
    expect(rotuloSituacao("sem-saldo")).toBe("Sem saldo localizado");
  });

  it("resume sugestao, rupturas e capital parado", () => {
    const itens = [
      item({ codigo: "A", estoqueAtual: 0, custoEstoqueReposicao: 0 }),
      item({ codigo: "B", estoqueAtual: 700, coberturaDias: 70, custoEstoqueReposicao: 5600 }),
      item({ codigo: "C", demandaLiquida: 0, mediaDiaria: 0, custoEstoqueReposicao: 400 }),
    ];

    const resumo = resumirDecisaoCompra(itens, 30);
    expect(resumo.rupturas).toBe(1);
    expect(resumo.excessoProdutos).toBe(1);
    expect(resumo.semDemandaProdutos).toBe(1);
    expect(resumo.excessoCapital).toBe(5600);
    expect(resumo.semDemandaCapital).toBe(400);
    expect(resumo.unidadesSugeridas).toBe(300 + 0 + 0);
  });

  it("ordena por sugestao, capital em estoque, cobertura e margem", () => {
    const a = item({ codigo: "A", estoqueAtual: 0, custoEstoqueReposicao: 100, margemBrutaPercentual: 10 });
    const b = item({ codigo: "B", estoqueAtual: 250, coberturaDias: 25, custoEstoqueReposicao: 900, margemBrutaPercentual: 40 });

    expect(ordenarItensCompras([b, a], "sugestao", 30).map((i) => i.codigo)).toEqual(["A", "B"]);
    expect(ordenarItensCompras([a, b], "estoque-valor", 30).map((i) => i.codigo)).toEqual(["B", "A"]);
    expect(ordenarItensCompras([b, a], "cobertura", 30).map((i) => i.codigo)).toEqual(["A", "B"]);
    expect(ordenarItensCompras([a, b], "margem", 30).map((i) => i.codigo)).toEqual(["B", "A"]);
  });
});
