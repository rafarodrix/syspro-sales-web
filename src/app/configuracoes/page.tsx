import { NavApp } from "@/components/nav-app";
import { ConfiguracaoClient } from "@/components/configuracao-client";
import { prisma } from "@/lib/database";
import { requireAuth } from "@/lib/server-auth";

export default async function ConfiguracoesPage() {
  await requireAuth("configuracoes:gerenciar");

  const empresas = await prisma.empresa.findMany({
    orderBy: { razaoSocial: "asc" },
  });

  return (
    <NavApp>
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Configurações do Sistema
        </h1>
        <ConfiguracaoClient
          empresas={empresas.map((e) => ({
            id: e.id,
            cnpj: e.cnpj,
            razaoSocial: e.razaoSocial,
            empresaCodigo: e.empresaCodigo,
            ativa: e.ativa,
            sysproBaseUrl: e.sysproBaseUrl || "http://localhost:8080",
            sysproUseIis: e.sysproUseIis,
          }))}
        />
      </div>
    </NavApp>
  );
}
