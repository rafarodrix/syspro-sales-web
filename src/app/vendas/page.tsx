import { NavApp } from "@/components/nav-app";
import { VendasView } from "@/components/vendas-view";
import { prisma } from "@/lib/database";
import { requireAuth } from "@/lib/server-auth";
import { consultarVendas, type VendaProduto } from "@/lib/syspro-api";
import { dataInputParaSyspro, dataParaInput } from "@/lib/vendas";

export default async function VendasPage({
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

  let vendas: VendaProduto[] = [];
  let erroInicial: string | undefined;

  if (empresa) {
    const configuracao = await prisma.configuracao.findFirst();
    if (configuracao?.sysproBaseUrl) {
      try {
        const configApi = {
          baseUrl: configuracao.sysproBaseUrl,
          useIis: configuracao.sysproUseIis === "true",
        };

        const dados = await consultarVendas(configApi, {
          dtInicial: dataInputParaSyspro(periodo.inicial),
          dtFinal: dataInputParaSyspro(periodo.final),
        });

        vendas = dados.filter(
          (venda) => venda.empresa_codigo === empresa.empresaCodigo,
        );
      } catch {
        erroInicial = "Não foi possível carregar as vendas iniciais.";
      }
    }
  }

  return (
    <NavApp empresaSelecionada={empresa?.id}>
      <VendasView
        key={empresa?.id ?? "sem-empresa"}
        empresas={empresas.map((e) => ({
          id: e.id,
          cnpj: e.cnpj,
          razaoSocial: e.razaoSocial,
          empresaCodigo: e.empresaCodigo,
        }))}
        empresaInicial={empresa?.id}
        initialPeriod={periodo}
        initialVendas={vendas}
        initialError={erroInicial}
      />
    </NavApp>
  );
}
