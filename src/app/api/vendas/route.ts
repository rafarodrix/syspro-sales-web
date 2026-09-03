import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { SysproApiError } from "@/lib/syspro-api";
import { resumoVendas } from "@/lib/vendas";
import { obterVendas, SalesQueryError } from "@/lib/sales-service";
import { vendasQuerySchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";

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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Rate limiter por usuário: máximo 45 consultas por minuto
  const rateCheck = checkRateLimit(`vendas:${session.user.id}`, 45, 60_000);
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: "Limite de consultas excedido. Aguarde alguns instantes." },
      { status: 429 },
    );
  }

  const isAdmin = session.user.role === "admin";

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = vendasQuerySchema.safeParse(body);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message ?? "Parâmetros de consulta inválidos.";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const { empresaId, dtInicial, dtFinal, forcarAtualizacao } = parsed.data;

  if (!periodoValido(dtInicial, dtFinal)) {
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

    return NextResponse.json({
      vendas,
      resumo: resumoVendas(vendas),
      isConsolidado,
      totalEmpresas: empresasLiberadas.length,
    });
  } catch (e) {
    if (e instanceof SalesQueryError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
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

function periodoValido(inicial: string, final: string) {
  const padraoBR = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const padraoISO = /^(\d{4})-(\d{2})-(\d{2})$/;

  const paraData = (valor: string) => {
    if (padraoBR.test(valor)) {
      const [dia, mes, ano] = valor.split("/").map(Number);
      return new Date(Date.UTC(ano, mes - 1, dia));
    }
    if (padraoISO.test(valor)) {
      const [ano, mes, dia] = valor.split("-").map(Number);
      return new Date(Date.UTC(ano, mes - 1, dia));
    }
    return null;
  };

  const inicio = paraData(inicial);
  const fim = paraData(final);

  return Boolean(
    inicio &&
    fim &&
    !isNaN(inicio.getTime()) &&
    !isNaN(fim.getTime()) &&
    inicio <= fim &&
    fim.getTime() - inicio.getTime() <= 366 * 86_400_000,
  );
}
