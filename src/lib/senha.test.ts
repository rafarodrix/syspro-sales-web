import { describe, expect, it } from "vitest";

import { SENHA_MINIMA, mensagemErroSenha, validarTrocaSenha } from "@/lib/senha";

describe("troca de senha do usuário", () => {
  it("exige a senha atual", () => {
    expect(validarTrocaSenha({ atual: "", nova: "senha-nova-1", confirmacao: "senha-nova-1" }))
      .toEqual({ ok: false, erro: "Informe a senha atual." });
  });

  it("respeita o tamanho mínimo", () => {
    const curta = "a".repeat(SENHA_MINIMA - 1);
    const resultado = validarTrocaSenha({ atual: "atual-123", nova: curta, confirmacao: curta });
    expect(resultado.ok).toBe(false);
    expect(resultado).toMatchObject({ erro: expect.stringContaining(String(SENHA_MINIMA)) });
  });

  it("exige confirmação igual", () => {
    expect(validarTrocaSenha({ atual: "atual-123", nova: "senha-nova-1", confirmacao: "outra-senha" }))
      .toEqual({ ok: false, erro: "A confirmação não confere com a nova senha." });
  });

  it("recusa repetir a senha atual", () => {
    expect(validarTrocaSenha({ atual: "senha-nova-1", nova: "senha-nova-1", confirmacao: "senha-nova-1" }))
      .toEqual({ ok: false, erro: "A nova senha precisa ser diferente da atual." });
  });

  it("aceita uma troca válida", () => {
    expect(validarTrocaSenha({ atual: "atual-123", nova: "senha-nova-1", confirmacao: "senha-nova-1" }))
      .toEqual({ ok: true });
  });

  it("traduz o erro de senha atual do Better Auth", () => {
    expect(mensagemErroSenha("INVALID_PASSWORD", "Invalid password")).toBe("Senha atual incorreta.");
    expect(mensagemErroSenha(undefined, "Incorrect password")).toBe("Senha atual incorreta.");
  });

  it("traduz erro de tamanho e erro desconhecido", () => {
    expect(mensagemErroSenha("PASSWORD_TOO_SHORT", "Password too short")).toContain("pelo menos 8");
    expect(mensagemErroSenha("ERRO_QUALQUER", "boom")).toBe(
      "Não foi possível alterar a senha. Tente novamente.",
    );
  });
});
