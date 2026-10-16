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
      estoqueAtual: 20,
      dataUltimoMovimento: "2026-10-15",
      curva: "A",
    });
    expect(relatorio.resumo).toMatchObject({
      totalProdutos: 2,
      quantidadeVendida: 40,
      quantidadeDevolvida: 4,
      produtosSemSaldo: 0,
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

  it("divide consultas longas em janelas inclusivas de no maximo 31 dias", () => {
    expect(dividirPeriodoKardex("2026-07-19", "2026-10-16")).toEqual([
      { inicial: "2026-07-19", final: "2026-08-18" },
      { inicial: "2026-08-19", final: "2026-09-18" },
      { inicial: "2026-09-19", final: "2026-10-16" },
    ]);
  });
});
