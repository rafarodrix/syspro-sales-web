import { describe, expect, it } from "vitest";
import { dividirPeriodoKardex, montarRelatorioCompras } from "@/lib/relatorio-compras";
import type { MovimentoKardex } from "@/lib/kardex";
import type { VendaProduto } from "@/lib/syspro-api";

function venda(codigo: string, quantidade: number, descricao = `Produto ${codigo}`) {
  return {
    produto_id: codigo,
    produto_descricao: descricao,
    produto_un: "UN",
    produto_qtde: quantidade,
  } as VendaProduto;
}

function movimento(
  codigo: string,
  data: string,
  grupo: string,
  quantidade: number,
  saldo: number,
) {
  return {
    produtoCodigoAuxiliar: codigo,
    produtoDescricao: `Produto ${codigo}`,
    dataMovimento: data,
    grupoDocumento: grupo,
    quantidadeMovimentada: quantidade,
    saldo,
  } as MovimentoKardex;
}

describe("relatorio de compras", () => {
  it("combina vendas, devolucoes EDC e o saldo do movimento mais recente", () => {
    const relatorio = montarRelatorioCompras(
      [venda("SP1002A", 20), venda("SP1002A", 12), venda("SK202", 8)],
      [
        movimento("SP1002A", "2026-09-10", "EDC", -3, 17),
        movimento("SP1002A", "2026-10-15", "EVD", -1, 20),
        movimento("SK202", "2026-10-14", "EDC", -1, 8),
      ],
      { inicial: "2026-08-01", final: "2026-10-16" },
    );

    expect(relatorio.itens[0]).toMatchObject({
      codigo: "SP1002A",
      quantidadeVendida: 32,
      quantidadeDevolvida: 3,
      demandaLiquida: 29,
      taxaDevolucao: 9.375,
      estoqueAtual: 20,
      dataUltimoMovimento: "2026-10-15",
      curva: "A",
    });
    expect(relatorio.resumo).toMatchObject({
      totalProdutos: 2,
      quantidadeVendida: 40,
      quantidadeDevolvida: 4,
      demandaLiquida: 36,
      taxaDevolucao: 10,
      produtosSemSaldo: 0,
      produtosSemSaldoLocalizado: 0,
    });
  });

  it("relaciona o GUID da venda ao codigo auxiliar do Kardex", () => {
    const itemVendido = {
      ...venda("{47E770D8-EE38-474E-AFF3-3A1A51E3EDC4}", 10, "Água desmineralizada"),
      produto_codigo_auxiliar: "1263",
    };
    const relatorio = montarRelatorioCompras(
      [itemVendido],
      [movimento("1263", "2026-10-10", "EDC", -2, 8)],
      { inicial: "2026-10-01", final: "2026-10-31" },
    );

    expect(relatorio.itens[0]).toMatchObject({
      codigo: "1263",
      quantidadeDevolvida: 2,
      estoqueAtual: 8,
    });
  });

  it("usa a descricao como compatibilidade quando a venda nao traz codigo auxiliar", () => {
    const relatorio = montarRelatorioCompras(
      [venda("{47E770D8-EE38-474E-AFF3-3A1A51E3EDC4}", 10, "Água  desmineralizada")],
      [{
        ...movimento("1263", "2026-10-10", "EDC", -2, 8),
        produtoDescricao: "AGUA DESMINERALIZADA",
      }],
      { inicial: "2026-10-01", final: "2026-10-31" },
    );

    expect(relatorio.itens[0]).toMatchObject({ quantidadeDevolvida: 2, estoqueAtual: 8 });
  });

  it("relaciona por ID e expõe marca e custos médios", () => {
    const relatorio = montarRelatorioCompras(
      [{
        ...venda("AUX-1", 2, "Produto com marca"),
        produto_id: "GUID-1",
        produto_codigo_auxiliar: "AUX-1",
        produto_vlr_custo_aquisicao: 10,
        produto_vlr_custo_reposicao: 12,
      }],
      [{
        ...movimento("OUTRO-AUX", "2026-10-10", "EVD", -1, 8),
        produtoIdProduto: "GUID-1",
        produtoMarca: "MARCA TESTE",
      }],
      { inicial: "2026-10-01", final: "2026-10-31" },
    );

    expect(relatorio.itens[0]).toMatchObject({
      produtoId: "GUID-1",
      marca: "MARCA TESTE",
      custoAquisicaoMedio: 10,
      custoReposicaoMedio: 12,
      estoqueAtual: 8,
    });
  });
  it("nao soma EDC fora do periodo de vendas, mas usa o movimento no saldo atual", () => {
    const relatorio = montarRelatorioCompras(
      [venda("10", 5)],
      [movimento("10", "2026-10-10", "EDC", -2, 9)],
      { inicial: "2026-09-01", final: "2026-09-30" },
    );

    expect(relatorio.itens[0]).toMatchObject({ quantidadeDevolvida: 0, estoqueAtual: 9 });
  });

  it("classifica como C quando as devolucoes anulam toda a demanda", () => {
    const relatorio = montarRelatorioCompras(
      [venda("10", 5)],
      [movimento("10", "2026-10-10", "EDC", -5, 5)],
      { inicial: "2026-10-01", final: "2026-10-10" },
    );

    expect(relatorio.itens[0]).toMatchObject({ demandaLiquida: 0, curva: "C" });
  });

  it("calcula demanda, cobertura e separa estoque zerado de saldo não localizado", () => {
    const relatorio = montarRelatorioCompras(
      [venda("A", 10), venda("B", 5)],
      [movimento("A", "2026-10-10", "EVD", -1, 0)],
      { inicial: "2026-10-01", final: "2026-10-10" },
    );

    expect(relatorio.itens.find((item) => item.codigo === "A")).toMatchObject({
      demandaLiquida: 10,
      mediaDiaria: 1,
      coberturaDias: 0,
    });
    expect(relatorio.itens.find((item) => item.codigo === "B")?.coberturaDias).toBeNull();
    expect(relatorio.resumo).toMatchObject({
      produtosSemSaldo: 1,
      produtosSemSaldoLocalizado: 1,
    });
  });

  it("divide consultas longas em janelas inclusivas de no maximo 31 dias", () => {
    expect(dividirPeriodoKardex("2026-07-19", "2026-10-16")).toEqual([
      { inicial: "2026-07-19", final: "2026-08-18" },
      { inicial: "2026-08-19", final: "2026-09-18" },
      { inicial: "2026-09-19", final: "2026-10-16" },
    ]);
  });
});
