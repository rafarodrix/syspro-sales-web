import { cookies } from "next/headers";
import { requireAuth } from "@/lib/server-auth";
import { calcularPeriodoAnterior, dataParaInput } from "@/lib/vendas";
import { obterVendas, type EmpresaInfo } from "@/lib/sales-service";
import type { VendaComEmpresa } from "@/lib/syspro-api";
import type { UserRole } from "@/lib/validations";

export interface ServerPageContextOptions {
  minRole?: "admin" | "gerente";
  searchParams: Promise<{ empresa?: string; aba?: string }>;
  carregarPeriodoAnterior?: boolean;
}

export interface ServerPageContextResult {
  session: unknown;
  userRole: UserRole;
  isAdmin: boolean;
  empresas: EmpresaInfo[];
  empresaSelecionada: string;
  periodo: { inicial: string; final: string };
  periodoAnterior?: { inicial: string; final: string };
  vendas: VendaComEmpresa[];
  vendasAnteriores?: VendaComEmpresa[];
  erroInicial?: string;
  abaParam?: string;
}

export async function resolveServerPageContext({
  minRole,
  searchParams,
  carregarPeriodoAnterior = false,
}: ServerPageContextOptions): Promise<ServerPageContextResult> {
  const { session, userRole, isAdmin, empresas } = await requireAuth(minRole);
  const { empresa: empresaParam, aba: abaParam } = await searchParams;
  const cookieStore = await cookies();
  const cookieEmpresa = cookieStore.get("syspro_empresa_ativa")?.value;

  const empresaAlvoStr = empresaParam || cookieEmpresa || "";
  const idsParam = empresaAlvoStr.split(",").map((s) => s.trim()).filter(Boolean);
  const saoIdsValidos = idsParam.length > 0 && idsParam.every((id) => empresas.some((e) => e.id === id));

  const empresaSelecionada =
    empresaAlvoStr === "todas"
      ? "todas"
      : saoIdsValidos
        ? empresaAlvoStr
        : (empresas[0]?.id ?? "");

  const hoje = new Date();
  const periodoPadrao = {
    inicial: dataParaInput(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    final: dataParaInput(hoje),
  };

  const cookieDtInicial = cookieStore.get("syspro_periodo_inicial")?.value;
  const cookieDtFinal = cookieStore.get("syspro_periodo_final")?.value;

  const periodo =
    cookieDtInicial && cookieDtFinal
      ? { inicial: cookieDtInicial, final: cookieDtFinal }
      : periodoPadrao;

  let periodoAnterior: { inicial: string; final: string } | undefined;
  if (carregarPeriodoAnterior) {
    periodoAnterior = calcularPeriodoAnterior(periodo.inicial, periodo.final);
  }

  let vendas: VendaComEmpresa[] = [];
  let vendasAnteriores: VendaComEmpresa[] = [];
  let erroInicial: string | undefined;

  try {
    if (carregarPeriodoAnterior && periodoAnterior) {
      const [atual, anterior] = await Promise.all([
        obterVendas({
          actorId: session.user.id,
          empresasLiberadas: empresas,
          empresaSelecionadaId: empresaSelecionada,
          dtInicial: periodo.inicial,
          dtFinal: periodo.final,
        }),
        obterVendas({
          actorId: session.user.id,
          empresasLiberadas: empresas,
          empresaSelecionadaId: empresaSelecionada,
          dtInicial: periodoAnterior.inicial,
          dtFinal: periodoAnterior.final,
        }).catch(() => []),
      ]);
      vendas = atual;
      vendasAnteriores = anterior;
    } else {
      vendas = await obterVendas({
        actorId: session.user.id,
        empresasLiberadas: empresas,
        empresaSelecionadaId: empresaSelecionada,
        dtInicial: periodo.inicial,
        dtFinal: periodo.final,
      });
    }
  } catch {
    erroInicial = "Não foi possível carregar os dados de vendas.";
  }

  return {
    session,
    userRole,
    isAdmin,
    empresas,
    empresaSelecionada,
    periodo,
    periodoAnterior,
    vendas,
    vendasAnteriores: carregarPeriodoAnterior ? vendasAnteriores : undefined,
    erroInicial,
    abaParam,
  };
}
