import { NavApp } from "@/components/nav-app";
import { VendasView } from "@/components/vendas-view";
import { requireAuth } from "@/lib/server-auth";
import { consultarVendas, type VendaProduto } from "@/lib/syspro-api";
import { dataInputParaSyspro, dataParaInput } from "@/lib/vendas";

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { empresas } = await requireAuth();
  const { empresa: empresaParam } = await searchParams;

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

  let vendas: (VendaProduto & { empresa_id?: string; empresa_nome?: string; empresa_cnpj?: string })[] = [];
  let erroInicial: string | undefined;

  if (empresaSelecionada === "todas") {
    try {
      const promessas = empresas.map(async (emp) => {
        if (!emp.sysproBaseUrl) return [];
        const configApi = {
          baseUrl: emp.sysproBaseUrl,
          useIis: emp.sysproUseIis === "true",
        };

        const dados = await consultarVendas(configApi, {
          dtInicial: dataInputParaSyspro(periodo.inicial),
          dtFinal: dataInputParaSyspro(periodo.final),
        }).catch(() => []);

        return dados
          .filter((v) => v.empresa_codigo === emp.empresaCodigo)
          .map((v) => ({
            ...v,
            empresa_id: emp.id,
            empresa_nome: emp.razaoSocial,
            empresa_cnpj: emp.cnpj,
          }));
      });

      const resultados = await Promise.all(promessas);
      vendas = resultados.flat();
    } catch {
      erroInicial = "Não foi possível carregar as vendas consolidadas.";
    }
  } else {
    const empresa = empresas.find((item) => item.id === empresaSelecionada) ?? empresas[0];
    if (empresa && empresa.sysproBaseUrl) {
      try {
        const configApi = {
          baseUrl: empresa.sysproBaseUrl,
          useIis: empresa.sysproUseIis === "true",
        };

        const dados = await consultarVendas(configApi, {
          dtInicial: dataInputParaSyspro(periodo.inicial),
          dtFinal: dataInputParaSyspro(periodo.final),
        });

        vendas = dados
          .filter((v) => v.empresa_codigo === empresa.empresaCodigo)
          .map((v) => ({
            ...v,
            empresa_id: empresa.id,
            empresa_nome: empresa.razaoSocial,
            empresa_cnpj: empresa.cnpj,
          }));
      } catch {
        erroInicial = "Não foi possível carregar as vendas iniciais.";
      }
    }
  }

  return (
    <NavApp empresaSelecionada={empresaSelecionada}>
      <VendasView
        key={empresaSelecionada ?? "sem-empresa"}
        empresas={empresas.map((e) => ({
          id: e.id,
          cnpj: e.cnpj,
          razaoSocial: e.razaoSocial,
          empresaCodigo: e.empresaCodigo,
        }))}
        empresaInicial={empresaSelecionada}
        initialPeriod={periodo}
        initialVendas={vendas}
        initialError={erroInicial}
      />
    </NavApp>
  );
}
