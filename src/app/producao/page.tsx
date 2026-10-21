import { NavApp } from "@/components/nav-app";
import { ProducaoView } from "@/components/producao-view";
import { requireAuth } from "@/lib/server-auth";

export default async function ProducaoPage({
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
      <ProducaoView key={empresaSelecionada} empresaId={empresaSelecionada} />
    </NavApp>
  );
}
