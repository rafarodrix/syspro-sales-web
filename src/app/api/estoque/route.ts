import { NextRequest, NextResponse } from "next/server";
import { aplicarLimite, autenticarApi, buscarEmpresaAutorizada, validarJson } from "@/lib/api-route";
import { SysproApiError } from "@/lib/syspro-api";
import { obterMovimentosEstoque, EstoqueQueryError } from "@/lib/estoque-service";
import { montarSaudeEstoque } from "@/lib/estoque-saude";
import { projetarMovimentoKardex } from "@/lib/kardex";
import { obterVendas, SalesIntegrationError, SalesQueryError } from "@/lib/sales-service";
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

    const [movimentos, vendas] = await Promise.all([
      obterMovimentosEstoque({ empresa, dtInicial, dtFinal, signal: request.signal }),
      obterVendas({
        actorId: session.user.id,
        empresasLiberadas: [empresa],
        empresaSelecionadaId: empresa.id,
        dtInicial,
        dtFinal,
        signal: request.signal,
        enforceRateLimit: false,
      }),
    ]);
    const saude = montarSaudeEstoque(movimentos, vendas, { inicial: dtInicial, final: dtFinal });
    const movimentosPublicos = movimentos.map(projetarMovimentoKardex);
    return NextResponse.json({ movimentos: movimentosPublicos, ...saude }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof EstoqueQueryError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SalesQueryError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SalesIntegrationError) return NextResponse.json({ error: error.message }, { status: 502 });
    if (error instanceof SysproApiError) return NextResponse.json({ error: error.message }, { status: error.status ?? 502 });
    console.error("[api/estoque] Erro ao consultar Kardex:", error);
    return NextResponse.json({ error: "Erro ao consultar movimentações de estoque." }, { status: 502 });
  }
}
