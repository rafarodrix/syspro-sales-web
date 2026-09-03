import { NavApp } from "@/components/nav-app";
import { DashboardView } from "@/components/dashboard-view";
import { requireAuth } from "@/lib/server-auth";
import { consultarVendas, type VendaProduto } from "@/lib/syspro-api";
import { dataInputParaSyspro, calcularPeriodoAnterior, dataParaInput } from "@/lib/vendas";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { empresas } = await requireAuth();
  const { empresa: empresaParam } = await searchParams;

  // Se houver mais de 1 empresa e nenhuma selecionada, usa "todas" (Consolidado) por padrão
  const empresaSelecionada =
    empresaParam === "todas" || (!empresaParam && empresas.length > 1)
      ? "todas"
      : empresaParam && empresas.some((e) => e.id === empresaParam)
        ? empresaParam
        : empresas[0]?.id;

  const hoje = new Date();
  const periodo = {
    inicial: dataParaInput(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    final: dataParaInput(hoje),
  };
  const periodoAnterior = calcularPeriodoAnterior(periodo.inicial, periodo.final);

  let vendas: (VendaProduto & { empresa_id?: string; empresa_nome?: string; empresa_cnpj?: string })[] = [];
  let vendasAnteriores: (VendaProduto & { empresa_id?: string; empresa_nome?: string; empresa_cnpj?: string })[] = [];
  let erroInicial: string | undefined;

  if (empresaSelecionada === "todas") {
    try {
      const promessas = empresas.map(async (emp) => {
        if (!emp.sysproBaseUrl) return { atual: [], anterior: [] };
        const configApi = {
          baseUrl: emp.sysproBaseUrl,
          useIis: emp.sysproUseIis === "true",
        };

        const [resultadoAtual, resultadoAnterior] = await Promise.all([
          consultarVendas(configApi, {
            dtInicial: dataInputParaSyspro(periodo.inicial),
            dtFinal: dataInputParaSyspro(periodo.final),
          }).catch(() => []),
          consultarVendas(configApi, {
            dtInicial: dataInputParaSyspro(periodoAnterior.inicial),
            dtFinal: dataInputParaSyspro(periodoAnterior.final),
          }).catch(() => []),
        ]);

        const tagVenda = (v: VendaProduto) => ({
          ...v,
          empresa_id: emp.id,
          empresa_nome: emp.razaoSocial,
          empresa_cnpj: emp.cnpj,
        });

        return {
          atual: resultadoAtual.filter((v) => v.empresa_codigo === emp.empresaCodigo).map(tagVenda),
          anterior: resultadoAnterior.filter((v) => v.empresa_codigo === emp.empresaCodigo).map(tagVenda),
        };
      });

      const resultados = await Promise.all(promessas);
      vendas = resultados.flatMap((r) => r.atual);
      vendasAnteriores = resultados.flatMap((r) => r.anterior);
    } catch {
      erroInicial = "Não foi possível carregar os dados consolidados do dashboard.";
    }
  } else {
    const empresa = empresas.find((item) => item.id === empresaSelecionada) ?? empresas[0];
    if (empresa && empresa.sysproBaseUrl) {
      try {
        const configApi = {
          baseUrl: empresa.sysproBaseUrl,
          useIis: empresa.sysproUseIis === "true",
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

        const tagVenda = (v: VendaProduto) => ({
          ...v,
          empresa_id: empresa.id,
          empresa_nome: empresa.razaoSocial,
          empresa_cnpj: empresa.cnpj,
        });

        vendas = resultadoAtual.filter((v) => v.empresa_codigo === empresa.empresaCodigo).map(tagVenda);
        vendasAnteriores = resultadoAnterior.filter((v) => v.empresa_codigo === empresa.empresaCodigo).map(tagVenda);
      } catch {
        erroInicial = "Não foi possível carregar os dados do dashboard.";
      }
    }
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
