import { NavApp } from "@/components/nav-app";
import { DashboardView } from "@/components/dashboard-view";
import { resolveServerPageContext } from "@/lib/server-page-context";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const ctx = await resolveServerPageContext({
    permissao: "dashboard:visualizar",
    searchParams: searchParams as Promise<{ empresa?: string; aba?: string }>,
    carregarPeriodoAnterior: true,
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
        initialVendasAnteriores={ctx.vendasAnteriores ?? []}
        initialError={ctx.erroInicial}
      />
    </NavApp>
  );
}
