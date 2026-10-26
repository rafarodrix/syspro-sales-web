import { NextRequest, NextResponse } from "next/server";
import { aplicarLimite, autenticarApi, buscarEmpresaAutorizada, validarJson } from "@/lib/api-route";
import { obterRelatorioCompras } from "@/lib/compras-service";
import { EstoqueQueryError } from "@/lib/estoque-service";
import { SalesIntegrationError, SalesQueryError } from "@/lib/sales-service";
import { SysproApiError } from "@/lib/syspro-api";
import { vendasQuerySchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const autenticacao = await autenticarApi(
      "estoque:visualizar",
      "Acesso à análise de compras restrito a Administrador e Gerência.",
    );
    if (!autenticacao.ok) return autenticacao.response;
    const session = autenticacao.value;

    const limite = aplicarLimite(`relatorio-compras:${session.user.id}`, 10, 60_000, "Limite de consultas excedido. Aguarde alguns instantes.");
    if (limite) return limite;

    const json = await validarJson(request, vendasQuerySchema, "Parâmetros inválidos.");
    if (!json.ok) return json.response;
    const { empresaId, dtInicial, dtFinal, forcarAtualizacao, grupoEstoquePadrao } = json.value;
    if (empresaId === "todas" || empresaId.includes(",")) {
      return NextResponse.json(
        { error: "Selecione uma única empresa para consultar estoque e devoluções." },
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

    const relatorio = await obterRelatorioCompras({
      actorId: session.user.id,
      empresa,
      dtInicial,
      dtFinal,
      forcarAtualizacao,
      grupoEstoquePadrao: grupoEstoquePadrao ?? empresa.grupoEstoquePadrao,
      signal: request.signal,
    });
    return NextResponse.json(relatorio, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof EstoqueQueryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SysproApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status ?? 502 });
    }
    if (error instanceof SalesIntegrationError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (error instanceof SalesQueryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/relatorios/compras] Erro ao gerar relatório:", error);
    return NextResponse.json(
      { error: "Não foi possível gerar a análise de compras." },
      { status: 502 },
    );
  }
}
