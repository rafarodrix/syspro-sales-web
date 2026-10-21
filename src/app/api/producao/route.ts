import { NextRequest, NextResponse } from "next/server";
import { aplicarLimite, autenticarApi, buscarEmpresaAutorizada, validarJson } from "@/lib/api-route";
import { consultarProducao, SysproApiError } from "@/lib/syspro-api";
import { normalizarProducao, resumirProducao } from "@/lib/producao";
import { vendasQuerySchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const autenticacao = await autenticarApi(
      "relatorios:visualizar",
      "Perfil sem permissão para consultar produção.",
    );
    if (!autenticacao.ok) return autenticacao.response;
    const session = autenticacao.value;

    const limite = aplicarLimite(
      `producao:${session.user.id}`,
      15,
      60_000,
      "Limite de consultas de produção excedido. Aguarde alguns instantes.",
    );
    if (limite) return limite;

    const json = await validarJson(request, vendasQuerySchema, "Parâmetros inválidos.");
    if (!json.ok) return json.response;
    const { empresaId, dtInicial, dtFinal } = json.value;

    if (empresaId === "todas" || empresaId.includes(",")) {
      return NextResponse.json(
        { error: "Selecione uma única empresa para consultar produção." },
        { status: 400 },
      );
    }

    const empresa = await buscarEmpresaAutorizada(session, empresaId);
    if (!empresa) {
      return NextResponse.json(
        { error: "Empresa não encontrada ou não liberada." },
        { status: 403 },
      );
    }
    if (!empresa.sysproBaseUrl) {
      return NextResponse.json(
        { error: "A empresa selecionada não possui uma origem Syspro configurada." },
        { status: 400 },
      );
    }

    const config = { baseUrl: empresa.sysproBaseUrl, useIis: empresa.sysproUseIis === true };
    let brutos: unknown[];
    try {
      brutos = (await consultarProducao(
        config,
        { dtInicial, dtFinal },
        request.signal,
      )) as unknown[];
    } catch (erro) {
      if (erro instanceof SysproApiError && erro.status === 401) {
        return NextResponse.json(
          {
            error:
              'A rota de produção ainda não está autorizada no SysproServer (HTTP 401 "Authorization not found"). ' +
              "Peça a liberação da rota `producao` para esta instalação.",
            rotaNaoAutorizada: true,
          },
          { status: 503 },
        );
      }
      throw erro;
    }

    const daEmpresa = brutos.filter((item) => {
      const codigo = String((item as Record<string, unknown>)?.empresa_codigo ?? "").trim();
      return !codigo || codigo === empresa.empresaCodigo.trim();
    });

    const itens = daEmpresa.map((item) => normalizarProducao(item));
    return NextResponse.json(
      {
        empresaId: empresa.id,
        empresaNome: empresa.razaoSocial,
        periodo: { inicial: dtInicial, final: dtFinal },
        consultadoEm: new Date().toISOString(),
        ignoradosPorEmpresa: brutos.length - daEmpresa.length,
        itens,
        resumo: resumirProducao(itens),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (erro) {
    if (erro instanceof SysproApiError) {
      return NextResponse.json(
        { error: `Falha ao consultar o Syspro: ${erro.message}` },
        { status: 502 },
      );
    }
    const mensagem = erro instanceof Error ? erro.message : "Erro ao consultar produção.";
    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}
