import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { empresaCreateSchema, empresaUpdateSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { temPermissao } from "@/lib/role-permissions";

async function authorizeAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !temPermissao(session.user.role, "empresas:gerenciar")) return null;
  return session;
}

export async function POST(request: NextRequest) {
  const session = await authorizeAdmin();
  if (!session) {
    return NextResponse.json({ error: "Acesso restrito ao Administrador." }, { status: 403 });
  }

  const rateCheck = checkRateLimit(`empresas:post:${session.user.id}`, 30, 60_000);
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: "Muitas requisições. Aguarde um momento." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo JSON inválido." }, { status: 400 });
  }

  const parsed = empresaCreateSchema.safeParse(body);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message ?? "Dados da empresa inválidos.";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const { cnpj, razaoSocial, empresaCodigo, sysproBaseUrl, sysproUseIis } = parsed.data;

  try {
    const empresa = await prisma.empresa.create({
      data: {
        cnpj,
        razaoSocial,
        empresaCodigo,
        sysproBaseUrl,
        sysproUseIis,
      },
    });
    return NextResponse.json({ empresa }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Já existe uma filial cadastrada com este CNPJ." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Erro ao cadastrar empresa." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await authorizeAdmin();
  if (!session) {
    return NextResponse.json({ error: "Acesso restrito ao Administrador." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo JSON inválido." }, { status: 400 });
  }

  const parsed = empresaUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message ?? "Dados inválidos para atualização.";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const { id, cnpj, razaoSocial, empresaCodigo, ativa, sysproBaseUrl, sysproUseIis } = parsed.data;

  const existente = await prisma.empresa.findUnique({ where: { id } });
  if (!existente) {
    return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
  }

  // CNPJ duplicado em outra empresa?
  if (cnpj && cnpj !== existente.cnpj) {
    const duplicado = await prisma.empresa.findFirst({
      where: { cnpj, id: { not: id } },
    });
    if (duplicado) {
      return NextResponse.json(
        { error: "Já existe outra filial cadastrada com este CNPJ." },
        { status: 409 },
      );
    }
  }

  try {
    await prisma.empresa.update({
      where: { id },
      data: {
        ...(cnpj ? { cnpj } : {}),
        ...(razaoSocial !== undefined ? { razaoSocial } : {}),
        ...(empresaCodigo !== undefined ? { empresaCodigo } : {}),
        ...(ativa !== undefined ? { ativa } : {}),
        ...(sysproBaseUrl !== undefined ? { sysproBaseUrl } : {}),
        ...(sysproUseIis !== undefined ? { sysproUseIis } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar empresa." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await authorizeAdmin();
  if (!session) {
    return NextResponse.json({ error: "Acesso restrito ao Administrador." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID da empresa é obrigatório." }, { status: 400 });
  }

  const existente = await prisma.empresa.findUnique({ where: { id } });
  if (!existente) {
    return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
  }

  try {
    await prisma.empresa.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao remover empresa." }, { status: 500 });
  }
}
