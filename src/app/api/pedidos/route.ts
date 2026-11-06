import { NextRequest, NextResponse } from "next/server";
import { aplicarLimite, autenticarApi, buscarEmpresaAutorizada, validarJson } from "@/lib/api-route";
import { obterPedidos } from "@/lib/pedidos-service";
import { SysproApiError } from "@/lib/syspro-api";
import { vendasQuerySchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const autenticacao = await autenticarApi("entregas:visualizar", "Perfil sem permissão para consultar a análise de entregas.");
  if (!autenticacao.ok) return autenticacao.response;
  const session = autenticacao.value;

  const limite = aplicarLimite(`pedidos:${session.user.id}`, 12, 60_000, "Limite de consultas excedido. Aguarde alguns instantes.");
  if (limite) return limite;

  const json = await validarJson(request, vendasQuerySchema, "Parâmetros inválidos.");
  if (!json.ok) return json.response;
  const { empresaId, dtInicial, dtFinal } = json.value;
  if (empresaId === "todas" || empresaId.includes(",")) {
    return NextResponse.json(
      { error: "Selecione uma única empresa para consultar pedidos." },
      { status: 400 },
    );
  }

  const empresa = await buscarEmpresaAutorizada(session, empresaId);
  if (!empresa) {
    return NextResponse.json({ error: "Empresa não encontrada ou não liberada." }, { status: 403 });
  }

  try {
    const pedidos = await obterPedidos({
      empresa: {
        baseUrl: empresa.sysproBaseUrl,
        useIis: empresa.sysproUseIis === true,
        token: empresa.sysproToken ?? null,
        empresaCodigo: empresa.empresaCodigo,
      },
      inicial: dtInicial,
      final: dtFinal,
      signal: request.signal,
    });
    return NextResponse.json(
      { pedidos },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof SysproApiError) {
      return NextResponse.json({ error: error.message, rotaNaoLiberada: error.status === 404 }, { status: error.status ?? 502 });
    }
    console.error("[api/pedidos] Erro ao consultar pedidos:", error);
    return NextResponse.json({ error: "Não foi possível consultar os pedidos." }, { status: 502 });
  }
}
