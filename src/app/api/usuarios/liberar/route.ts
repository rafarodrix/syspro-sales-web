import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";

async function authorize() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return null;
  }
  return session;
}

export async function POST(request: NextRequest) {
  const session = await authorize();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: { userId?: string; empresaId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { userId, empresaId } = body;
  if (!userId || !empresaId) {
    return NextResponse.json({ error: "userId e empresaId obrigatórios" }, { status: 400 });
  }

  const [user, empresa] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.empresa.findUnique({ where: { id: empresaId } }),
  ]);
  if (!user || !empresa) {
    return NextResponse.json({ error: "Usuário ou empresa não encontrados" }, { status: 404 });
  }

  await prisma.userEmpresa.upsert({
    where: { userId_empresaId: { userId, empresaId } },
    update: {},
    create: { userId, empresaId },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = await authorize();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: { userId?: string; empresaId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { userId, empresaId } = body;
  if (!userId || !empresaId) {
    return NextResponse.json({ error: "userId e empresaId obrigatórios" }, { status: 400 });
  }

  await prisma.userEmpresa.deleteMany({ where: { userId, empresaId } });
  return NextResponse.json({ ok: true });
}
