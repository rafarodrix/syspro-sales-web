import { NavApp } from "@/components/nav-app";
import { TitulosView } from "@/components/titulos-view";
import { requireAuth } from "@/lib/server-auth";

export default async function ContasReceberPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { empresas } = await requireAuth("relatorios:visualizar");
  const { empresa } = await searchParams;
  const empresaSelecionada =
    empresa && empresas.some((item) => item.id === empresa) ? empresa : (empresas[0]?.id ?? "");

  return (
    <NavApp empresaSelecionada={empresaSelecionada}>
      <TitulosView key={empresaSelecionada} empresaId={empresaSelecionada} categoria="receber" />
    </NavApp>
  );
}
