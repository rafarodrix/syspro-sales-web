import { NextRequest, NextResponse } from "next/server";
import { autenticarApi, validarJson } from "@/lib/api-route";
import { prisma } from "@/lib/database";
import { usuarioLiberarSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const autenticacao = await autenticarApi("usuarios:gerenciar", "Acesso restrito ao Administrador.");
  if (!autenticacao.ok) return autenticacao.response;
  const json = await validarJson(request, usuarioLiberarSchema, "Dados inválidos.");
  if (!json.ok) return json.response;
  const { userId, empresaId } = json.value;

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
  const autenticacao = await autenticarApi("usuarios:gerenciar", "Acesso restrito ao Administrador.");
  if (!autenticacao.ok) return autenticacao.response;
  const json = await validarJson(request, usuarioLiberarSchema, "Dados inválidos.");
  if (!json.ok) return json.response;
  const { userId, empresaId } = json.value;

  await prisma.userEmpresa.deleteMany({ where: { userId, empresaId } });
  return NextResponse.json({ ok: true });
}
