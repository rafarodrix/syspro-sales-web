import { z } from "zod";

export const UserRoleSchema = z.enum(["admin", "gerente", "vendas"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

/**
 * Validação e sanitização de URL de conexão com o Syspro ERP.
 * Previne ataques de SSRF (Server-Side Request Forgery) e esquemas inválidos.
 */
export function sanitizarSysproUrl(rawUrl: string): string {
  const urlLimpa = rawUrl.trim();
  if (!urlLimpa) return "http://localhost:8080";

  let parsed: URL;
  try {
    parsed = new URL(
      urlLimpa.startsWith("http://") || urlLimpa.startsWith("https://")
        ? urlLimpa
        : `http://${urlLimpa}`,
    );
  } catch {
    throw new Error("URL do Syspro inválida.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("O protocolo da URL do Syspro deve ser HTTP ou HTTPS.");
  }

  const host = parsed.hostname.toLowerCase();
  const hostsBloqueados = [
    "169.254.169.254", // AWS/GCP metadata
    "metadata.google.internal",
    "instance-data",
  ];

  if (hostsBloqueados.includes(host)) {
    throw new Error("Endereço de host bloqueado por política de segurança.");
  }

  // Retorna origin ou com porta preservada
  return parsed.origin;
}

// ==========================================
// Schemas de Usuários
// ==========================================

export const usuarioCreateSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres."),
  role: UserRoleSchema.default("vendas"),
});

export const usuarioUpdateSchema = z.object({
  id: z.string().min(1, "ID do usuário é obrigatório."),
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres.").optional(),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").optional(),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres.").optional().or(z.literal("")),
  role: UserRoleSchema.optional(),
});

export const usuarioLiberarSchema = z.object({
  userId: z.string().min(1, "userId é obrigatório."),
  empresaId: z.string().min(1, "empresaId é obrigatório."),
});

// ==========================================
// Schemas de Empresas
// ==========================================

export const empresaCreateSchema = z.object({
  cnpj: z
    .string()
    .transform((val) => val.replace(/\D/g, ""))
    .pipe(z.string().length(14, "CNPJ deve conter exatamente 14 dígitos.")),
  razaoSocial: z.string().trim().min(2, "Razão Social é obrigatória."),
  empresaCodigo: z.string().trim().min(1, "Código da empresa no Syspro é obrigatório."),
  sysproBaseUrl: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizarSysproUrl(val) : "http://localhost:8080")),
  sysproUseIis: z.boolean().default(false),
});

export const empresaUpdateSchema = z.object({
  id: z.string().min(1, "ID da empresa é obrigatório."),
  cnpj: z
    .string()
    .transform((val) => val.replace(/\D/g, ""))
    .pipe(z.string().length(14, "CNPJ deve conter exatamente 14 dígitos."))
    .optional(),
  razaoSocial: z.string().trim().min(2, "Razão Social deve ter ao menos 2 caracteres.").optional(),
  empresaCodigo: z.string().trim().min(1, "Código da empresa é obrigatório.").optional(),
  ativa: z.boolean().optional(),
  sysproBaseUrl: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? sanitizarSysproUrl(val) : undefined)),
  sysproUseIis: z.boolean().optional(),
});

// ==========================================
// Schemas de Vendas & Consultas
// ==========================================

const padraoDataBR = /^\d{2}\/\d{2}\/\d{4}$/;
const padraoDataISO = /^\d{4}-\d{2}-\d{2}$/;

export const vendasQuerySchema = z.object({
  empresaId: z.string().min(1, "Empresa é obrigatória."),
  dtInicial: z
    .string()
    .refine((val) => padraoDataBR.test(val) || padraoDataISO.test(val), {
      message: "Data inicial deve estar no formato DD/MM/AAAA ou AAAA-MM-DD.",
    }),
  dtFinal: z
    .string()
    .refine((val) => padraoDataBR.test(val) || padraoDataISO.test(val), {
      message: "Data final deve estar no formato DD/MM/AAAA ou AAAA-MM-DD.",
    }),
  forcarAtualizacao: z.boolean().optional().default(false),
});
