import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: { cnpj?: string; razaoSocial?: string; empresaCodigo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const cnpj = (body.cnpj ?? "").replace(/\D/g, "");
  const razaoSocial = (body.razaoSocial ?? "").trim();
  const empresaCodigo = (body.empresaCodigo ?? "").trim();

  if (cnpj.length !== 14) {
    return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
  }
  if (!razaoSocial || !empresaCodigo) {
    return NextResponse.json(
      { error: "Razão social e código são obrigatórios" },
      { status: 400 },
    );
  }

  const existe = await prisma.empresa.findUnique({ where: { cnpj } });
  if (existe) {
    return NextResponse.json(
      { error: "CNPJ já cadastrado" },
      { status: 409 },
    );
  }

  await prisma.empresa.create({
    data: { cnpj, razaoSocial, empresaCodigo },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
