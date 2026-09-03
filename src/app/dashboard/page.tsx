import { NavApp } from "@/components/nav-app";
import { DashboardView } from "@/components/dashboard-view";
import { requireAuth } from "@/lib/server-auth";
import { calcularPeriodoAnterior, dataParaInput } from "@/lib/vendas";
import { obterVendas } from "@/lib/sales-service";
import type { VendaComEmpresa } from "@/lib/syspro-api";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { empresas } = await requireAuth();
  const { empresa: empresaParam } = await searchParams;

  const idsParam = (empresaParam ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const saoIdsValidos = idsParam.length > 0 && idsParam.every((id) => empresas.some((e) => e.id === id));

  const empresaSelecionada =
    empresaParam === "todas"
      ? "todas"
      : saoIdsValidos
        ? empresaParam!
        : (empresas[0]?.id ?? "");

  const hoje = new Date();
  const periodo = {
    inicial: dataParaInput(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    final: dataParaInput(hoje),
  };
  const periodoAnterior = calcularPeriodoAnterior(periodo.inicial, periodo.final);

  let vendas: VendaComEmpresa[] = [];
  let vendasAnteriores: VendaComEmpresa[] = [];
  let erroInicial: string | undefined;

  try {
    const [atual, anterior] = await Promise.all([
      obterVendas({
        empresasLiberadas: empresas,
        empresaSelecionadaId: empresaSelecionada,
        dtInicial: periodo.inicial,
        dtFinal: periodo.final,
      }),
      obterVendas({
        empresasLiberadas: empresas,
        empresaSelecionadaId: empresaSelecionada,
        dtInicial: periodoAnterior.inicial,
        dtFinal: periodoAnterior.final,
      }).catch(() => []),
    ]);

    vendas = atual;
    vendasAnteriores = anterior;
  } catch {
    erroInicial = "Não foi possível carregar os dados do dashboard.";
  }

  return (
    <NavApp empresaSelecionada={empresaSelecionada}>
      <DashboardView
        key={empresaSelecionada ?? "sem-empresa"}
        empresas={empresas.map((item) => ({
          id: item.id,
          cnpj: item.cnpj,
          razaoSocial: item.razaoSocial,
        }))}
        empresaInicial={empresaSelecionada}
        initialPeriod={periodo}
        initialVendas={vendas}
        initialVendasAnteriores={vendasAnteriores}
        initialError={erroInicial}
      />
    </NavApp>
  );
}
