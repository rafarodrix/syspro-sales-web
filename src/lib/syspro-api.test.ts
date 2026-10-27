import { afterEach, describe, expect, it, vi } from "vitest";
import {
  consultarKardex,
  consultarProducao,
  consultarTitulosPagar,
  consultarTitulosReceber,
  consultarTransporte,
  consultarVendas,
  SysproApiError,
} from "@/lib/syspro-api";

const config = { baseUrl: "http://localhost:8080", useIis: false };
const periodo = { dtInicial: "2026-01-01", dtFinal: "31/01/2026" };

function vendaValida(extra: Record<string, unknown> = {}) {
  return {
    empresa_codigo: " 1 ",
    nf_numero: " 123 ",
    nf_dt_emissao: "2026-01-10",
    produto_qtde: "2",
    produto_vlr_total_item: 30,
    ...extra,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("cliente da API Syspro", () => {
  it("monta a rota sem IIS, converte data ISO e normaliza vendas", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([vendaValida({
        produto_vlr_seguro: {},
        cliente_nome: " Cliente ",
        produto_codigo_auxiliar: " 1263 ",
          produto_vlr_custo_aquisicao: "36,888",
          produto_vlr_custo_reposicao: 47.9817,
        })])),
    );
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;

    const vendas = await consultarVendas(config, periodo, signal);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8080/api/exporta/produto/venda?dt_inicial=01%2F01%2F2026&dt_final=31%2F01%2F2026");
    expect(init).toMatchObject({ signal, redirect: "error", cache: "no-store", headers: { Accept: "application/json" } });
    expect(vendas[0]).toMatchObject({
      empresa_codigo: "1",
      nf_numero: "123",
      cliente_nome: "Cliente",
      produto_qtde: "2",
      produto_vlr_total_item: 30,
      produto_vlr_seguro: undefined,
      produto_codigo_auxiliar: "1263",
      produto_vlr_custo_aquisicao: "36,888",
      produto_vlr_custo_reposicao: 47.9817,
    });
  });

  it("monta a rota correta com IIS e aceita resposta de objeto único", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(vendaValida())));
    vi.stubGlobal("fetch", fetchMock);

    const vendas = await consultarVendas({ ...config, useIis: true }, periodo);

    expect(String(fetchMock.mock.calls[0][0])).toContain("/sysproserverisapi.dll/api/exporta/produto/venda");
    expect(vendas).toHaveLength(1);
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    [consultarKardex, "/produto/kardex"],
    [consultarProducao, "/producao"],
    [consultarTitulosPagar, "/titulo/pagar"],
    [consultarTitulosReceber, "/receber"],
    [consultarTransporte, "/transporte/rota"],
  ])("consulta a rota tipada correspondente", async (consultar, rota) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]"));
    vi.stubGlobal("fetch", fetchMock);

    await consultar(config, periodo);

    expect(String(fetchMock.mock.calls[0][0])).toContain(rota);
  });

  it("envia o código auxiliar como filtro da consulta do Kardex", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]"));
    vi.stubGlobal("fetch", fetchMock);

    await consultarKardex(config, { ...periodo, codigoAuxiliar: " 5374 " });

    expect(String(fetchMock.mock.calls[0][0])).toContain("produto_codigo_auxiliar=5374");
  });

  it("traduz 404 em orientação de configuração e preserva o corpo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detalhe: "ausente" }), { status: 404 }),
    ));

    const erro = await consultarKardex(config, periodo).catch((error) => error);

    expect(erro).toBeInstanceOf(SysproApiError);
    expect(erro).toMatchObject({ status: 404, body: { detalhe: "ausente" } });
    expect(erro.message).toContain("com ou sem IIS");
  });

  it("padroniza outros erros HTTP mesmo quando o corpo não é JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("falha", { status: 500 })));

    await expect(consultarKardex(config, periodo)).rejects.toMatchObject({
      name: "SysproApiError",
      status: 500,
      message: "Erro 500 ao consultar a API do Syspro.",
    });
  });

  it("rejeita resposta anunciada acima de 10 MB", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("[]", { headers: { "content-length": String(10 * 1024 * 1024 + 1) } }),
    ));

    await expect(consultarKardex(config, periodo)).rejects.toThrow("excede o limite permitido");
  });

  it("rejeita resposta vazia ou JSON inválido", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null))
      .mockResolvedValueOnce(new Response("não-json"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(consultarKardex(config, periodo)).rejects.toThrow("Resposta vazia");
    await expect(consultarKardex(config, periodo)).rejects.toThrow("JSON inválido");
  });

  it("rejeita mais de 50 mil registros", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify(Array.from({ length: 50_001 }, () => 1))),
    ));

    await expect(consultarKardex(config, periodo)).rejects.toThrow("limite de registros");
  });

  it.each([
    [null, "Resposta de vendas inválida no item 1."],
    [{ empresa_codigo: "1", nf_numero: "", nf_dt_emissao: "2026-01-01" }, "faltam campos obrigatórios"],
  ])("rejeita item de venda estruturalmente inválido", async (item, mensagem) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([item]))));

    await expect(consultarVendas(config, periodo)).rejects.toThrow(mensagem);
  });
});
