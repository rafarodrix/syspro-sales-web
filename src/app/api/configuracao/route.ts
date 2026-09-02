import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: { baseUrl?: string; useIis?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const baseUrl = (body.baseUrl ?? "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\/.+/i.test(baseUrl)) {
    return NextResponse.json(
      { error: "URL inválida (use http://servidor:porta)" },
      { status: 400 },
    );
  }
  const useIis = body.useIis === "true" ? "true" : "false";

  await prisma.configuracao.upsert({
    where: { id: "default" },
    update: { sysproBaseUrl: baseUrl, sysproUseIis: useIis },
    create: { id: "default", sysproBaseUrl: baseUrl, sysproUseIis: useIis },
  });

  return NextResponse.json({ ok: true });
}
