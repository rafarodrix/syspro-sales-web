import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  temAcessoTodasEmpresas,
  temPermissao,
  type Permissao,
} from "@/lib/role-permissions";

type ApiSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

type ApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; response: NextResponse };

export function respostaErro(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function autenticarApi(
  permissao: Permissao,
  mensagemSemPermissao: string,
): Promise<ApiResult<ApiSession>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, response: respostaErro("Não autenticado.", 401) };
  }
  if (!temPermissao(session.user.role, permissao)) {
    return { ok: false, response: respostaErro(mensagemSemPermissao, 403) };
  }
  return { ok: true, value: session };
}

export async function validarJson<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
  mensagemPadrao: string,
): Promise<ApiResult<z.infer<TSchema>>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: respostaErro("Corpo JSON inválido.", 400) };
  }

  let parsed: z.ZodSafeParseResult<z.infer<TSchema>>;
  try {
    parsed = schema.safeParse(body);
  } catch (error) {
    return {
      ok: false,
      response: respostaErro(
        error instanceof Error ? error.message : mensagemPadrao,
        400,
      ),
    };
  }
  if (!parsed.success) {
    return {
      ok: false,
      response: respostaErro(parsed.error.issues[0]?.message ?? mensagemPadrao, 400),
    };
  }
  return { ok: true, value: parsed.data };
}

export function aplicarLimite(
  chave: string,
  limite: number,
  janelaMs: number,
  mensagem: string,
): NextResponse | null {
  return checkRateLimit(chave, limite, janelaMs).success
    ? null
    : respostaErro(mensagem, 429);
}

export async function buscarEmpresaAutorizada(
  session: ApiSession,
  empresaId: string,
) {
  return prisma.empresa.findFirst({
    where: {
      id: empresaId,
      ativa: true,
      ...(temAcessoTodasEmpresas(session.user.role)
        ? {}
        : { usuarios: { some: { userId: session.user.id } } }),
    },
  });
}
