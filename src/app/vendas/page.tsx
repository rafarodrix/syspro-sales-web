import { NavApp } from "@/components/nav-app";
import { VendasView } from "@/components/vendas-view";
import { requireAuth } from "@/lib/server-auth";

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { empresas } = await requireAuth();
  const { empresa } = await searchParams;

  return (
    <NavApp empresaSelecionada={empresa}>
      <VendasView
        key={empresa ?? "sem-empresa"}
        empresas={empresas.map((e) => ({
          id: e.id,
          cnpj: e.cnpj,
          razaoSocial: e.razaoSocial,
          empresaCodigo: e.empresaCodigo,
        }))}
        empresaInicial={empresa}
      />
    </NavApp>
  );
}
