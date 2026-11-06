import { NavApp } from "@/components/nav-app";
import { PedidosView } from "@/components/pedidos-view";
import { requireAuth } from "@/lib/server-auth";

export default async function RelatorioPedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { empresas } = await requireAuth("vendas:visualizar");
  const { empresa } = await searchParams;
  const empresaSelecionada =
    empresa && empresas.some((item) => item.id === empresa)
      ? empresa
      : (empresas[0]?.id ?? "");
  const empresaAtual = empresas.find((item) => item.id === empresaSelecionada);

  return (
    <NavApp empresaSelecionada={empresaSelecionada}>
      <PedidosView
        key={empresaSelecionada}
        empresaId={empresaSelecionada}
        empresaNome={empresaAtual?.razaoSocial ?? "Empresa"}
      />
    </NavApp>
  );
}
