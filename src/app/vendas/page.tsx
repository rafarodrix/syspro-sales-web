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
    <div>
      <NavApp empresaSelecionada={empresa} />
      <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
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
      </main>
    </div>
  );
}
