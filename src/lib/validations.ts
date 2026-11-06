import { z } from "zod";

export const UserRoleSchema = z.enum([
  "admin",
  "gerente",
  "supervisor",
  "vendas",
  "analise_compras",
  "analise_entregas",
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

const UserRolesSchema = z.array(UserRoleSchema)
  .min(1, "Selecione ao menos um perfil de acesso.")
  .max(6, "Quantidade de perfis inválida.")
  .refine((roles) => new Set(roles).size === roles.length, "Não repita perfis de acesso.");

export function sanitizarSysproUrl(rawUrl: string): string {
  const urlLimpa = rawUrl.trim();
  if (!urlLimpa) return "http://localhost:8080";

  let parsed: URL;
  try {
    // Normaliza o protocolo para minúsculo antes do parse (HTTP://, HtTp:// etc.)
    const comProtocolo = /^https?:\/\//i.test(urlLimpa) ? urlLimpa : `http://${urlLimpa}`;
    parsed = new URL(comProtocolo);
  } catch {
    throw new Error("URL do Syspro invalida.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("O protocolo da URL do Syspro deve ser HTTP ou HTTPS.");
  }
  if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("Informe somente a origem da API Syspro (protocolo, host e porta).");
  }
  if (!obterOrigensSysproPermitidas().has(parsed.origin)) {
    throw new Error("A origem da API Syspro nao esta na allowlist SYSPRO_ALLOWED_ORIGINS do servidor.");
  }
  return parsed.origin;
}

export function obterOrigensSysproPermitidas(): Set<string> {
  const configuradas = process.env.SYSPRO_ALLOWED_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];
  return new Set(["http://localhost:8080", "http://127.0.0.1:8080", ...configuradas].flatMap((origin) => {
    try {
      const url = new URL(origin);
      return url.protocol === "http:" || url.protocol === "https:" ? [url.origin] : [];
    } catch {
      return [];
    }
  }));
}

export const usuarioCreateSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres."),
  email: z.string().trim().toLowerCase().email("E-mail invalido."),
  password: z.string().min(12, "Senha deve ter no minimo 12 caracteres."),
  role: UserRoleSchema.optional(),
  roles: UserRolesSchema.optional(),
}).transform(({ role, roles, ...usuario }) => ({
  ...usuario,
  roles: roles ?? (role ? [role] : ["vendas"] satisfies UserRole[]),
}));

export const usuarioUpdateSchema = z.object({
  id: z.string().min(1, "ID da empresa e obrigatorio."),
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres.").optional(),
  email: z.string().trim().toLowerCase().email("E-mail invalido.").optional(),
  password: z.string().min(12, "Senha deve ter no minimo 12 caracteres.").optional().or(z.literal("")),
  role: UserRoleSchema.optional(),
  roles: UserRolesSchema.optional(),
}).transform(({ role, roles, ...usuario }) => ({
  ...usuario,
  roles: roles ?? (role ? [role] : undefined),
}));

export const usuarioLiberarSchema = z.object({
  userId: z.string().min(1, "userId e obrigatorio."),
  empresaId: z.string().min(1, "empresaId e obrigatorio."),
});

const diasCoberturaSchema = z.number().int().min(1).max(365);

export const limitesEstoqueEmpresaSchema = z.object({
  coberturaCriticaDias: diasCoberturaSchema,
  coberturaAtencaoDias: diasCoberturaSchema,
  coberturaExcessoDias: diasCoberturaSchema,
  coberturaCompraDias: diasCoberturaSchema,
}).superRefine((limites, contexto) => {
  if (limites.coberturaCriticaDias >= limites.coberturaAtencaoDias) {
    contexto.addIssue({
      code: "custom",
      path: ["coberturaCriticaDias"],
      message: "O limite crítico deve ser menor que o limite de atenção.",
    });
  }
  if (limites.coberturaAtencaoDias >= limites.coberturaExcessoDias) {
    contexto.addIssue({
      code: "custom",
      path: ["coberturaAtencaoDias"],
      message: "O limite de atenção deve ser menor que o limite de excesso.",
    });
  }
});

export const empresaCreateSchema = z.object({
  cnpj: z.string().transform((val) => val.replace(/\D/g, "")).pipe(z.string().length(14, "CNPJ deve conter exatamente 14 digitos.")),
  razaoSocial: z.string().trim().min(2, "Razao Social e obrigatoria."),
  empresaCodigo: z.string().trim().min(1, "Codigo da empresa no Syspro e obrigatorio."),
  sysproBaseUrl: z.string().optional().transform((val) => (val ? sanitizarSysproUrl(val) : "http://localhost:8080")),
  sysproUseIis: z.boolean().default(false),
  sysproToken: z.string().trim().max(200).optional().transform((val) => (val ? val : null)),
  coberturaCriticaDias: diasCoberturaSchema.default(7),
  coberturaAtencaoDias: diasCoberturaSchema.default(15),
  coberturaExcessoDias: diasCoberturaSchema.default(90),
  coberturaCompraDias: diasCoberturaSchema.default(30),
  grupoEstoquePadrao: z.string().trim().max(50).default("GERAL"),
}).superRefine((empresa, contexto) => {
  if (empresa.coberturaCriticaDias >= empresa.coberturaAtencaoDias) {
    contexto.addIssue({
      code: "custom",
      path: ["coberturaCriticaDias"],
      message: "O limite crítico deve ser menor que o limite de atenção.",
    });
  }
  if (empresa.coberturaAtencaoDias >= empresa.coberturaExcessoDias) {
    contexto.addIssue({
      code: "custom",
      path: ["coberturaAtencaoDias"],
      message: "O limite de atenção deve ser menor que o limite de excesso.",
    });
  }
});

export const empresaUpdateSchema = z.object({
  id: z.string().min(1, "ID do usuario e obrigatorio."),
  cnpj: z.string().transform((val) => val.replace(/\D/g, "")).pipe(z.string().length(14, "CNPJ deve conter exatamente 14 digitos.")).optional(),
  razaoSocial: z.string().trim().min(2, "Razao Social deve ter ao menos 2 caracteres.").optional(),
  empresaCodigo: z.string().trim().min(1, "Codigo da empresa e obrigatorio.").optional(),
  ativa: z.boolean().optional(),
  sysproBaseUrl: z.string().optional().transform((val) => (val !== undefined ? sanitizarSysproUrl(val) : undefined)),
  sysproUseIis: z.boolean().optional(),
  sysproToken: z.string().trim().max(200).optional().transform((val) => (val === undefined ? undefined : val ? val : null)),
  coberturaCriticaDias: diasCoberturaSchema.optional(),
  coberturaAtencaoDias: diasCoberturaSchema.optional(),
  coberturaExcessoDias: diasCoberturaSchema.optional(),
  coberturaCompraDias: diasCoberturaSchema.optional(),
  grupoEstoquePadrao: z.string().trim().max(50).optional(),
});

const padraoDataBR = /^\d{2}\/\d{2}\/\d{4}$/;
const padraoDataISO = /^\d{4}-\d{2}-\d{2}$/;

export const vendasQuerySchema = z.object({
  empresaId: z.string().min(1, "Empresa e obrigatoria."),
  dtInicial: z.string().refine((val) => padraoDataBR.test(val) || padraoDataISO.test(val), { message: "Data inicial deve estar no formato DD/MM/AAAA ou AAAA-MM-DD." }),
  dtFinal: z.string().refine((val) => padraoDataBR.test(val) || padraoDataISO.test(val), { message: "Data final deve estar no formato DD/MM/AAAA ou AAAA-MM-DD." }),
  forcarAtualizacao: z.boolean().optional().default(false),
});

export const kardexQuerySchema = vendasQuerySchema
  .omit({ forcarAtualizacao: true })
  .extend({
    codigoAuxiliar: z.string().trim().min(1, "Código auxiliar do produto é obrigatório.").max(100),
  });

export const configuracaoTesteSchema = z.object({
  baseUrl: z.string().trim().min(1, "URL da API Syspro não informada."),
  useIis: z.boolean({ error: "Modo IIS inválido." }),
  token: z.string().trim().max(200).optional(),
});

