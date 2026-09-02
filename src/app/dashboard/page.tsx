import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NavApp } from "@/components/nav-app";
import { VendasClient } from "@/components/vendas-client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { consultarVendas, type VendaProduto } from "@/lib/syspro-api";
import { dataInputParaSyspro } from "@/lib/vendas";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { empresa: empresaId } = await searchParams;
  const isAdmin = session.user.role === "admin";
  const empresas = await prisma.empresa.findMany({
    where: isAdmin
      ? { ativa: true }
      : { ativa: true, usuarios: { some: { userId: session.user.id } } },
    orderBy: { razaoSocial: "asc" },
  });
  const empresa = empresas.find((item) => item.id === empresaId) ?? empresas[0];
  const hoje = new Date();
  const paraInput = (data: Date) => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  };
  const periodo = {
    inicial: paraInput(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    final: paraInput(hoje),
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
        erroInicial = "Não foi possível carregar os dados do dashboard.";
      }
    }
  }
  return (
    <div>
      <NavApp empresaSelecionada={empresa?.id} />
      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <VendasClient
          empresas={empresas.map((item) => ({
            id: item.id,
            cnpj: item.cnpj,
            razaoSocial: item.razaoSocial,
          }))}
          empresaInicial={empresa?.id}
          initialPeriod={periodo}
          initialVendas={vendas}
          initialError={erroInicial}
          variant="dashboard"
        />
      </main>
    </div>
  );
}
