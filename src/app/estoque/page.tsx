import { NavApp } from "@/components/nav-app";
import { EstoqueView } from "@/components/estoque-view";
import { requireAuth } from "@/lib/server-auth";

export default async function EstoquePage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const { empresas } = await requireAuth();
  const { empresa } = await searchParams;
  const empresaSelecionada = empresa && empresas.some((item) => item.id === empresa)
    ? empresa
    : (empresas[0]?.id ?? "");

  return <NavApp empresaSelecionada={empresaSelecionada}>
    <EstoqueView
      key={empresaSelecionada}
      empresas={empresas.map((item) => ({ id: item.id, cnpj: item.cnpj, razaoSocial: item.razaoSocial }))}
      empresaInicial={empresaSelecionada}
    />
  </NavApp>;
}
