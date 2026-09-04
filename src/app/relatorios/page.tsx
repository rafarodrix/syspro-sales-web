import { NavApp } from "@/components/nav-app";
import { RelatoriosView } from "@/components/relatorios-view";
import { resolveServerPageContext } from "@/lib/server-page-context";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string; aba?: string }>;
}) {
  const ctx = await resolveServerPageContext({
    permissao: "relatorios:visualizar",
    searchParams,
    carregarPeriodoAnterior: true,
  });

  return (
    <NavApp empresaSelecionada={ctx.empresaSelecionada}>
      <RelatoriosView
        key={`${ctx.empresaSelecionada ?? "sem-empresa"}-${ctx.abaParam ?? "default"}`}
        empresas={ctx.empresas.map((e) => ({
          id: e.id,
          cnpj: e.cnpj,
          razaoSocial: e.razaoSocial,
        }))}
        empresaInicial={ctx.empresaSelecionada}
        abaInicial={ctx.abaParam}
        initialPeriod={ctx.periodo}
        initialVendas={ctx.vendas}
        initialPeriodoAnterior={ctx.periodoAnterior}
        initialVendasAnteriores={ctx.vendasAnteriores}
        initialError={ctx.erroInicial}
      />
    </NavApp>
  );
}
