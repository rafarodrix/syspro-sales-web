import { NavApp } from "@/components/nav-app";
import { RelatoriosView } from "@/components/relatorios-view";
import { requireAuth } from "@/lib/server-auth";
import { dataParaInput } from "@/lib/vendas";
import { obterVendas } from "@/lib/sales-service";
import type { VendaComEmpresa } from "@/lib/syspro-api";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string; aba?: string }>;
}) {
  const { empresas } = await requireAuth("gerente");
  const { empresa: empresaParam, aba: abaParam } = await searchParams;

  const empresaSelecionada =
    empresaParam === "todas"
      ? "todas"
      : empresaParam && empresas.some((e) => e.id === empresaParam)
        ? empresaParam
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
    erroInicial = "Não foi possível carregar os dados dos relatórios.";
  }

  return (
    <NavApp empresaSelecionada={empresaSelecionada}>
      <RelatoriosView
        key={`${empresaSelecionada ?? "sem-empresa"}-${abaParam ?? "default"}`}
        empresas={empresas.map((e) => ({
          id: e.id,
          cnpj: e.cnpj,
          razaoSocial: e.razaoSocial,
        }))}
        empresaInicial={empresaSelecionada}
        abaInicial={abaParam}
        initialPeriod={periodo}
        initialVendas={vendas}
        initialError={erroInicial}
      />
    </NavApp>
  );
}
