import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { NavApp } from "@/components/nav-app";
import { ConfiguracaoClient } from "@/components/configuracao-client";

export default async function ConfiguracoesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const [configuracao, empresas] = await Promise.all([
    prisma.configuracao.findFirst(),
    prisma.empresa.findMany({
      include: { usuarios: { include: { user: true } } },
      orderBy: { razaoSocial: "asc" },
    }),
  ]);

  return (
    <div>
      <NavApp />
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <ConfiguracaoClient
          configuracao={{
            sysproBaseUrl: configuracao?.sysproBaseUrl ?? "",
            sysproUseIis: configuracao?.sysproUseIis ?? "false",
          }}
          empresas={empresas.map((e) => ({
            id: e.id,
            cnpj: e.cnpj,
            razaoSocial: e.razaoSocial,
            empresaCodigo: e.empresaCodigo,
            ativa: e.ativa,
          }))}
        />
      </main>
    </div>
  );
}
