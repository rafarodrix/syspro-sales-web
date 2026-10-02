import { describe, expect, it } from "vitest";
import type { VendaProduto } from "@/lib/syspro-api";
import {
  analisarFrequenciaClientes,
  dataCompraIso,
  filtrarFrequencia,
  normalizarClientes,
} from "./clientes-frequencia";

function venda(
  nome: string,
  data: string,
  campos: Partial<VendaProduto> = {},
): VendaProduto {
  return {
    empresa_codigo: "1",
    nf_numero: `${nome}-${data}`,
    nf_dt_emissao: data,
    nf_modelo: "55",
    nf_forma_pagto: "PIX",
    cliente_nome: nome,
    cliente_cidade: "São Paulo",
    cliente_uf: "SP",
    vendedor_nome: "Vendedor",
    produto_id: "P1",
    produto_descricao: "Produto",
    produto_departamento: "Geral",
    produto_un: "UN",
    produto_qtde: 1,
    produto_vlr_item: 100,
    produto_vlr_icms_stb: 0,
    produto_vlr_desconto: 0,
    produto_vlr_frete: 0,
    produto_vlr_total_item: 100,
    produto_vlr_total_liquido: 100,
    ...campos,
  };
}
const trimestre = { inicial: "2026-07-01", final: "2026-09-30" };
const anterior = { inicial: "2026-03-31", final: "2026-06-30" };

describe("frequência de clientes", () => {
  it("conta dias distintos, não itens nem notas, normaliza nomes e mantém meses sem compra", () => {
    const resultado = analisarFrequenciaClientes(
      [
        venda(" Ana  Silva ", "2026-07-10"),
        venda("ANA SILVA", "10/07/2026", { produto_id: "P2" }),
        venda("ana silva", "2026-07-10T15:00:00-03:00", { nf_numero: "outra" }),
        venda("Ana Silva", "2026-09-10"),
      ],
      [],
      trimestre,
      anterior,
      true,
    );
    expect(resultado.itens).toHaveLength(1);
    expect(resultado.itens[0]).toMatchObject({
      nome: "ANA SILVA",
      diasComCompra: 2,
      porMes: [1, 0, 1],
      mesesComCompra: 2,
      frequencia: 2 / 3,
      intervaloMedio: 62,
      ultimaCompra: "2026-09-10",
      diasSemCompra: 20,
      faturamento: 400,
    });
    expect(resultado.unidade).toBe("dias/mês");
  });

  it("exclui balcão da frequência e dos referenciais, mas informa sua receita separada", () => {
    const resultado = analisarFrequenciaClientes(
      [
        venda("CONSUMIDOR FINAL", "2026-07-01"),
        venda("", "2026-07-01"),
        venda("Ana", "2026-07-01"),
        venda("Bruno", "2026-07-01"),
        ...Array.from({ length: 10 }, (_, i) =>
          venda("Carla", `2026-07-${String(i + 1).padStart(2, "0")}`),
        ),
      ],
      [],
      trimestre,
      null,
      false,
    );
    expect(resultado.ativos).toBe(3);
    expect(resultado.media).toBeCloseTo(4 / 3);
    expect(resultado.mediana).toBeCloseTo(1 / 3);
    expect(resultado.faturamentoNaoIdentificado).toBe(200);
  });

  it("normaliza janelas parciais por dias corridos inclusive em ano bissexto", () => {
    const resultado = analisarFrequenciaClientes(
      [venda("Ana", "2024-02-29")],
      [],
      { inicial: "2024-02-15", final: "2024-03-15" },
      null,
      false,
    );
    expect(resultado.unidade).toBe("dias/30 dias");
    expect(resultado.itens[0]).toMatchObject({
      frequencia: 1,
      porMes: [1, 0],
      intervaloMedio: null,
      diasSemCompra: 15,
    });
    expect(dataCompraIso("2026-02-29")).toBeNull();
    expect(dataCompraIso("31/02/2026")).toBeNull();
    expect(dataCompraIso("2024-02-29")).toBe("2024-02-29");
  });

  it("inclui clientes só do anterior e calcula queda sem fingir novo cliente ou dividir por zero", () => {
    const resultado = analisarFrequenciaClientes(
      [venda("Ana", "2026-07-10"), venda("Bruno", "2026-08-01")],
      [
        venda("Ana", "2026-04-10"),
        venda("Ana", "2026-05-10"),
        venda("Carla", "2026-06-10"),
      ],
      trimestre,
      anterior,
      true,
    );
    expect(resultado.itens.find((item) => item.nome === "ANA")).toMatchObject({
      variacaoFrequencia: -50,
      variacaoFaturamento: -50,
      situacao: "ambos",
    });
    expect(resultado.itens.find((item) => item.nome === "BRUNO")).toMatchObject(
      {
        variacaoFrequencia: null,
        variacaoFaturamento: null,
        situacao: "so-atual",
      },
    );
    expect(resultado.itens.find((item) => item.nome === "CARLA")).toMatchObject(
      {
        diasComCompra: 0,
        frequencia: 0,
        classe: null,
        porMes: [0, 0, 0],
        ultimaCompra: "2026-06-10",
        situacao: "sem-compra",
        variacaoFrequencia: -100,
      },
    );
    expect(resultado.ativos).toBe(2);
    expect(
      filtrarFrequencia(resultado.itens, "carla", "todas", "sem-compra"),
    ).toHaveLength(1);
    expect(
      filtrarFrequencia(resultado.itens, "carla", "A", "sem-compra"),
    ).toHaveLength(0);
  });

  it("não trata falha no comparativo como período anterior zerado", () => {
    const resultado = analisarFrequenciaClientes(
      [venda("Ana", "2026-07-10")],
      [venda("Bruno", "2026-06-10")],
      trimestre,
      anterior,
      false,
    );
    expect(resultado.itens).toHaveLength(1);
    expect(resultado.itens[0]).toMatchObject({
      situacao: "sem-comparativo",
      frequenciaAnterior30: null,
      faturamentoAnterior: null,
      variacaoFrequencia: null,
    });
    expect(resultado.comparar).toBe(false);
  });

  it("preserva clientes sem compra quando todo o período atual está vazio", () => {
    const resultado = analisarFrequenciaClientes(
      [],
      [venda("Ana", "2026-06-01")],
      trimestre,
      anterior,
      true,
    );
    expect(resultado.itens).toHaveLength(1);
    expect(resultado.itens[0].situacao).toBe("sem-compra");
    expect(resultado.ativos).toBe(0);
    expect(resultado.media).toBe(0);
    expect(resultado.mediana).toBe(0);
  });

  it("ignora datas fora da janela, sinaliza datas inválidas e usa recência até a data final", () => {
    const resultado = analisarFrequenciaClientes(
      [
        venda("Ana", "2026-06-30"),
        venda("Ana", "2026-07-01"),
        venda("Ana", "2026-09-30"),
        venda("Ana", "2026-10-01"),
        venda("Bruno", "inválida"),
      ],
      [],
      trimestre,
      null,
      false,
    );
    expect(resultado.itens[0]).toMatchObject({
      diasComCompra: 2,
      faturamento: 200,
      diasSemCompra: 0,
      intervaloMedio: 91,
    });
    expect(resultado.itens[1]).toMatchObject({
      diasComCompra: 0,
      ultimaCompra: null,
      diasSemCompra: null,
    });
    expect(resultado.registrosSemData).toBe(1);
    expect(resultado.ativos).toBe(1);
  });

  it("deduplica dias entre empresas no consolidado e preserva os dados de origem", () => {
    const lista = [
      venda(" Ana ", "2026-07-01"),
      venda("ana", "2026-07-01", { empresa_codigo: "2" }),
    ];
    expect(
      analisarFrequenciaClientes(lista, [], trimestre, null, false).itens[0],
    ).toMatchObject({ diasComCompra: 1, faturamento: 200 });
    expect(normalizarClientes(lista)[0].cliente_nome).toBe("ANA");
    expect(lista[0].cliente_nome).toBe(" Ana ");
  });

  it("filtra regularidade e compra em um dia sem recalcular os referenciais da carteira", () => {
    const resultado = analisarFrequenciaClientes(
      [
        venda("Ana", "2026-07-01"),
        venda("Ana", "2026-08-01"),
        venda("Ana", "2026-09-01"),
        venda("Bruno", "2026-07-01"),
      ],
      [],
      trimestre,
      null,
      false,
    );
    expect(
      filtrarFrequencia(resultado.itens, "", "todas", "regulares").map(
        (item) => item.nome,
      ),
    ).toEqual(["ANA"]);
    expect(
      filtrarFrequencia(resultado.itens, "", "todas", "unico-dia").map(
        (item) => item.nome,
      ),
    ).toEqual(["BRUNO"]);
    expect(
      filtrarFrequencia(resultado.itens, " SP ", "todas", "todos"),
    ).toHaveLength(2);
    expect(resultado.media).toBeCloseTo(2 / 3);
  });


  it("reconhece o mesmo cliente entre períodos apesar de acento e pontuação", () => {
    const atual = [
      venda({
        nf_numero: "100",
        cliente_nome: "PAOLA EMANUELE PEREIRA DE SOUZA",
        nf_dt_emissao: "2026-09-10",
      }),
    ];
    const anterior = [
      venda({
        nf_numero: "90",
        cliente_nome: "Paola Emanuèle Pereira de Souza.",
        nf_dt_emissao: "2026-06-10",
      }),
    ];

    const resultado = analisarFrequenciaClientes(
      atual,
      anterior,
      { inicial: "2026-07-01", final: "2026-09-30" },
      { inicial: "2026-04-01", final: "2026-06-30" },
      true,
    );

    expect(resultado.itens).toHaveLength(1);
    expect(resultado.itens[0].situacao).toBe("ambos");
    expect(resultado.itens[0].diasAnteriores).toBe(1);
  });
});
