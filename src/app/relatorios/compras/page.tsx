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
  const empresaAtual = empresas.find((item) => item.id === empresaSelecionada);

  return (
    <NavApp empresaSelecionada={empresaSelecionada}>
      <ComprasView
        key={empresaSelecionada}
        empresaId={empresaSelecionada}
        empresaNome={
          empresaAtual?.razaoSocial ?? "Empresa"
        }
        coberturaAlvoInicial={empresaAtual?.coberturaCompraDias ?? 30}
      />
    </NavApp>
  );
}
