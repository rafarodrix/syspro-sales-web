import { describe, expect, it } from "vitest";
import type { MovimentoKardex } from "@/lib/kardex";
import type { VendaProduto } from "@/lib/syspro-api";
import { montarSaudeEstoque } from "@/lib/estoque-saude";

function movimento(parcial: Partial<MovimentoKardex>): MovimentoKardex {
  return {
    empresaCodigo: "1",
    empresaNome: "Empresa",
    participante: "",
    produtoCodigoAuxiliar: "REF",
    produtoDescricao: "Produto",
    valorTotal: 0,
    dataMovimento: "2026-10-01",
    quantidadeAnterior: 0,
    quantidadeMovimentada: 0,
    saldo: 0,
    documento: "1",
    grupoDocumento: "EVP",
    descricaoGrupoDocumento: "Venda",
    operacaoSyspro: "S",
    modeloDocumento: "65",
    direcao: "saida",
    classificacao: { categoria: "venda", direcao: "saida", rotulo: "Venda" },
    ...parcial,
  };
}

function venda(parcial: Partial<VendaProduto>): VendaProduto {
  return {
    empresa_codigo: "1", nf_numero: "1", cliente_nome: "", cliente_cidade: "", cliente_uf: "",
    produto_id: "1", produto_descricao: "Produto", produto_departamento: "", produto_un: "UN",
    produto_qtde: 1, produto_vlr_item: 0, produto_vlr_icms_stb: 0, produto_vlr_desconto: 0,
    produto_vlr_frete: 0, produto_vlr_total_item: 0, vendedor_nome: "", nf_dt_emissao: "01/10/2026",
    nf_modelo: "65", nf_forma_pagto: "", ...parcial,
  };
}

describe("saúde do estoque", () => {
  it("usa o ID como chave mesmo quando dois produtos têm o mesmo código auxiliar", () => {
    const resultado = montarSaudeEstoque([
      movimento({ produtoIdProduto: "1", produtoDescricao: "Produto A", saldo: 5 }),
      movimento({ produtoIdProduto: "2", produtoDescricao: "Produto B", saldo: 8 }),
    ], [], { inicial: "01/10/2026", final: "10/10/2026" });

    expect(resultado.posicoes).toHaveLength(2);
    expect(resultado.posicoes.map((item) => item.produto)).toEqual(expect.arrayContaining(["Produto A", "Produto B"]));
    expect(resultado.posicoes[0]).not.toHaveProperty("produtoId");
  });

  it("calcula demanda líquida, cobertura e valores sem misturar aquisição e reposição", () => {
    const resultado = montarSaudeEstoque([
      movimento({ produtoIdProduto: "1", quantidadeMovimentada: -10, saldo: 20, dataMovimento: "2026-10-02" }),
      movimento({ produtoIdProduto: "1", grupoDocumento: "EDV", quantidadeMovimentada: 2, saldo: 22, valorTotal: 30, dataMovimento: "2026-10-03", direcao: "entrada", classificacao: { categoria: "devolucao_venda", direcao: "entrada", rotulo: "Devolução" } }),
    ], [
      venda({ produto_id: "1", produto_qtde: 10, produto_vlr_custo_aquisicao: 4, produto_vlr_custo_reposicao: 5 }),
    ], { inicial: "01/10/2026", final: "10/10/2026" });

    expect(resultado.posicoes[0]).toMatchObject({
      estoqueAtual: 22,
      quantidadeVendida: 10,
      quantidadeDevolvida: 2,
      demandaLiquida: 8,
      mediaDiaria: 0.8,
      coberturaDias: 27.5,
      custoAquisicaoMedio: 4,
      custoReposicaoMedio: 5,
      valorAquisicao: 88,
      valorReposicao: 110,
      situacao: "saudavel",
    });
    expect(resultado.resumo.devolucoesVendaValor).toBe(30);
  });

  it("não considera movimentos sem ID no agrupamento e informa a inconsistência", () => {
    const resultado = montarSaudeEstoque([
      movimento({ produtoIdProduto: "", produtoCodigoAuxiliar: "SEM-ID" }),
    ], [], { inicial: "01/10/2026", final: "10/10/2026" });

    expect(resultado.posicoes).toHaveLength(0);
    expect(resultado.resumo.movimentosSemProdutoId).toBe(1);
  });
});
