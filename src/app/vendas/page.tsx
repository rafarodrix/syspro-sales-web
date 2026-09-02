import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { NavApp } from "@/components/nav-app";
import { VendasClient } from "@/components/vendas-client";

export default async function VendasPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "admin";

  const empresas = await prisma.empresa.findMany({
    where: isAdmin
      ? undefined
      : {
          usuarios: { some: { userId: session.user.id } },
        },
    include: { usuarios: true },
    orderBy: { razaoSocial: "asc" },
  });

  return (
    <div>
      <NavApp />
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <h1 className="text-2xl font-semibold">Consulta de Vendas</h1>
        <VendasClient
          empresas={empresas.map((e) => ({
            id: e.id,
            cnpj: e.cnpj,
            razaoSocial: e.razaoSocial,
            empresaCodigo: e.empresaCodigo,
          }))}
        />
      </main>
    </div>
  );
}
