import { describe, expect, it } from "vitest";
import {
  obterPerfilAcesso,
  obterPerfisAcesso,
  rotaInicialPermitida,
  serializarPerfis,
  temAcessoTodasEmpresas,
  temPermissao,
} from "@/lib/role-permissions";

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
    // Perfil Vendas não enxerga a Análise de Entrega (tem perfil dedicado para isso).
    expect(temPermissao("vendas", "entregas:visualizar")).toBe(false);
    expect(temPermissao("vendas", "relatorios:visualizar")).toBe(false);
  });

  it("concede estoque somente à gerência e administração", () => {
    expect(temPermissao("gerente", "estoque:visualizar")).toBe(true);
    expect(temPermissao("gerente", "compras:visualizar")).toBe(true);
    expect(temPermissao("admin", "estoque:visualizar")).toBe(true);
  });

  it("isola os perfis especializados em seus respectivos relatórios", () => {
    expect(temPermissao("analise_compras", "compras:visualizar")).toBe(true);
    expect(temPermissao("analise_compras", "entregas:visualizar")).toBe(false);
    expect(temPermissao("analise_compras", "estoque:visualizar")).toBe(false);
    expect(temPermissao("analise_entregas", "entregas:visualizar")).toBe(true);
    expect(temPermissao("analise_entregas", "vendas:visualizar")).toBe(false);
  });

  it("combina as permissões de mais de um perfil", () => {
    const roles = "analise_compras,analise_entregas";
    expect(obterPerfisAcesso(roles)).toEqual(["analise_compras", "analise_entregas"]);
    expect(temPermissao(roles, "compras:visualizar")).toBe(true);
    expect(temPermissao(roles, "entregas:visualizar")).toBe(true);
    expect(temPermissao(roles, "dashboard:visualizar")).toBe(false);
    expect(serializarPerfis(["analise_entregas", "analise_compras"])).toBe(
      "analise_entregas,analise_compras",
    );
  });

  it("mantém administrador exclusivo e escolhe uma rota inicial permitida", () => {
    expect(serializarPerfis(["vendas", "admin"])).toBe("admin");
    expect(rotaInicialPermitida("analise_compras")).toBe("/relatorios/compras");
    expect(rotaInicialPermitida("analise_entregas")).toBe("/relatorios/entregas");
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
