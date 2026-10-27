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

  it("usa a quantidade da rota produto/venda e ignora linha duplicada do Kardex e ENP fiscal", () => {
    const resultado = montarSaudeEstoque([
      movimento({ produtoIdProduto: "1", quantidadeMovimentada: -6, saldo: 10 }),
      movimento({ produtoIdProduto: "1", quantidadeMovimentada: -6, saldo: 4 }),
      movimento({
        produtoIdProduto: "1",
        grupoDocumento: "ENP",
        quantidadeMovimentada: -3,
        saldo: 1,
        classificacao: { categoria: "fiscal", direcao: "saida", rotulo: "Emissão fiscal de venda (NF-e)" },
      }),
      movimento({ produtoIdProduto: "1", grupoDocumento: "EVP", quantidadeMovimentada: -3, saldo: 1, dataMovimento: "2026-10-05" }),
    ], [
      venda({ produto_id: "1", produto_qtde: 5, produto_vlr_total_item: 100 }),
    ], { inicial: "01/10/2026", final: "10/10/2026" });

    expect(resultado.posicoes[0]).toMatchObject({
      quantidadeVendida: 5,
      estoqueAtual: 1,
      demandaLiquida: 5,
    });
  });

  it("calcula demanda líquida, cobertura e valores sem misturar aquisição e reposição", () => {
    const resultado = montarSaudeEstoque([
      movimento({ produtoIdProduto: "1", quantidadeMovimentada: -10, saldo: 20, dataMovimento: "2026-10-02" }),
      movimento({ produtoIdProduto: "1", grupoDocumento: "EDV", quantidadeMovimentada: 2, saldo: 22, valorTotal: 30, dataMovimento: "2026-10-03", direcao: "entrada", classificacao: { categoria: "devolucao_venda", direcao: "entrada", rotulo: "Devolução" } }),
    ], [
      venda({ produto_id: "1", produto_qtde: 10, produto_vlr_total_item: 200, produto_vlr_custo_aquisicao: 4, produto_vlr_custo_reposicao: 5 }),
    ], { inicial: "01/10/2026", final: "10/10/2026" });

    expect(resultado.posicoes[0]).toMatchObject({
      estoqueAtual: 22,
      quantidadeVendida: 10,
      quantidadeDevolvida: 2,
      valorVendido: 200,
      valorDevolvido: 30,
      taxaDevolucaoQuantidade: 20,
      taxaDevolucaoValor: 15,
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
    expect(resultado.resumo).toMatchObject({
      taxaDevolucaoQuantidade: 20,
      taxaDevolucaoValor: 15,
      saldosNegativos: 0,
    });
  });

  it("mede saldo negativo e capital em excesso pelo custo de reposição", () => {
    const resultado = montarSaudeEstoque([
      movimento({ produtoIdProduto: "1", quantidadeMovimentada: -1, saldo: 100 }),
      movimento({ produtoIdProduto: "2", quantidadeMovimentada: -2, saldo: -2 }),
    ], [
      venda({ produto_id: "1", produto_qtde: 1, produto_vlr_custo_reposicao: 5 }),
      venda({ produto_id: "2", produto_qtde: 2, produto_vlr_custo_reposicao: 7 }),
    ], { inicial: "01/10/2026", final: "10/10/2026" });

    expect(resultado.posicoes.find((item) => item.estoqueAtual === 100)?.situacao).toBe("excesso");
    expect(resultado.posicoes.find((item) => item.estoqueAtual === -2)?.situacao).toBe("ruptura");
    expect(resultado.resumo.capitalExcesso).toBe(500);
    expect(resultado.resumo.saldosNegativos).toBe(1);
  });

  it("respeita os limites de cobertura configurados por empresa", () => {
    const resultado = montarSaudeEstoque([
      movimento({ produtoIdProduto: "1", quantidadeMovimentada: -10, saldo: 12 }),
      movimento({ produtoIdProduto: "2", quantidadeMovimentada: -10, saldo: 40 }),
    ], [
      venda({ produto_id: "1", produto_qtde: 10 }),
      venda({ produto_id: "2", produto_qtde: 10 }),
    ], { inicial: "01/10/2026", final: "10/10/2026" }, {
      criticoDias: 5,
      atencaoDias: 20,
      excessoDias: 30,
    });

    expect(resultado.posicoes.find((item) => item.estoqueAtual === 12)?.situacao).toBe("atencao");
    expect(resultado.posicoes.find((item) => item.estoqueAtual === 40)?.situacao).toBe("excesso");
  });

  it("calcula o saldo pelo grupo de estoque configurado na empresa", () => {
    const resultado = montarSaudeEstoque([
      movimento({ produtoIdProduto: "1", grupoEstoque: "FURO", saldo: 8, dataMovimento: "2026-10-02" }),
      movimento({ produtoIdProduto: "1", grupoEstoque: "GERAL", saldo: 3, dataMovimento: "2026-10-03" }),
    ], [], { inicial: "01/10/2026", final: "10/10/2026" }, undefined, { grupoEstoquePadrao: "FURO" });

    expect(resultado.posicoes[0]?.estoqueAtual).toBe(8);
  });

  it("não considera movimentos sem ID no agrupamento e informa a inconsistência", () => {
    const resultado = montarSaudeEstoque([
      movimento({ produtoIdProduto: "", produtoCodigoAuxiliar: "SEM-ID" }),
    ], [], { inicial: "01/10/2026", final: "10/10/2026" });

    expect(resultado.posicoes).toHaveLength(0);
    expect(resultado.resumo.movimentosSemProdutoId).toBe(1);
  });
});
