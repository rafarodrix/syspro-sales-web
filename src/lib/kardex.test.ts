import { describe, expect, it } from "vitest";
import {
  classificarMovimentoKardex,
  normalizarMovimentoKardex,
  validarPeriodoKardex,
} from "@/lib/kardex";

describe("Kardex", () => {
  it("normaliza os campos kardex_* retornados pelo Syspro", () => {
    const movimento = normalizarMovimentoKardex({
      empresa_codigo: "1",
      empresa_nome: "Empresa de teste",
      participante_nome: "CONSUMIDOR",
      produto_codigo_auxiliar: "1263",
      produto_descricao: "Produto teste",
      produto_vlr_total: 21,
      kardex_data_movimento: "2026-09-01",
      kardex_qtde_anterior: 52,
      kardex_qtde_movimento: -1,
      kardex_qtde_saldo: 51,
      kardex_nro_documento: "4955",
      kardex_cd_grupo_documento: "EVP",
      kardex_ds_grupo_documento: "EMISSAO DE VENDA DE PRODUTOS PDV",
      kardex_operacao: "S",
      kardex_modelo_documento: "65",
    });

    expect(movimento).toMatchObject({
      empresaCodigo: "1",
      produtoCodigoAuxiliar: "1263",
      quantidadeMovimentada: -1,
      saldo: 51,
      grupoDocumento: "EVP",
      direcao: "saida",
    });
  });

  it("classifica EDV como devolução de venda e entrada quando a API indicar E", () => {
    expect(classificarMovimentoKardex("EDV", "E")).toEqual({
      categoria: "devolucao_venda",
      direcao: "entrada",
      rotulo: "Devolução de venda",
    });
  });

  it("preserva EDC como devolução de compra sem assumir o sentido", () => {
    expect(classificarMovimentoKardex("EDC", "S")).toEqual({
      categoria: "devolucao_compra",
      direcao: "saida",
      rotulo: "Devolução de compra",
    });
  });

  it("classifica transferência, bonificação e ajuste pelos códigos reais", () => {
    expect(classificarMovimentoKardex("EST", "S")).toMatchObject({ categoria: "transferencia", direcao: "saida" });
    expect(classificarMovimentoKardex("EET", "E")).toMatchObject({ categoria: "transferencia", direcao: "entrada" });
    expect(classificarMovimentoKardex("EBC", "S")).toMatchObject({ categoria: "bonificacao", direcao: "saida" });
    expect(classificarMovimentoKardex("EA", "E")).toMatchObject({ categoria: "outros", rotulo: "Ajuste de estoque" });
  });

  it("diferencia EOS pela descrição retornada pelo Syspro", () => {
    expect(classificarMovimentoKardex("EOS", "S", "EMISSAO DE VENDA FUTURA")).toMatchObject({ categoria: "venda", rotulo: "Venda futura" });
    expect(classificarMovimentoKardex("EOS", "S", "EMISSAO POR OUTRAS SAIDAS")).toMatchObject({ categoria: "outros", rotulo: "Outras saídas" });
  });

  it("aceita no máximo 31 dias de Kardex", () => {
    expect(validarPeriodoKardex("01/09/2026", "01/10/2026")).toBe(true);
    expect(validarPeriodoKardex("01/09/2026", "02/10/2026")).toBe(false);
  });
});
