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

  const idsParam = (empresaParam ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const saoIdsValidos = idsParam.length > 0 && idsParam.every((id) => empresas.some((e) => e.id === id));

  const empresaSelecionada =
    empresaParam === "todas"
      ? "todas"
      : saoIdsValidos
        ? empresaParam!
        : (empresas[0]?.id ?? "");

  const hoje = new Date();
  const periodo = {
    inicial: dataParaInput(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    final: dataParaInput(hoje),
  };

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
