import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { SysproApiError } from "@/lib/syspro-api";
import { obterMovimentosEstoque, EstoqueQueryError } from "@/lib/estoque-service";
import { kardexQuerySchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { temAcessoTodasEmpresas, temPermissao } from "@/lib/role-permissions";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    if (!temPermissao(session.user.role, "estoque:visualizar")) {
      return NextResponse.json({ error: "Acesso ao Kardex restrito a Administrador e Gerência." }, { status: 403 });
    }

    const rateCheck = checkRateLimit(`estoque:${session.user.id}`, 20, 60_000);
    if (!rateCheck.success) {
      return NextResponse.json({ error: "Limite de consultas de estoque excedido. Aguarde alguns instantes." }, { status: 429 });
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = kardexQuerySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Parâmetros inválidos." }, { status: 400 });
    }

    const { empresaId, dtInicial, dtFinal } = parsed.data;
    if (empresaId === "todas" || empresaId.includes(",")) {
      return NextResponse.json({ error: "Selecione uma única empresa para consultar o Kardex." }, { status: 400 });
    }

    const isAdmin = temAcessoTodasEmpresas(session.user.role);
    const empresa = await prisma.empresa.findFirst({
      where: {
        id: empresaId,
        ativa: true,
        ...(isAdmin ? {} : { usuarios: { some: { userId: session.user.id } } }),
      },
    });
    if (!empresa) return NextResponse.json({ error: "Empresa não encontrada ou não liberada." }, { status: 403 });

    const movimentos = await obterMovimentosEstoque({ empresa, dtInicial, dtFinal });
    const resumo = movimentos.reduce((acc, movimento) => {
      if (movimento.direcao === "entrada") acc.entradas += Math.abs(movimento.quantidadeMovimentada);
      if (movimento.direcao === "saida") acc.saidas += Math.abs(movimento.quantidadeMovimentada);
      if (movimento.classificacao.categoria === "devolucao_venda") acc.devolucoesVenda += Math.abs(movimento.quantidadeMovimentada);
      return acc;
    }, { entradas: 0, saidas: 0, devolucoesVenda: 0 });

    return NextResponse.json({ movimentos, resumo });
  } catch (error) {
    if (error instanceof EstoqueQueryError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SysproApiError) return NextResponse.json({ error: error.message }, { status: error.status ?? 502 });
    console.error("[api/estoque] Erro ao consultar Kardex:", error);
    return NextResponse.json({ error: "Erro ao consultar movimentações de estoque." }, { status: 502 });
  }
}
