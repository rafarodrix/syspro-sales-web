import { ComprasView } from "@/components/compras-view";
import { NavApp } from "@/components/nav-app";
import { requireAuth } from "@/lib/server-auth";

export default async function RelatorioComprasPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { empresas } = await requireAuth("estoque:visualizar");
  const { empresa } = await searchParams;
  const empresaSelecionada =
    empresa && empresas.some((item) => item.id === empresa)
      ? empresa
      : (empresas[0]?.id ?? "");

  return (
    <NavApp empresaSelecionada={empresaSelecionada}>
      <ComprasView
        key={empresaSelecionada}
        empresaId={empresaSelecionada}
        empresaNome={
          empresas.find((item) => item.id === empresaSelecionada)?.razaoSocial ?? "Empresa"
        }
      />
    </NavApp>
  );
}
