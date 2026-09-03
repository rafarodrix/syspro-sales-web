import { NavApp } from "@/components/nav-app";
import { DashboardView } from "@/components/dashboard-view";
import { prisma } from "@/lib/database";
import { requireAuth } from "@/lib/server-auth";
import { consultarVendas, type VendaProduto } from "@/lib/syspro-api";
import { dataInputParaSyspro, calcularPeriodoAnterior, dataParaInput } from "@/lib/vendas";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { empresas } = await requireAuth();
  const { empresa: empresaId } = await searchParams;
  const empresa = empresas.find((item) => item.id === empresaId) ?? empresas[0];

  const hoje = new Date();
  const periodo = {
    inicial: dataParaInput(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    final: dataParaInput(hoje),
  };
  const periodoAnterior = calcularPeriodoAnterior(periodo.inicial, periodo.final);

  let vendas: VendaProduto[] = [];
  let vendasAnteriores: VendaProduto[] = [];
  let erroInicial: string | undefined;

  if (empresa) {
    const configuracao = await prisma.configuracao.findFirst();
    if (configuracao?.sysproBaseUrl) {
      try {
        const configApi = {
          baseUrl: configuracao.sysproBaseUrl,
          useIis: configuracao.sysproUseIis === "true",
        };

        const [resultadoAtual, resultadoAnterior] = await Promise.all([
          consultarVendas(configApi, {
            dtInicial: dataInputParaSyspro(periodo.inicial),
            dtFinal: dataInputParaSyspro(periodo.final),
          }),
          consultarVendas(configApi, {
            dtInicial: dataInputParaSyspro(periodoAnterior.inicial),
            dtFinal: dataInputParaSyspro(periodoAnterior.final),
          }).catch(() => []),
        ]);

        vendas = resultadoAtual.filter(
          (venda) => venda.empresa_codigo === empresa.empresaCodigo,
        );
        vendasAnteriores = resultadoAnterior.filter(
          (venda) => venda.empresa_codigo === empresa.empresaCodigo,
        );
      } catch {
        erroInicial = "Não foi possível carregar os dados do dashboard.";
      }
    }
  }

  return (
    <NavApp empresaSelecionada={empresa?.id}>
      <DashboardView
        key={empresa?.id ?? "sem-empresa"}
        empresas={empresas.map((item) => ({
          id: item.id,
          cnpj: item.cnpj,
          razaoSocial: item.razaoSocial,
        }))}
        empresaInicial={empresa?.id}
        initialPeriod={periodo}
        initialVendas={vendas}
        initialVendasAnteriores={vendasAnteriores}
        initialError={erroInicial}
      />
    </NavApp>
  );
}
