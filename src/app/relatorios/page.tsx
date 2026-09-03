import { NavApp } from "@/components/nav-app";
import { RelatoriosView } from "@/components/relatorios-view";
import { requireAuth } from "@/lib/server-auth";
import { consultarVendas, type VendaProduto } from "@/lib/syspro-api";
import { dataInputParaSyspro, dataParaInput } from "@/lib/vendas";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string; aba?: string }>;
}) {
  const { empresas } = await requireAuth("gerente");
  const { empresa: empresaParam, aba: abaParam } = await searchParams;

  // Padrão seguro: Empresa 1 (a primeira vinculada), consolidando apenas se solicitado explicitamente
  const empresaSelecionada =
    empresaParam === "todas"
      ? "todas"
      : empresaParam && empresas.some((e) => e.id === empresaParam)
        ? empresaParam
        : (empresas[0]?.id ?? "");

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
      erroInicial = "Não foi possível carregar os dados consolidados dos relatórios.";
    }
  } else {
    const empresa = empresas.find((item) => item.id === empresaSelecionada) ?? empresas[0];
    if (empresa && empresa.sysproBaseUrl) {
      try {
        const dados = await consultarVendas(
          {
            baseUrl: empresa.sysproBaseUrl,
            useIis: empresa.sysproUseIis === "true",
          },
          {
            dtInicial: dataInputParaSyspro(periodo.inicial),
            dtFinal: dataInputParaSyspro(periodo.final),
          },
        );

        vendas = dados
          .filter((v) => v.empresa_codigo === empresa.empresaCodigo)
          .map((v) => ({
            ...v,
            empresa_id: empresa.id,
            empresa_nome: empresa.razaoSocial,
            empresa_cnpj: empresa.cnpj,
          }));
      } catch {
        erroInicial = "Não foi possível carregar os dados dos relatórios.";
      }
    }
  }

  return (
    <NavApp empresaSelecionada={empresaSelecionada}>
      <RelatoriosView
        key={`${empresaSelecionada ?? "sem-empresa"}-${abaParam ?? "default"}`}
        empresas={empresas.map((e) => ({
          id: e.id,
          cnpj: e.cnpj,
          razaoSocial: e.razaoSocial,
        }))}
        empresaInicial={empresaSelecionada}
        abaInicial={abaParam}
        initialPeriod={periodo}
        initialVendas={vendas}
        initialError={erroInicial}
      />
    </NavApp>
  );
}
