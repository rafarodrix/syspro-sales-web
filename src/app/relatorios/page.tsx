import { NavApp } from "@/components/nav-app";
import { RelatoriosView } from "@/components/relatorios-view";
import { resolveServerPageContext } from "@/lib/server-page-context";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{
    empresa?: string;
    aba?: string;
    periodoInicial?: string;
    periodoFinal?: string;
    comparacao?: string;
    comparacaoInicial?: string;
    comparacaoFinal?: string;
  }>;
}) {
  const ctx = await resolveServerPageContext({
    permissao: "relatorios:visualizar",
    searchParams,
    carregarPeriodoAnterior: true,
    comparacaoMesAnteriorPadrao: true,
    ignorarPeriodoCookie: true,
  });

  return (
    <NavApp empresaSelecionada={ctx.empresaSelecionada}>
      <RelatoriosView
        key={`${ctx.empresaSelecionada ?? "sem-empresa"}-${ctx.abaParam ?? "default"}`}
        empresas={ctx.empresas.map((e) => ({
          id: e.id,
          cnpj: e.cnpj,
          razaoSocial: e.razaoSocial,
        }))}
        empresaInicial={ctx.empresaSelecionada}
        abaInicial={ctx.abaParam}
        initialPeriod={ctx.periodo}
        initialVendas={ctx.vendas}
        initialPeriodoAnterior={ctx.periodoAnterior}
        initialModoComparacao={ctx.modoComparacao}
        initialComparacaoPersonalizada={ctx.comparacaoPersonalizada}
        initialVendasAnteriores={ctx.vendasAnteriores}
        initialComparacaoDisponivel={ctx.comparacaoDisponivel}
        initialError={ctx.erroInicial}
      />
    </NavApp>
  );
}
