import { NextRequest, NextResponse } from "next/server";
import { aplicarLimite, autenticarApi, validarJson } from "@/lib/api-route";
import { prisma } from "@/lib/database";
import { SysproApiError } from "@/lib/syspro-api";
import { resumoVendas } from "@/lib/vendas";
import { obterVendas, periodoConsultaValido, SalesIntegrationError, SalesQueryError } from "@/lib/sales-service";
import { vendasQuerySchema } from "@/lib/validations";
import { temAcessoTodasEmpresas } from "@/lib/role-permissions";

export async function POST(request: NextRequest) {
  try {
    return await handleVendas(request);
  } catch (e) {
    console.error("[api/vendas] ERRO NAO TRATADO:", e);
    return NextResponse.json(
      { error: "Erro interno ao consultar vendas" },
      { status: 500 },
    );
  }
}

async function handleVendas(request: NextRequest) {
  const autenticacao = await autenticarApi(
    "vendas:visualizar",
    "Perfil sem permissão para consultar vendas.",
  );
  if (!autenticacao.ok) return autenticacao.response;
  const session = autenticacao.value;

  // Rate limiter por usuário: máximo 45 consultas por minuto
  const limite = aplicarLimite(
    `vendas:${session.user.id}`,
    45,
    60_000,
    "Limite de consultas excedido. Aguarde alguns instantes.",
  );
  if (limite) return limite;

  const isAdmin = temAcessoTodasEmpresas(session.user.role);

  const json = await validarJson(request, vendasQuerySchema, "Parâmetros de consulta inválidos.");
  if (!json.ok) return json.response;
  const { empresaId, dtInicial, dtFinal, forcarAtualizacao } = json.value;

  if (!periodoConsultaValido(dtInicial, dtFinal)) {
    return NextResponse.json(
      { error: "Informe um período válido de até 366 dias." },
      { status: 400 },
    );
  }

  // Buscar empresas liberadas para o usuário
  const empresasLiberadas = await prisma.empresa.findMany({
    where: {
      ativa: true,
      ...(isAdmin ? {} : { usuarios: { some: { userId: session.user.id } } }),
    },
    orderBy: { razaoSocial: "asc" },
  });

  if (empresasLiberadas.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma empresa disponível ou liberada para o usuário" },
      { status: 403 },
    );
  }

  // Se for empresa única ou customizada, validar se o usuário tem acesso às filiais solicitadas
  if (empresaId !== "todas") {
    const idsSolicitados = empresaId.split(",").map((id) => id.trim()).filter(Boolean);
    const algumInvalido = idsSolicitados.some(
      (id) => !empresasLiberadas.some((emp) => emp.id === id),
    );
    if (algumInvalido) {
      return NextResponse.json(
        { error: "Uma ou mais empresas selecionadas não foram encontradas ou não estão liberadas." },
        { status: 403 },
      );
    }
  }

  try {
    const vendas = await obterVendas({
      actorId: session.user.id,
      enforceRateLimit: false,
      empresasLiberadas,
      empresaSelecionadaId: empresaId,
      dtInicial,
      dtFinal,
      forcarAtualizacao,
    });

    const isConsolidado = empresaId === "todas" || empresaId.includes(",");

    return NextResponse.json(
      {
        vendas,
        resumo: resumoVendas(vendas),
        isConsolidado,
        totalEmpresas: empresasLiberadas.length,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    if (e instanceof SalesQueryError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof SalesIntegrationError) {
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
    if (e instanceof SysproApiError) {
      return NextResponse.json(
        { error: e.message },
        { status: e.status ?? 502 },
      );
    }
    return NextResponse.json(
      { error: "Erro ao consultar a API do Syspro" },
      { status: 502 },
    );
  }
}
