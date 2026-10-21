import { NextRequest, NextResponse } from "next/server";
import { aplicarLimite, autenticarApi, validarJson } from "@/lib/api-route";
import { prisma } from "@/lib/database";
import { obterAnaliseMargens } from "@/lib/margens-service";
import { EstoqueQueryError } from "@/lib/estoque-service";
import { SalesIntegrationError, SalesQueryError } from "@/lib/sales-service";
import { SysproApiError } from "@/lib/syspro-api";
import { vendasQuerySchema } from "@/lib/validations";
import { temAcessoTodasEmpresas } from "@/lib/role-permissions";

export async function POST(request: NextRequest) {
  try {
    const autenticacao = await autenticarApi(
      "relatorios:visualizar",
      "Perfil sem permissão para consultar margens.",
    );
    if (!autenticacao.ok) return autenticacao.response;
    const session = autenticacao.value;
    const limite = aplicarLimite(
      `relatorio-margens:${session.user.id}`,
      10,
      60_000,
      "Limite de consultas excedido. Aguarde alguns instantes.",
    );
    if (limite) return limite;

    const json = await validarJson(request, vendasQuerySchema, "Parâmetros inválidos.");
    if (!json.ok) return json.response;
    const { empresaId, dtInicial, dtFinal, forcarAtualizacao } = json.value;
    const isAdmin = temAcessoTodasEmpresas(session.user.role);
    const liberadas = await prisma.empresa.findMany({
      where: {
        ativa: true,
        ...(isAdmin ? {} : { usuarios: { some: { userId: session.user.id } } }),
      },
      orderBy: { razaoSocial: "asc" },
    });
    const ids = empresaId === "todas"
      ? liberadas.map((empresa) => empresa.id)
      : empresaId.split(",").map((id) => id.trim()).filter(Boolean);
    if (!ids.length || ids.some((id) => !liberadas.some((empresa) => empresa.id === id))) {
      return NextResponse.json(
        { error: "Uma ou mais empresas não foram encontradas ou não estão liberadas." },
        { status: 403 },
      );
    }

    const analise = await obterAnaliseMargens({
      actorId: session.user.id,
      empresas: liberadas.filter((empresa) => ids.includes(empresa.id)),
      dtInicial,
      dtFinal,
      forcarAtualizacao,
      signal: request.signal,
    });
    return NextResponse.json(analise, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof EstoqueQueryError || error instanceof SalesQueryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SysproApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status ?? 502 });
    }
    if (error instanceof SalesIntegrationError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("[api/relatorios/margens] Erro ao gerar análise:", error);
    return NextResponse.json(
      { error: "Não foi possível gerar a análise de margens." },
      { status: 502 },
    );
  }
}
