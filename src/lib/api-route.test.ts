import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@/lib/database", () => ({
  prisma: { empresa: { findFirst: vi.fn() } },
}));

import { respostaErro, validarJson } from "@/lib/api-route";

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
});
