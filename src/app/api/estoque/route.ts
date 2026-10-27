import { NextRequest, NextResponse } from "next/server";
import { aplicarLimite, autenticarApi, buscarEmpresaAutorizada, validarJson } from "@/lib/api-route";
import { SysproApiError } from "@/lib/syspro-api";
import { obterMovimentosEstoque, EstoqueQueryError } from "@/lib/estoque-service";
import { projetarMovimentoKardex } from "@/lib/kardex";
import { kardexQuerySchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const autenticacao = await autenticarApi(
      "estoque:visualizar",
      "Acesso ao Kardex restrito a Administrador e Gerência.",
    );
    if (!autenticacao.ok) return autenticacao.response;
    const session = autenticacao.value;

    const limite = aplicarLimite(`estoque:${session.user.id}`, 20, 60_000, "Limite de consultas de estoque excedido. Aguarde alguns instantes.");
    if (limite) return limite;

    const json = await validarJson(request, kardexQuerySchema, "Parâmetros inválidos.");
    if (!json.ok) return json.response;
    const { empresaId, dtInicial, dtFinal } = json.value;
    if (empresaId === "todas" || empresaId.includes(",")) {
      return NextResponse.json({ error: "Selecione uma única empresa para consultar o Kardex." }, { status: 400 });
    }

    const empresa = await buscarEmpresaAutorizada(session, empresaId);
    if (!empresa) return NextResponse.json({ error: "Empresa não encontrada ou não liberada." }, { status: 403 });

    const movimentos = await obterMovimentosEstoque({
      empresa,
      dtInicial,
      dtFinal,
      signal: request.signal,
    });
    const movimentosPublicos = movimentos.map(projetarMovimentoKardex);
    return NextResponse.json({ movimentos: movimentosPublicos }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof EstoqueQueryError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SysproApiError) return NextResponse.json({ error: error.message }, { status: error.status ?? 502 });
    console.error("[api/estoque] Erro ao consultar Kardex:", error);
    return NextResponse.json({ error: "Erro ao consultar movimentações de estoque." }, { status: 502 });
  }
}
