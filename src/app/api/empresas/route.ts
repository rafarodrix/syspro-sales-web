import { NextRequest, NextResponse } from "next/server";
import { aplicarLimite, autenticarApi, validarJson } from "@/lib/api-route";
import { prisma } from "@/lib/database";
import { empresaCreateSchema, empresaUpdateSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const autenticacao = await autenticarApi("empresas:gerenciar", "Acesso restrito ao Administrador.");
  if (!autenticacao.ok) return autenticacao.response;
  const session = autenticacao.value;

  const limite = aplicarLimite(`empresas:post:${session.user.id}`, 30, 60_000, "Muitas requisições. Aguarde um momento.");
  if (limite) return limite;

  const json = await validarJson(request, empresaCreateSchema, "Dados da empresa inválidos.");
  if (!json.ok) return json.response;
  const { cnpj, razaoSocial, empresaCodigo, sysproBaseUrl, sysproUseIis } = json.value;

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
  const autenticacao = await autenticarApi("empresas:gerenciar", "Acesso restrito ao Administrador.");
  if (!autenticacao.ok) return autenticacao.response;

  const json = await validarJson(request, empresaUpdateSchema, "Dados inválidos para atualização.");
  if (!json.ok) return json.response;
  const { id, cnpj, razaoSocial, empresaCodigo, ativa, sysproBaseUrl, sysproUseIis } = json.value;

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
  const autenticacao = await autenticarApi("empresas:gerenciar", "Acesso restrito ao Administrador.");
  if (!autenticacao.ok) return autenticacao.response;

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
