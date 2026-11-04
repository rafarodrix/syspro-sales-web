import { describe, expect, it } from "vitest";
import {
  diasBaseDemanda,
  reconstruirDiasEstoque,
  semBaseDeEstoque,
} from "@/lib/ruptura";
import type { MovimentoKardex } from "@/lib/kardex";

function movimento(
  data: string,
  quantidadeAnterior: number,
  quantidadeMovimentada: number,
  extras: Partial<MovimentoKardex> = {},
): MovimentoKardex {
  return {
    produtoIdProduto: "ID-1",
    produtoCodigoAuxiliar: "P1",
    produtoDescricao: "Produto 1",
    dataMovimento: data,
    grupoDocumento: "EVP",
    quantidadeAnterior,
    quantidadeMovimentada,
    saldo: quantidadeAnterior + quantidadeMovimentada,
    valorTotal: 0,
    ...extras,
  } as MovimentoKardex;
}

/** Gera uma saída de 1 unidade a cada `passo` dias, começando `inicio` dias após 01/01/2026. */
function saidas(inicio: number, passo: number, quantidade: number, estoqueInicial: number) {
  const base = Date.UTC(2026, 0, 1);
  const movimentos: MovimentoKardex[] = [];
  let anterior = estoqueInicial;
  for (let i = 0; i < quantidade; i += 1) {
    const dia = new Date(base + (inicio + i * passo - 1) * 86_400_000).toISOString().slice(0, 10);
    movimentos.push(movimento(dia, anterior, -1));
    anterior -= 1;
  }
  return movimentos;
}

describe("dias com estoque (sugestão de ruptura)", () => {
  it("conta os dias disponíveis quando o estoque acabou antes do fim do período", () => {
    // 90 dias de análise; 20 peças vendidas 1 a cada 3 dias, zerando no dia 60.
    const dias = reconstruirDiasEstoque(saidas(3, 3, 20, 20), {
      inicial: "2026-01-01",
      final: "2026-03-31",
    });

    expect(dias.diasComEstoque).toBe(60);
    expect(dias.diasEmRuptura).toBe(30);
    expect(dias.diasConsiderados).toBe(90);
    expect(dias.saldoAbertura).toBe(20);
    expect(dias.saldoFechamento).toBe(0);
    // Base da média passa a ser 60 dias: 20 ÷ 60 × 90 = 30 peças para 90 dias.
    expect(diasBaseDemanda(dias, 90)).toBe(60);
    expect(semBaseDeEstoque(dias)).toBe(false);
  });

  it("mantém o período inteiro como base quando nunca faltou estoque", () => {
    const movimentos = [
      movimento("2026-01-10", 100, -10),
      movimento("2026-02-10", 90, -10),
      movimento("2026-03-10", 80, -5),
    ];
    const dias = reconstruirDiasEstoque(movimentos, { inicial: "2026-01-01", final: "2026-03-31" });

    expect(dias.diasComEstoque).toBe(90);
    expect(dias.diasEmRuptura).toBe(0);
    expect(diasBaseDemanda(dias, 90)).toBe(90);
  });

  it("conta o dia em que a última peça foi vendida como dia com estoque", () => {
    const dias = reconstruirDiasEstoque([movimento("2026-01-05", 1, -1)], {
      inicial: "2026-01-01",
      final: "2026-01-10",
    });

    expect(dias.diasComEstoque).toBe(5);
    expect(dias.diasEmRuptura).toBe(5);
  });

  it("não projeta quando o Kardex nunca registrou saldo positivo", () => {
    const dias = reconstruirDiasEstoque(
      [movimento("2026-01-05", -91, -1), movimento("2026-01-06", -92, -1)],
      { inicial: "2026-01-01", final: "2026-01-10" },
    );

    expect(dias.diasComEstoque).toBe(0);
    expect(semBaseDeEstoque(dias)).toBe(true);
    // Sem base confiável a média volta a ser a do período inteiro.
    expect(diasBaseDemanda(dias, 10)).toBe(10);
  });

  it("não considera dias anteriores ao primeiro movimento de produto novo", () => {
    const dias = reconstruirDiasEstoque([movimento("2026-01-21", 0, 10)], {
      inicial: "2026-01-01",
      final: "2026-01-31",
    });

    expect(dias.diasConsiderados).toBe(11);
    expect(dias.diasComEstoque).toBe(11);
    expect(dias.diasEmRuptura).toBe(0);
  });

  it("ignora movimentos de outro grupo de estoque", () => {
    const movimentos = [
      movimento("2026-01-02", 5, -1, { grupoEstoque: "GERAL" }),
      movimento("2026-01-03", 0, -5, { grupoEstoque: "FISCAL" }),
      movimento("2026-01-04", 4, -1, { grupoEstoque: "GERAL" }),
    ];
    const dias = reconstruirDiasEstoque(movimentos, { inicial: "2026-01-01", final: "2026-01-05" }, {
      grupoEstoquePadrao: "GERAL",
    });

    expect(dias.saldoAbertura).toBe(5);
    expect(dias.saldoFechamento).toBe(3);
    expect(dias.diasEmRuptura).toBe(0);
  });

  it("devolve vazio quando o produto não se movimentou no período", () => {
    const dias = reconstruirDiasEstoque([], { inicial: "2026-01-01", final: "2026-01-10" });
    expect(dias.diasConsiderados).toBe(0);
    expect(dias.diasComEstoque).toBe(0);
    expect(semBaseDeEstoque(dias)).toBe(true);
  });
});
