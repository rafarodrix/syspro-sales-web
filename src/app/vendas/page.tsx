import { cookies } from "next/headers";
import { NavApp } from "@/components/nav-app";
import { VendasView } from "@/components/vendas-view";
import { requireAuth } from "@/lib/server-auth";
import { dataParaInput } from "@/lib/vendas";
import { obterVendas } from "@/lib/sales-service";
import type { VendaComEmpresa } from "@/lib/syspro-api";

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { empresas } = await requireAuth();
  const { empresa: empresaParam } = await searchParams;
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

  let vendas: VendaComEmpresa[] = [];
  let erroInicial: string | undefined;

  try {
    vendas = await obterVendas({
      empresasLiberadas: empresas,
      empresaSelecionadaId: empresaSelecionada,
      dtInicial: periodo.inicial,
      dtFinal: periodo.final,
    });
  } catch {
    erroInicial = "Não foi possível carregar as vendas.";
  }

  return (
    <NavApp empresaSelecionada={empresaSelecionada}>
      <VendasView
        key={empresaSelecionada ?? "sem-empresa"}
        empresas={empresas.map((e) => ({
          id: e.id,
          cnpj: e.cnpj,
          razaoSocial: e.razaoSocial,
          empresaCodigo: e.empresaCodigo,
        }))}
        empresaInicial={empresaSelecionada}
        initialPeriod={periodo}
        initialVendas={vendas}
        initialError={erroInicial}
      />
    </NavApp>
  );
}
