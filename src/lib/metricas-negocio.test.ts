import { describe, expect, it } from "vitest";
import type { VendaProduto } from "@/lib/syspro-api";
import {
  calcularCoberturaEstoque,
  calcularDemandaLiquida,
  calcularDiasInclusivos,
  calcularPercentual,
  calcularVariacao,
  classificarCurvaABC,
  normalizarCodigoProduto,
  valorBrutoItem,
  valorLiquidoItem,
} from "@/lib/metricas-negocio";

const venda = {
  produto_vlr_total_item: 100,
  produto_vlr_total_liquido: 92,
  produto_vlr_desconto: 10,
  produto_vlr_frete: 1,
  produto_vlr_seguro: 2,
  produto_vlr_outros: 3,
} as VendaProduto;

describe("métricas compartilhadas de negócio", () => {
  it("separa valor bruto do líquido informado", () => {
    expect(valorBrutoItem(venda)).toBe(100);
    expect(valorLiquidoItem(venda)).toBe(92);
  });

  it("recompõe o líquido quando a API não o informa", () => {
    expect(valorLiquidoItem({ ...venda, produto_vlr_total_liquido: undefined })).toBe(96);
  });

  it("calcula percentuais sem divisão inválida", () => {
    expect(calcularPercentual(20, 100)).toBe(20);
    expect(calcularPercentual(20, 0)).toBe(0);
  });

  it("classifica a curva pelo acumulado anterior ao item", () => {
    expect(classificarCurvaABC(0)).toBe("A");
    expect(classificarCurvaABC(80)).toBe("B");
    expect(classificarCurvaABC(95)).toBe("C");
  });

  it("identifica variação sem base sem inventar crescimento de 100%", () => {
    expect(calcularVariacao(50, 0)).toMatchObject({ texto: "Novo", percentual: 0, semBase: true });
    expect(calcularVariacao(0, 0)).toMatchObject({ texto: "Sem movimento", neutro: true, semBase: true });
    expect(calcularVariacao(120, 100)).toMatchObject({ texto: "+20,0%", semBase: false });
  });

  it("normaliza produto, demanda líquida e cobertura de estoque", () => {
    expect(normalizarCodigoProduto(" ab-1 ")).toBe("AB-1");
    expect(calcularDemandaLiquida(10, 3)).toBe(7);
    expect(calcularDemandaLiquida(3, 5)).toBe(0);
    expect(calcularDiasInclusivos("2026-10-01", "2026-10-10")).toBe(10);
    expect(calcularCoberturaEstoque(14, 7, 7)).toBe(14);
    expect(calcularCoberturaEstoque(null, 7, 7)).toBeNull();
  });
});
