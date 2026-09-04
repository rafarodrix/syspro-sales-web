import { NavApp } from "@/components/nav-app";
import { VendasView } from "@/components/vendas-view";
import { resolveServerPageContext } from "@/lib/server-page-context";

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const ctx = await resolveServerPageContext({
    permissao: "vendas:visualizar",
    searchParams: searchParams as Promise<{ empresa?: string; aba?: string }>,
  });

  return (
    <NavApp empresaSelecionada={ctx.empresaSelecionada}>
      <VendasView
        key={ctx.empresaSelecionada ?? "sem-empresa"}
        empresas={ctx.empresas.map((e) => ({
          id: e.id,
          cnpj: e.cnpj,
          razaoSocial: e.razaoSocial,
          empresaCodigo: e.empresaCodigo,
        }))}
        empresaInicial={ctx.empresaSelecionada}
        initialPeriod={ctx.periodo}
        initialVendas={ctx.vendas}
        initialError={ctx.erroInicial}
      />
    </NavApp>
  );
}
