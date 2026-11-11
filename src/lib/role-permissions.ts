export const PERFIS_ACESSO = {
  vendas: {
    id: "vendas",
    nome: "Vendas",
    descricao: "Dashboard e vendas.",
    permissoes: ["dashboard:visualizar", "vendas:visualizar"],
  },
  analise_entregas: {
    id: "analise_entregas",
    nome: "Análise de Entregas",
    descricao: "Acesso somente ao relatório de entregas.",
    permissoes: ["entregas:visualizar"],
  },
  supervisor: {
    id: "supervisor",
    nome: "Supervisor de Vendas",
    descricao: "Vendas, entregas e relatórios comerciais.",
    permissoes: ["dashboard:visualizar", "vendas:visualizar", "relatorios:visualizar", "entregas:visualizar"],
  },
  analise_compras: {
    id: "analise_compras",
    nome: "Análise de Compras",
    descricao: "Acesso somente ao relatório de compras.",
    permissoes: ["compras:visualizar"],
  },
  gerente: {
    id: "gerente",
    nome: "Gerente Comercial",
    descricao: "Vendas, relatórios, estoque, compras e entregas.",
    permissoes: [
      "dashboard:visualizar",
      "vendas:visualizar",
      "relatorios:visualizar",
      "estoque:visualizar",
      "compras:visualizar",
      "entregas:visualizar",
    ],
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
      "compras:visualizar",
      "entregas:visualizar",
      "usuarios:gerenciar",
      "empresas:gerenciar",
      "configuracoes:gerenciar",
    ],
  },
} as const;

export type PerfilAcesso = keyof typeof PERFIS_ACESSO;
export type Permissao = (typeof PERFIS_ACESSO)[PerfilAcesso]["permissoes"][number];
export type PerfisFonte = string | readonly string[] | null | undefined;

export const PERFIS_ORDENADOS = [
  PERFIS_ACESSO.vendas,
  PERFIS_ACESSO.analise_entregas,
  PERFIS_ACESSO.supervisor,
  PERFIS_ACESSO.analise_compras,
  PERFIS_ACESSO.gerente,
  PERFIS_ACESSO.admin,
] as const;

export function obterPerfilAcesso(role?: string | null) {
  if (!role || !(role in PERFIS_ACESSO)) return null;
  return PERFIS_ACESSO[role as PerfilAcesso];
}

export function obterPerfisAcesso(fonte: PerfisFonte): PerfilAcesso[] {
  const valores = Array.isArray(fonte) ? fonte : String(fonte ?? "").split(",");
  const perfis = valores
    .map((valor) => String(valor).trim())
    .filter((valor): valor is PerfilAcesso => valor in PERFIS_ACESSO);
  return [...new Set(perfis)];
}

export function serializarPerfis(fonte: PerfisFonte): string {
  const selecionados = obterPerfisAcesso(fonte);
  if (selecionados.includes("admin")) return "admin";
  const ordenados = PERFIS_ORDENADOS
    .map((perfil) => perfil.id)
    .filter((id) => selecionados.includes(id));
  return (ordenados.length > 0 ? ordenados : ["vendas"]).join(",");
}

export function nomesPerfis(fonte: PerfisFonte): string {
  return obterPerfisAcesso(fonte).map((id) => PERFIS_ACESSO[id].nome).join(" + ");
}

export function temPermissao(fonte: PerfisFonte, permissao: Permissao): boolean {
  return obterPerfisAcesso(fonte).some((role) =>
    PERFIS_ACESSO[role].permissoes.includes(permissao as never),
  );
}

export function temAcessoTodasEmpresas(fonte: PerfisFonte): boolean {
  return obterPerfisAcesso(fonte).includes("admin");
}

export function rotaInicialPermitida(fonte: PerfisFonte): string {
  if (temPermissao(fonte, "dashboard:visualizar")) return "/dashboard";
  if (temPermissao(fonte, "vendas:visualizar")) return "/vendas";
  if (temPermissao(fonte, "relatorios:visualizar")) return "/relatorios";
  if (temPermissao(fonte, "estoque:visualizar")) return "/estoque";
  if (temPermissao(fonte, "compras:visualizar")) return "/relatorios/compras";
  if (temPermissao(fonte, "entregas:visualizar")) return "/relatorios/entregas";
  return "/login";
}
