import { cookies } from "next/headers";
import { erroPeriodo } from "@/lib/periodo";
import { requireAuth } from "@/lib/server-auth";
import { calcularPeriodoAnterior, dataParaInput } from "@/lib/vendas";
import { obterVendas, SalesIntegrationError, type EmpresaInfo } from "@/lib/sales-service";
import type { VendaComEmpresa } from "@/lib/syspro-api";
import type { UserRole } from "@/lib/validations";
import type { Permissao } from "@/lib/role-permissions";
import {
  resolverComparacao,
  type ModoComparacao,
} from "@/lib/periodo-comparacao";

export interface ServerPageContextOptions {
  permissao?: Permissao;
  searchParams: Promise<{
    empresa?: string;
    aba?: string;
    periodoInicial?: string;
    periodoFinal?: string;
    comparacao?: string;
    comparacaoInicial?: string;
    comparacaoFinal?: string;
  }>;
  carregarPeriodoAnterior?: boolean;
  comparacaoCalendarioClientes?: boolean;
  comparacaoMesAnteriorPadrao?: boolean;
  ignorarPeriodoCookie?: boolean;
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
  comparacaoDisponivel?: boolean;
  erroInicial?: string;
  abaParam?: string;
  modoComparacao?: ModoComparacao;
  comparacaoPersonalizada?: { inicial: string; final: string };
}

export async function resolveServerPageContext({
  permissao,
  searchParams,
  carregarPeriodoAnterior = false,
  comparacaoCalendarioClientes = false,
  comparacaoMesAnteriorPadrao = false,
  ignorarPeriodoCookie = false,
}: ServerPageContextOptions): Promise<ServerPageContextResult> {
  const { session, userRole, isAdmin, empresas } = await requireAuth(permissao);
  const {
    empresa: empresaParam,
    aba: abaParam,
    periodoInicial,
    periodoFinal,
    comparacao,
    comparacaoInicial,
    comparacaoFinal,
  } = await searchParams;
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

  const periodoQuery = {
    inicial: periodoInicial ?? "",
    final: periodoFinal ?? "",
  };
  const periodoCookie = {
    inicial: cookieDtInicial ?? "",
    final: cookieDtFinal ?? "",
  };
  const periodo = !erroPeriodo(periodoQuery)
    ? periodoQuery
    : ignorarPeriodoCookie
      ? periodoPadrao
      : erroPeriodo(periodoCookie)
        ? periodoPadrao
        : periodoCookie;
  const modosComparacao: ModoComparacao[] = [
    "automatico",
    "dias-anteriores",
    "mes-anterior",
    "ano-anterior",
    "personalizado",
  ];
  const comparacaoPersonalizada = {
    inicial: comparacaoInicial ?? "",
    final: comparacaoFinal ?? "",
  };
  const modoComparacaoSolicitado = modosComparacao.includes(
    comparacao as ModoComparacao,
  )
    ? (comparacao as ModoComparacao)
    : "mes-anterior";
  const modoComparacao =
    modoComparacaoSolicitado === "personalizado" &&
    erroPeriodo(comparacaoPersonalizada)
      ? "mes-anterior"
      : modoComparacaoSolicitado;

  let periodoAnterior: { inicial: string; final: string } | undefined;
  if (carregarPeriodoAnterior) {
    periodoAnterior = comparacaoMesAnteriorPadrao
      ? resolverComparacao(
          periodo,
          modoComparacao,
          modoComparacao === "personalizado"
            ? comparacaoPersonalizada
            : undefined,
        )
      : comparacaoCalendarioClientes && abaParam === "clientes"
        ? resolverComparacao(periodo, "mes-anterior")
        : calcularPeriodoAnterior(periodo.inicial, periodo.final);
  }

  let vendas: VendaComEmpresa[] = [];
  let vendasAnteriores: VendaComEmpresa[] = [];
  let comparacaoDisponivel = !carregarPeriodoAnterior;
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
        }).then((dados) => ({ dados, disponivel: true }), () => ({ dados: [] as VendaComEmpresa[], disponivel: false })),
      ]);
      vendas = atual;
      vendasAnteriores = anterior.dados;
      comparacaoDisponivel = anterior.disponivel;
    } else {
      vendas = await obterVendas({
        actorId: session.user.id,
        empresasLiberadas: empresas,
        empresaSelecionadaId: empresaSelecionada,
        dtInicial: periodo.inicial,
        dtFinal: periodo.final,
      });
    }
  } catch (error) {
    erroInicial = error instanceof SalesIntegrationError
      ? error.message
      : "Não foi possível carregar os dados de vendas.";
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
    comparacaoDisponivel,
    erroInicial,
    abaParam,
    modoComparacao,
    comparacaoPersonalizada:
      modoComparacao === "personalizado" ? comparacaoPersonalizada : undefined,
  };
}
