import { z } from "zod";

export const UserRoleSchema = z.enum(["admin", "gerente", "vendas"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export function sanitizarSysproUrl(rawUrl: string): string {
  const urlLimpa = rawUrl.trim();
  if (!urlLimpa) return "http://localhost:8080";

  let parsed: URL;
  try {
    parsed = new URL(urlLimpa.startsWith("http://") || urlLimpa.startsWith("https://") ? urlLimpa : `http://${urlLimpa}`);
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
  role: UserRoleSchema.default("vendas"),
});

export const usuarioUpdateSchema = z.object({
  id: z.string().min(1, "ID da empresa e obrigatorio."),
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres.").optional(),
  email: z.string().trim().toLowerCase().email("E-mail invalido.").optional(),
  password: z.string().min(12, "Senha deve ter no minimo 12 caracteres.").optional().or(z.literal("")),
  role: UserRoleSchema.optional(),
});

export const usuarioLiberarSchema = z.object({
  userId: z.string().min(1, "userId e obrigatorio."),
  empresaId: z.string().min(1, "empresaId e obrigatorio."),
});

export const empresaCreateSchema = z.object({
  cnpj: z.string().transform((val) => val.replace(/\D/g, "")).pipe(z.string().length(14, "CNPJ deve conter exatamente 14 digitos.")),
  razaoSocial: z.string().trim().min(2, "Razao Social e obrigatoria."),
  empresaCodigo: z.string().trim().min(1, "Codigo da empresa no Syspro e obrigatorio."),
  sysproBaseUrl: z.string().optional().transform((val) => (val ? sanitizarSysproUrl(val) : "http://localhost:8080")),
  sysproUseIis: z.boolean().default(false).transform((val) => (val ? "true" : "false")),
});

export const empresaUpdateSchema = z.object({
  id: z.string().min(1, "ID do usuario e obrigatorio."),
  cnpj: z.string().transform((val) => val.replace(/\D/g, "")).pipe(z.string().length(14, "CNPJ deve conter exatamente 14 digitos.")).optional(),
  razaoSocial: z.string().trim().min(2, "Razao Social deve ter ao menos 2 caracteres.").optional(),
  empresaCodigo: z.string().trim().min(1, "Codigo da empresa e obrigatorio.").optional(),
  ativa: z.boolean().optional(),
  sysproBaseUrl: z.string().optional().transform((val) => (val !== undefined ? sanitizarSysproUrl(val) : undefined)),
  sysproUseIis: z.boolean().optional().transform((val) => (val === undefined ? undefined : val ? "true" : "false")),
});

const padraoDataBR = /^\d{2}\/\d{2}\/\d{4}$/;
const padraoDataISO = /^\d{4}-\d{2}-\d{2}$/;

export const vendasQuerySchema = z.object({
  empresaId: z.string().min(1, "Empresa e obrigatoria."),
  dtInicial: z.string().refine((val) => padraoDataBR.test(val) || padraoDataISO.test(val), { message: "Data inicial deve estar no formato DD/MM/AAAA ou AAAA-MM-DD." }),
  dtFinal: z.string().refine((val) => padraoDataBR.test(val) || padraoDataISO.test(val), { message: "Data final deve estar no formato DD/MM/AAAA ou AAAA-MM-DD." }),
  forcarAtualizacao: z.boolean().optional().default(false),
});
