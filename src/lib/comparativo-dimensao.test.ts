import { describe, expect, it } from "vitest";
import {
  compararDimensao,
  ordenarComparativo,
  resumirComparativo,
} from "@/lib/comparativo-dimensao";

describe("comparativo por dimensão", () => {
  const atual = [
    { nome: "Bebidas", faturamento: 600 },
    { nome: "Limpeza", faturamento: 300 },
    { nome: "Pet", faturamento: 100 },
  ];
  const anterior = [
    { nome: "Bebidas", faturamento: 400 },
    { nome: "Limpeza", faturamento: 500 },
    { nome: "Frios", faturamento: 100 },
  ];

  it("calcula variação em valor e percentual por dimensão", () => {
    const linhas = compararDimensao(atual, anterior);
    const bebidas = linhas.find((linha) => linha.nome === "Bebidas")!;
    expect(bebidas.variacaoValor).toBe(200);
    expect(bebidas.variacaoPercentual).toBeCloseTo(50);
    const limpeza = linhas.find((linha) => linha.nome === "Limpeza")!;
    expect(limpeza.variacaoValor).toBe(-200);
    expect(limpeza.variacaoPercentual).toBeCloseTo(-40);
  });

  it("marca item sem base anterior como novo e unifica a dimensão que desapareceu", () => {
    const linhas = compararDimensao(atual, anterior);
    const pet = linhas.find((linha) => linha.nome === "Pet")!;
    expect(pet.novo).toBe(true);
    expect(pet.variacaoPercentual).toBeNull();
    const frios = linhas.find((linha) => linha.nome === "Frios")!;
    expect(frios.novo).toBe(false);
    expect(frios.atual).toBe(0);
    expect(frios.variacaoValor).toBe(-100);
  });

  it("compara participação no total (mix)", () => {
    const linhas = compararDimensao(atual, anterior);
    const bebidas = linhas.find((linha) => linha.nome === "Bebidas")!;
    // total atual 1000 → 60%; total anterior 1000 → 40%
    expect(bebidas.participacaoAtual).toBeCloseTo(60);
    expect(bebidas.participacaoAnterior).toBeCloseTo(40);
    expect(bebidas.variacaoParticipacao).toBeCloseTo(20);
  });

  it("ordena por impacto, por queda e por ganho de participação", () => {
    const linhas = compararDimensao(atual, anterior);
    const porImpacto = ordenarComparativo(linhas, "impacto");
    expect(porImpacto[0].variacaoValor).toBe(200);
    const porQueda = ordenarComparativo(linhas, "queda");
    expect(porQueda.every((linha) => linha.variacaoValor < 0)).toBe(true);
    // maior queda percentual: Frios saiu de 100 para 0 (-100%)
    expect(porQueda[0].nome).toBe("Frios");
    expect(porQueda[1].nome).toBe("Limpeza");
    const porParticipacao = ordenarComparativo(linhas, "participacao");
    expect(porParticipacao[0].nome).toBe("Bebidas");
  });

  it("resume altas, quedas, novos e os maiores movimentos", () => {
    const resumo = resumirComparativo(compararDimensao(atual, anterior));
    expect(resumo.totalAtual).toBe(1000);
    expect(resumo.totalAnterior).toBe(1000);
    expect(resumo.cresceram).toBe(2); // Bebidas e Pet (novo)
    expect(resumo.cairam).toBe(2);
    expect(resumo.novos).toBe(1);
    expect(resumo.maiorAlta?.nome).toBe("Bebidas");
    expect(resumo.maiorQueda?.nome).toBe("Limpeza");
  });

  it("não gera divisão por zero quando a dimensão não tem faturamento", () => {
    const linhas = compararDimensao([{ nome: "Vazio", faturamento: 0 }], []);
    expect(linhas[0].participacaoAtual).toBe(0);
    expect(linhas[0].variacaoPercentual).toBeNull();
  });
});
