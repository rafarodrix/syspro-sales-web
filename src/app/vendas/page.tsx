import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { NavApp } from "@/components/nav-app";
import { VendasView } from "@/components/vendas-view";

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

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

  const { empresa } = await searchParams;
  return (
    <div>
      <NavApp empresaSelecionada={empresa} />
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <VendasView
          key={empresa ?? "sem-empresa"}
          empresas={empresas.map((e) => ({
            id: e.id,
            cnpj: e.cnpj,
            razaoSocial: e.razaoSocial,
            empresaCodigo: e.empresaCodigo,
          }))}
          empresaInicial={empresa}
        />
      </main>
    </div>
  );
}
