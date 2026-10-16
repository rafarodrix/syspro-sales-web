import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { obterRelatorioCompras } from "@/lib/compras-service";
import { prisma } from "@/lib/database";
import { EstoqueQueryError } from "@/lib/estoque-service";
import { checkRateLimit } from "@/lib/rate-limit";
import { temAcessoTodasEmpresas, temPermissao } from "@/lib/role-permissions";
import { SalesIntegrationError, SalesQueryError } from "@/lib/sales-service";
import { SysproApiError } from "@/lib/syspro-api";
import { vendasQuerySchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    if (!temPermissao(session.user.role, "estoque:visualizar")) {
      return NextResponse.json(
        { error: "Acesso ao relatório de compras restrito a Administrador e Gerência." },
        { status: 403 },
      );
    }

    const rateCheck = checkRateLimit(`relatorio-compras:${session.user.id}`, 10, 60_000);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Limite de consultas excedido. Aguarde alguns instantes." },
        { status: 429 },
      );
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = vendasQuerySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Parâmetros inválidos." },
        { status: 400 },
      );
    }

    const { empresaId, dtInicial, dtFinal, forcarAtualizacao } = parsed.data;
    if (empresaId === "todas" || empresaId.includes(",")) {
      return NextResponse.json(
        { error: "Selecione uma única empresa para consultar estoque e devoluções." },
        { status: 400 },
      );
    }

    const isAdmin = temAcessoTodasEmpresas(session.user.role);
    const empresa = await prisma.empresa.findFirst({
      where: {
        id: empresaId,
        ativa: true,
        ...(isAdmin ? {} : { usuarios: { some: { userId: session.user.id } } }),
      },
    });
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
      { error: "Não foi possível gerar o relatório de compras." },
      { status: 502 },
    );
  }
}
