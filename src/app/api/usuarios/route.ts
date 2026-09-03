import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { hashPassword } from "better-auth/crypto";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Acesso restrito ao Administrador." }, { status: 403 });
  }

  let body: { name?: string; email?: string; password?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const role = body.role === "admin" || body.role === "gerente" ? body.role : "vendas";

  if (!name || !email || password.length < 6) {
    return NextResponse.json(
      { error: "Nome, e-mail e senha (mín. 6 caracteres) são obrigatórios." },
      { status: 400 },
    );
  }

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
      { error: "Falha ao registrar usuário." },
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Acesso restrito ao Administrador." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, role, name, email, password } = body;

    if (!id) {
      return NextResponse.json({ error: "ID do usuário obrigatório." }, { status: 400 });
    }

    const usuarioExistente = await prisma.user.findUnique({ where: { id } });
    if (!usuarioExistente) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    const dataToUpdate: { role?: string; name?: string; email?: string } = {};

    if (role && ["admin", "gerente", "vendas"].includes(role)) {
      dataToUpdate.role = role;
    }

    if (name && typeof name === "string" && name.trim()) {
      dataToUpdate.name = name.trim();
    }

    if (email && typeof email === "string" && email.trim()) {
      const emailNormalizado = email.trim().toLowerCase();
      if (emailNormalizado !== usuarioExistente.email) {
        const outroComMesmoEmail = await prisma.user.findUnique({ where: { email: emailNormalizado } });
        if (outroComMesmoEmail) {
          return NextResponse.json({ error: "Já existe outro usuário com este e-mail." }, { status: 409 });
        }
        dataToUpdate.email = emailNormalizado;
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    // Se informou nova senha, atualiza o hash da conta
    if (password && typeof password === "string" && password.trim().length >= 6) {
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
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
