import { describe, expect, it } from "vitest";
import { montarAnaliseMargens } from "@/lib/analise-margens";
import type { RelatorioCompras } from "@/lib/relatorio-compras";

function relatorio(): RelatorioCompras {
  return {
    itens: [
      {
        codigo: "AUX-1",
        produto: "Produto rentável",
        unidade: "UN",
        curva: "A",
        quantidadeVendida: 10,
        quantidadeDevolvida: 2,
        quantidadeLiquidaReal: 8,
        demandaLiquida: 8,
        taxaDevolucao: 20,
        valorVendido: 200,
        valorDevolvido: 50,
        valorVendaLiquida: 150,
        taxaDevolucaoValor: 25,
        estoqueAtual: 4,
        mediaDiaria: 1,
        coberturaDias: 4,
        dataUltimoMovimento: "2026-10-10",
        custoReposicaoMedio: 10,
        custoTotalMercadorias: 80,
        margemBrutaPercentual: 46.6666667,
        custoEstoqueAquisicao: null,
        custoEstoqueReposicao: 40,
      },
      {
        codigo: "AUX-2",
        produto: "Produto sem custo",
        unidade: "UN",
        curva: "B",
        quantidadeVendida: 1,
        quantidadeDevolvida: 0,
        quantidadeLiquidaReal: 1,
        demandaLiquida: 1,
        taxaDevolucao: 0,
        valorVendido: 100,
        valorDevolvido: 0,
        valorVendaLiquida: 100,
        taxaDevolucaoValor: 0,
        estoqueAtual: null,
        mediaDiaria: 1,
        coberturaDias: null,
        dataUltimoMovimento: null,
        custoReposicaoMedio: null,
        custoTotalMercadorias: null,
        margemBrutaPercentual: null,
        custoEstoqueAquisicao: null,
        custoEstoqueReposicao: null,
      },
    ],
    resumo: {
      totalProdutos: 2,
      quantidadeVendida: 11,
      quantidadeDevolvida: 2,
      quantidadeLiquidaReal: 9,
      demandaLiquida: 9,
      taxaDevolucao: 18.18,
      valorVendido: 300,
      valorDevolvido: 50,
      valorVendaLiquida: 250,
      taxaDevolucaoValor: 16.67,
      produtosSemSaldo: 0,
      produtosSemSaldoLocalizado: 1,
      custoTotalMercadorias: 80,
      margemBruta: 70,
      margemBrutaPercentual: 46.67,
      coberturaCusto: 60,
      custoEstoqueAquisicao: 0,
      custoEstoqueReposicao: 40,
    },
  };
}

describe("análise de margens", () => {
  it("separa faturamento sem custo e calcula margem antes e depois da EDV", () => {
    const analise = montarAnaliseMargens([
      { empresaId: "empresa-1", empresaNome: "Mundial", relatorio: relatorio() },
    ]);

    expect(analise.itens[0]).toMatchObject({
      custoAntesEdv: 100,
      lucroAntesEdv: 100,
      margemAntesEdv: 50,
      custoDepoisEdv: 80,
      lucroDepoisEdv: 70,
      impactoLucroEdv: -30,
    });
    expect(analise.resumo).toMatchObject({
      faturamentoAntesEdv: 300,
      devolucoesEdv: 50,
      faturamentoDepoisEdv: 250,
      faturamentoSemCusto: 100,
      lucroAntesEdv: 100,
      lucroDepoisEdv: 70,
      margemAntesEdv: 50,
      impactoLucroEdv: -30,
      coberturaCusto: 60,
    });
    expect(analise.resumo.margemDepoisEdv).toBeCloseTo(46.6666667);
  });

  it("não deixa a cobertura de custo passar de 100% com item só de devolução", () => {
    const base = {
      codigo: "P1",
      produto: "Com venda",
      unidade: "UN",
      curva: "A" as const,
      quantidadeVendida: 10,
      quantidadeDevolvida: 0,
      quantidadeLiquidaReal: 10,
      demandaLiquida: 10,
      taxaDevolucao: 0,
      valorVendido: 200,
      valorDevolvido: 0,
      valorVendaLiquida: 200,
      taxaDevolucaoValor: 0,
      estoqueAtual: null,
      mediaDiaria: 0,
      coberturaDias: null,
      dataUltimoMovimento: null,
      custoReposicaoMedio: 10,
    };
    const soDevolucao = {
      ...base,
      codigo: "P2",
      produto: "Só devolução",
      curva: "C" as const,
      quantidadeVendida: 0,
      quantidadeDevolvida: 5,
      quantidadeLiquidaReal: -5,
      demandaLiquida: 0,
      valorVendido: 0,
      valorDevolvido: 50,
      valorVendaLiquida: -50,
      custoReposicaoMedio: null,
    };

    const analise = montarAnaliseMargens([
      {
        empresaId: "e1",
        empresaNome: "Empresa",
        relatorio: { itens: [base, soDevolucao], resumo: {} as never },
      },
    ]);

    expect(analise.resumo.coberturaCusto).toBeLessThanOrEqual(100);
    expect(analise.resumo.coberturaCusto).toBe(100);
  });
});
