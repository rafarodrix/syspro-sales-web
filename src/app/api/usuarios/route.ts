import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { aplicarLimite, autenticarApi, validarJson } from "@/lib/api-route";
import { prisma } from "@/lib/database";
import { hashPassword } from "better-auth/crypto";
import { usuarioCreateSchema, usuarioUpdateSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const autenticacao = await autenticarApi("usuarios:gerenciar", "Acesso restrito ao Administrador.");
  if (!autenticacao.ok) return autenticacao.response;
  const session = autenticacao.value;

  const limite = aplicarLimite(`usuarios:post:${session.user.id}`, 30, 60_000, "Muitas requisições. Aguarde um momento.");
  if (limite) return limite;

  const json = await validarJson(request, usuarioCreateSchema, "Dados de usuário inválidos.");
  if (!json.ok) return json.response;
  const { name, email, password, role } = json.value;

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
  const autenticacao = await autenticarApi("usuarios:gerenciar", "Acesso restrito ao Administrador.");
  if (!autenticacao.ok) return autenticacao.response;

  const json = await validarJson(request, usuarioUpdateSchema, "Dados inválidos para atualização.");
  if (!json.ok) return json.response;
  const { id, role, name, email, password } = json.value;

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
    if (password && password.trim().length >= 12) {
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
  const autenticacao = await autenticarApi("usuarios:gerenciar", "Acesso restrito ao Administrador.");
  if (!autenticacao.ok) return autenticacao.response;
  const session = autenticacao.value;

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
