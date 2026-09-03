import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { hashPassword } from "better-auth/crypto";
import { usuarioCreateSchema, usuarioUpdateSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";

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

  const rateCheck = checkRateLimit(`usuarios:post:${session.user.id}`, 30, 60_000);
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

  const parsed = usuarioCreateSchema.safeParse(body);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message ?? "Dados de usuário inválidos.";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const { name, email, password, role } = parsed.data;

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    return NextResponse.json(
      { error: "Já existe usuário cadastrado com este e-mail." },
      { status: 409 },
    );
  }

  const criado = await auth.api.signUpEmail({
    body: { name, email, password },
  });
  if (!criado?.user) {
    return NextResponse.json(
      { error: "Falha ao registrar usuário no sistema de autenticação." },
      { status: 500 },
    );
  }

  await prisma.user.update({
    where: { id: criado.user.id },
    data: { role, emailVerified: true },
  });

  return NextResponse.json({ ok: true, user: { ...criado.user, role } }, { status: 201 });
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

  const parsed = usuarioUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message ?? "Dados inválidos para atualização.";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const { id, role, name, email, password } = parsed.data;

  const usuarioExistente = await prisma.user.findUnique({ where: { id } });
  if (!usuarioExistente) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const dataToUpdate: { role?: string; name?: string; email?: string } = {};

  if (role) {
    dataToUpdate.role = role;
  }

  if (name) {
    dataToUpdate.name = name;
  }

  if (email && email !== usuarioExistente.email) {
    const outroComMesmoEmail = await prisma.user.findUnique({ where: { email } });
    if (outroComMesmoEmail) {
      return NextResponse.json({ error: "Já existe outro usuário cadastrado com este e-mail." }, { status: 409 });
    }
    dataToUpdate.email = email;
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    // Se informou nova senha, atualiza o hash da conta
    if (password && password.trim().length >= 6) {
      const hashedPassword = await hashPassword(password.trim());
      await prisma.account.updateMany({
        where: { userId: id, providerId: "credential" },
        data: { password: hashedPassword },
      });
    }

    return NextResponse.json({ ok: true, user: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao atualizar usuário." },
      { status: 500 },
    );
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
    return NextResponse.json({ error: "ID do usuário não informado." }, { status: 400 });
  }

  if (id === session.user.id) {
    return NextResponse.json({ error: "Você não pode excluir sua própria conta." }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true, message: "Usuário excluído com sucesso." });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir usuário." }, { status: 500 });
  }
}
