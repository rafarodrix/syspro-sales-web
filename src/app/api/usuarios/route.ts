import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: { name?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!name || !email || password.length < 6) {
    return NextResponse.json(
      { error: "Nome, e-mail e senha (mín. 6) são obrigatórios" },
      { status: 400 },
    );
  }

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    return NextResponse.json(
      { error: "Já existe usuário com este e-mail" },
      { status: 409 },
    );
  }

  const criado = await auth.api.signUpEmail({
    body: { name, email, password },
  });
  if (!criado?.user) {
    return NextResponse.json(
      { error: "Falha ao criar usuário" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, user: criado.user }, { status: 201 });
}
