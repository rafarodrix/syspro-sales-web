import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";

async function authorize() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") return null;
  return session;
}

export async function PATCH(request: NextRequest) {
  const session = await authorize();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: {
    id?: string;
    cnpj?: string;
    razaoSocial?: string;
    empresaCodigo?: string;
    ativa?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
  }

  const existente = await prisma.empresa.findUnique({ where: { id } });
  if (!existente) {
    return NextResponse.json(
      { error: "Empresa não encontrada" },
      { status: 404 },
    );
  }

  const cnpj = body.cnpj !== undefined ? body.cnpj.replace(/\D/g, "") : undefined;
  if (cnpj !== undefined && cnpj.length !== 14) {
    return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
  }
  // CNPJ duplicado em outra empresa?
  if (cnpj) {
    const duplicado = await prisma.empresa.findFirst({
      where: { cnpj, id: { not: id } },
    });
    if (duplicado) {
      return NextResponse.json(
        { error: "CNPJ já cadastrado em outra empresa" },
        { status: 409 },
      );
    }
  }

  await prisma.empresa.update({
    where: { id },
    data: {
      ...(cnpj ? { cnpj } : {}),
      ...(body.razaoSocial !== undefined
        ? { razaoSocial: body.razaoSocial.trim() }
        : {}),
      ...(body.empresaCodigo !== undefined
        ? { empresaCodigo: body.empresaCodigo.trim() }
        : {}),
      ...(body.ativa !== undefined ? { ativa: body.ativa } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = await authorize();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
  }

  const existente = await prisma.empresa.findUnique({ where: { id } });
  if (!existente) {
    return NextResponse.json(
      { error: "Empresa não encontrada" },
      { status: 404 },
    );
  }

  await prisma.empresa.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
