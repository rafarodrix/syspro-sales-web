import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { NavApp } from "@/components/nav-app";
import { RelatoriosView } from "@/components/relatorios-view";
import { consultarVendas, type VendaProduto } from "@/lib/syspro-api";
import { dataInputParaSyspro, dataParaInput } from "@/lib/vendas";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role === "vendas" || session.user.role === "user") {
    redirect("/dashboard");
  }

  const { empresa: empresaId } = await searchParams;
  const isAdmin = session.user.role === "admin";

  const empresas = await prisma.empresa.findMany({
    where: isAdmin
      ? { ativa: true }
      : {
          ativa: true,
          usuarios: { some: { userId: session.user.id } },
        },
    orderBy: { razaoSocial: "asc" },
  });

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
          key={empresa?.id ?? "sem-empresa"}
          empresas={empresas.map((e) => ({
            id: e.id,
            cnpj: e.cnpj,
            razaoSocial: e.razaoSocial,
          }))}
          empresaInicial={empresa?.id}
          initialPeriod={periodo}
          initialVendas={vendas}
          initialError={erroInicial}
        />
      </main>
    </div>
  );
}
