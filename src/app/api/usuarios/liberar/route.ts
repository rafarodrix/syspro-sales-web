import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { usuarioLiberarSchema } from "@/lib/validations";

async function authorizeAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") return null;
  return session;
}

export async function POST(request: NextRequest) {
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

  const parsed = usuarioLiberarSchema.safeParse(body);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message ?? "Dados inválidos.";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const { userId, empresaId } = parsed.data;

  const [user, empresa] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.empresa.findUnique({ where: { id: empresaId } }),
  ]);
  if (!user || !empresa) {
    return NextResponse.json({ error: "Usuário ou empresa não encontrados." }, { status: 404 });
  }

  await prisma.userEmpresa.upsert({
    where: { userId_empresaId: { userId, empresaId } },
    update: {},
    create: { userId, empresaId },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
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

  const parsed = usuarioLiberarSchema.safeParse(body);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message ?? "Dados inválidos.";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const { userId, empresaId } = parsed.data;

  await prisma.userEmpresa.deleteMany({ where: { userId, empresaId } });
  return NextResponse.json({ ok: true });
}
