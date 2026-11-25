import { describe, expect, it } from "vitest";

import {
  COLUNAS_ITENS_CLIENTE,
  indexarContatos,
  montarItensPorCliente,
  normalizarNomeCliente,
  tipoDoItem,
} from "@/lib/itens-por-cliente";

function venda(over: Record<string, unknown> = {}) {
  return {
    empresa_codigo: "1",
    nf_numero: "123",
    nf_dt_emissao: "2026-11-05",
    cliente_nome: "  MARIA  DA SILVA ",
    produto_codigo_auxiliar: "P1",
    produto_descricao: "RACAO 10KG",
    produto_departamento: "RACAO",
    produto_un: "UN",
    produto_qtde: 2,
    produto_vlr_item: 50,
    produto_vlr_total_liquido: 100,
    produto_vlr_total_item: 100,
    produto_vlr_desconto: 0,
    ...over,
  } as never;
}

describe("itens por cliente", () => {
  it("classifica banho e tosa como serviço", () => {
    expect(tipoDoItem("BANHO E TOSA")).toBe("Serviço");
    expect(tipoDoItem("Estética")).toBe("Serviço");
    expect(tipoDoItem("RACAO")).toBe("Mercadoria");
  });

  it("normaliza o nome para cruzar com o cadastro", () => {
    expect(normalizarNomeCliente("  maria   da silva ")).toBe("MARIA DA SILVA");
  });

  it("prefere o contato que tem telefone", () => {
    const mapa = indexarContatos([
      { codigo: "1", nome: "MARIA DA SILVA", telefone: "" },
      { codigo: "1", nome: "maria da silva", telefone: "34 99999-0000" },
    ]);
    expect(mapa.get("MARIA DA SILVA")?.telefone).toBe("34 99999-0000");
  });

  it("monta a linha com data pt-BR, unitário calculado e telefone", () => {
    const contatos = indexarContatos([
      { codigo: "CLI-9", nome: "MARIA DA SILVA", telefone: "34 99999-0000" },
    ]);
    const [linha] = montarItensPorCliente([venda()], contatos);

    expect(linha).toHaveLength(COLUNAS_ITENS_CLIENTE.length);
    expect(linha[0]).toBe("CLI-9");
    expect(linha[1]).toBe("MARIA DA SILVA");
    expect(linha[2]).toBe("34 99999-0000");
    expect(linha[3]).toBe("05/11/2026");
    expect(linha[6]).toBe("RACAO");
    expect(linha[7]).toBe("Mercadoria");
    expect(linha[9]).toBe(2);
    expect(String(linha[10])).toContain("50,00");
    expect(String(linha[11])).toContain("100,00");
    expect(linha[13]).toBe("123");
  });

  it("deixa telefone vazio quando o cliente não está no cadastro", () => {
    const [linha] = montarItensPorCliente([venda()]);
    expect(linha[2]).toBe("");
  });
});
