import { NavApp } from "@/components/nav-app";
import { ConfiguracaoClient } from "@/components/configuracao-client";
import { prisma } from "@/lib/database";
import { requireAuth } from "@/lib/server-auth";

export default async function ConfiguracoesPage() {
  await requireAuth("admin");

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
      <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Configurações do Sistema
        </h1>
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
