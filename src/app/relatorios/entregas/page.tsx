import { NavApp } from "@/components/nav-app";
import { EntregasView } from "@/components/entregas-view";
import { requireAuth } from "@/lib/server-auth";

export default async function RelatorioEntregasPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { empresas } = await requireAuth("entregas:visualizar");
  const { empresa } = await searchParams;
  const empresaSelecionada =
    empresa && empresas.some((item) => item.id === empresa)
      ? empresa
      : (empresas[0]?.id ?? "");
  const empresaAtual = empresas.find((item) => item.id === empresaSelecionada);

  return (
    <NavApp empresaSelecionada={empresaSelecionada}>
      <EntregasView
        key={empresaSelecionada}
        empresaId={empresaSelecionada}
        empresaNome={empresaAtual?.razaoSocial ?? "Empresa"}
      />
    </NavApp>
  );
}
