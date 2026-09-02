import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { consultarVendas, SysproApiError } from "@/lib/syspro-api";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const isAdmin = session.user.role === "admin";

  let body: { empresaId?: string; dtInicial?: string; dtFinal?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { empresaId, dtInicial, dtFinal } = body;
  if (!empresaId || !dtInicial || !dtFinal) {
    return NextResponse.json(
      { error: "Empresa e período são obrigatórios" },
      { status: 400 },
    );
  }

  // Empresa deve existir E estar liberada para o usuário (ou ser admin)
  const empresa = await prisma.empresa.findFirst({
    where: {
      id: empresaId,
      ...(isAdmin ? {} : { usuarios: { some: { userId: session.user.id } } }),
    },
  });
  if (!empresa) {
    return NextResponse.json(
      { error: "Empresa não encontrada ou não liberada para o usuário" },
      { status: 403 },
    );
  }

  const configuracao = await prisma.configuracao.findFirst();
  const cfg = {
    baseUrl: configuracao?.sysproBaseUrl ?? "",
    useIis: configuracao?.sysproUseIis === "true",
  };
  if (!cfg.baseUrl) {
    return NextResponse.json(
      { error: "Configure a URL da API do Syspro em Configurações" },
      { status: 400 },
    );
  }

  try {
    const data = await consultarVendas(cfg, { dtInicial, dtFinal });
    // Filtra a empresa no backend (o browser nunca vê a API do Syspro)
    const filtradas = data.filter(
      (v) => v.empresa_codigo === empresa.empresaCodigo,
    );
    return NextResponse.json({ vendas: filtradas });
  } catch (e) {
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
