import { describe, expect, it } from "vitest";
import { obterPerfilAcesso, temAcessoTodasEmpresas, temPermissao } from "@/lib/role-permissions";

describe("permissões por perfil", () => {
  it("atribui ao supervisor somente as permissões comerciais e de relatórios", () => {
    expect(temPermissao("supervisor", "dashboard:visualizar")).toBe(true);
    expect(temPermissao("supervisor", "vendas:visualizar")).toBe(true);
    expect(temPermissao("supervisor", "relatorios:visualizar")).toBe(true);
    expect(temPermissao("supervisor", "estoque:visualizar")).toBe(false);
    expect(temPermissao("supervisor", "usuarios:gerenciar")).toBe(false);
  });

  it("mantém vendas no menor privilégio", () => {
    expect(temPermissao("vendas", "vendas:visualizar")).toBe(true);
    expect(temPermissao("vendas", "relatorios:visualizar")).toBe(false);
  });

  it("concede estoque somente à gerência e administração", () => {
    expect(temPermissao("gerente", "estoque:visualizar")).toBe(true);
    expect(temPermissao("admin", "estoque:visualizar")).toBe(true);
  });

  it("nega perfis legados ou inválidos por padrão", () => {
    expect(obterPerfilAcesso("gerencia")).toBeNull();
    expect(obterPerfilAcesso("user")).toBeNull();
    expect(temPermissao("desconhecido", "dashboard:visualizar")).toBe(false);
  });

  it("mantém o escopo global de empresas exclusivo do administrador", () => {
    expect(temAcessoTodasEmpresas("admin")).toBe(true);
    expect(temAcessoTodasEmpresas("gerente")).toBe(false);
  });
});
