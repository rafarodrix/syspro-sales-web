export const PERFIS_ACESSO = {
  vendas: {
    id: "vendas",
    nome: "Vendas",
    descricao: "Dashboard e consulta de vendas.",
    permissoes: ["dashboard:visualizar", "vendas:visualizar"],
  },
  supervisor: {
    id: "supervisor",
    nome: "Supervisor de Vendas",
    descricao: "Vendas e relatórios comerciais.",
    permissoes: ["dashboard:visualizar", "vendas:visualizar", "relatorios:visualizar"],
  },
  gerente: {
    id: "gerente",
    nome: "Gerente Comercial",
    descricao: "Vendas, relatórios e estoque.",
    permissoes: ["dashboard:visualizar", "vendas:visualizar", "relatorios:visualizar", "estoque:visualizar"],
  },
  admin: {
    id: "admin",
    nome: "Administrador",
    descricao: "Acesso total ao sistema e às empresas ativas.",
    permissoes: [
      "dashboard:visualizar",
      "vendas:visualizar",
      "relatorios:visualizar",
      "estoque:visualizar",
      "usuarios:gerenciar",
      "empresas:gerenciar",
      "configuracoes:gerenciar",
    ],
  },
} as const;

export type PerfilAcesso = keyof typeof PERFIS_ACESSO;
export type Permissao = (typeof PERFIS_ACESSO)[PerfilAcesso]["permissoes"][number];

export const PERFIS_ORDENADOS = [
  PERFIS_ACESSO.vendas,
  PERFIS_ACESSO.supervisor,
  PERFIS_ACESSO.gerente,
  PERFIS_ACESSO.admin,
] as const;

export function obterPerfilAcesso(role?: string | null) {
  if (!role || !(role in PERFIS_ACESSO)) return null;
  return PERFIS_ACESSO[role as PerfilAcesso];
}

export function temPermissao(role: string | null | undefined, permissao: Permissao): boolean {
  return obterPerfilAcesso(role)?.permissoes.includes(permissao as never) ?? false;
}

export function temAcessoTodasEmpresas(role: string | null | undefined): boolean {
  return role === "admin";
}
