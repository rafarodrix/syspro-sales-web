import { NavApp } from "@/components/nav-app";
import { RelatoriosView } from "@/components/relatorios-view";
import { prisma } from "@/lib/database";
import { requireAuth } from "@/lib/server-auth";
import { consultarVendas, type VendaProduto } from "@/lib/syspro-api";
import { dataInputParaSyspro, dataParaInput } from "@/lib/vendas";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string; aba?: string }>;
}) {
  const { empresas } = await requireAuth("gerente");
  const { empresa: empresaId, aba: abaParam } = await searchParams;
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
        vendas = await consultarVendas(
          {
            baseUrl: configuracao.sysproBaseUrl,
            useIis: configuracao.sysproUseIis === "true",
          },
          {
            dtInicial: dataInputParaSyspro(periodo.inicial),
            dtFinal: dataInputParaSyspro(periodo.final),
          },
        );
        vendas = vendas.filter(
          (venda) => venda.empresa_codigo === empresa.empresaCodigo,
        );
      } catch {
        erroInicial = "Não foi possível carregar os dados dos relatórios.";
      }
    }
  }

  return (
    <div>
      <NavApp empresaSelecionada={empresa?.id} />
      <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <RelatoriosView
          key={`${empresa?.id ?? "sem-empresa"}-${abaParam ?? "default"}`}
          empresas={empresas.map((e) => ({
            id: e.id,
            cnpj: e.cnpj,
            razaoSocial: e.razaoSocial,
          }))}
          empresaInicial={empresa?.id}
          abaInicial={abaParam}
          initialPeriod={periodo}
          initialVendas={vendas}
          initialError={erroInicial}
        />
      </main>
    </div>
  );
}
