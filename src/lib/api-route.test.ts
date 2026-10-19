import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findFirst: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock("@/lib/database", () => ({
  prisma: { empresa: { findFirst: mocks.findFirst } },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
}));

import {
  aplicarLimite,
  autenticarApi,
  buscarEmpresaAutorizada,
  respostaErro,
  validarJson,
} from "@/lib/api-route";

describe("helpers de rota da API", () => {
  it("retorna o primeiro erro de validação em JSON", async () => {
    const request = new Request("http://localhost/api/teste", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "" }),
    });

    const result = await validarJson(
      request,
      z.object({ nome: z.string().min(1, "Nome obrigatório.") }),
      "Dados inválidos.",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      await expect(result.response.json()).resolves.toEqual({ error: "Nome obrigatório." });
    }
  });

  it("distingue JSON malformado de dados inválidos", async () => {
    const request = new Request("http://localhost/api/teste", {
      method: "POST",
      body: "{",
    });

    const result = await validarJson(request, z.object({ nome: z.string() }), "Dados inválidos.");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      await expect(result.response.json()).resolves.toEqual({ error: "Corpo JSON inválido." });
    }
  });

  it("produz respostas de erro consistentes", async () => {
    const response = respostaErro("Não autorizado.", 403);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Não autorizado." });
  });

  it("converte exceções de transformação do schema em erro 400", async () => {
    const schema = z.object({
      origem: z.string().transform(() => {
        throw new Error("Origem não permitida.");
      }),
    });
    const request = new Request("http://localhost/api/teste", {
      method: "POST",
      body: JSON.stringify({ origem: "http://invalida.local" }),
    });

    const result = await validarJson(request, schema, "Dados inválidos.");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      await expect(result.response.json()).resolves.toEqual({ error: "Origem não permitida." });
    }
  });

  it("aceita JSON válido e devolve dados transformados", async () => {
    const request = new Request("http://localhost/api/teste", {
      method: "POST",
      body: JSON.stringify({ nome: "  Syspro  " }),
    });

    const result = await validarJson(
      request,
      z.object({ nome: z.string().transform((nome) => nome.trim()) }),
      "Dados inválidos.",
    );

    expect(result).toEqual({ ok: true, value: { nome: "Syspro" } });
  });

  it("distingue ausência de sessão de falta de permissão", async () => {
    mocks.getSession.mockReset()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ user: { id: "u1", role: "vendas" } });

    const semSessao = await autenticarApi("vendas:visualizar", "Sem permissão.");
    const semPermissao = await autenticarApi("estoque:visualizar", "Sem permissão.");

    expect(semSessao.ok).toBe(false);
    expect(semPermissao.ok).toBe(false);
    if (!semSessao.ok) expect(semSessao.response.status).toBe(401);
    if (!semPermissao.ok) {
      expect(semPermissao.response.status).toBe(403);
      await expect(semPermissao.response.json()).resolves.toEqual({ error: "Sem permissão." });
    }
  });

  it("retorna a sessão quando o perfil possui a permissão", async () => {
    const session = { user: { id: "u1", role: "gerente" } };
    mocks.getSession.mockReset().mockResolvedValue(session);

    await expect(autenticarApi("estoque:visualizar", "Sem permissão."))
      .resolves.toEqual({ ok: true, value: session });
  });

  it("converte rate limit excedido em resposta 429", async () => {
    mocks.checkRateLimit.mockReset()
      .mockReturnValueOnce({ success: true })
      .mockReturnValueOnce({ success: false });

    expect(aplicarLimite("chave", 10, 1_000, "Aguarde.")).toBeNull();
    const bloqueada = aplicarLimite("chave", 10, 1_000, "Aguarde.");
    expect(bloqueada?.status).toBe(429);
    await expect(bloqueada?.json()).resolves.toEqual({ error: "Aguarde." });
  });

  it("restringe empresa por usuário comum e libera todas para admin", async () => {
    mocks.findFirst.mockReset().mockResolvedValue({ id: "empresa-1" });

    await buscarEmpresaAutorizada(
      { user: { id: "u1", role: "gerente" } } as never,
      "empresa-1",
    );
    expect(mocks.findFirst).toHaveBeenLastCalledWith({
      where: {
        id: "empresa-1",
        ativa: true,
        usuarios: { some: { userId: "u1" } },
      },
    });

    await buscarEmpresaAutorizada(
      { user: { id: "admin-1", role: "admin" } } as never,
      "empresa-1",
    );
    expect(mocks.findFirst).toHaveBeenLastCalledWith({
      where: { id: "empresa-1", ativa: true },
    });
  });
});
