import { NavApp } from "@/components/nav-app";
import { DashboardView } from "@/components/dashboard-view";
import { resolveServerPageContext } from "@/lib/server-page-context";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    empresa?: string;
    periodoInicial?: string;
    periodoFinal?: string;
    comparacao?: string;
    comparacaoInicial?: string;
    comparacaoFinal?: string;
    visao?: string;
  }>;
}) {
  const params = await searchParams;
  const searchParamsVisao =
    params.visao === "fornecedores" ? ("fornecedores" as const) : undefined;

  const ctx = await resolveServerPageContext({
    permissao: "dashboard:visualizar",
    searchParams,
    carregarPeriodoAnterior: true,
    comparacaoMesAnteriorPadrao: true,
    ignorarPeriodoCookie: true,
  });

  return (
    <NavApp empresaSelecionada={ctx.empresaSelecionada}>
      <DashboardView
        key={ctx.empresaSelecionada ?? "sem-empresa"}
        empresas={ctx.empresas.map((item) => ({
          id: item.id,
          cnpj: item.cnpj,
          razaoSocial: item.razaoSocial,
        }))}
        empresaInicial={ctx.empresaSelecionada}
        initialPeriod={ctx.periodo}
        initialVendas={ctx.vendas}
        initialPeriodoAnterior={ctx.periodoAnterior}
        initialModoComparacao={ctx.modoComparacao}
        initialComparacaoPersonalizada={ctx.comparacaoPersonalizada}
        initialVendasAnteriores={ctx.vendasAnteriores ?? []}
        initialComparacaoDisponivel={ctx.comparacaoDisponivel}
        initialVisao={searchParamsVisao}
        initialError={ctx.erroInicial}
      />
    </NavApp>
  );
}
