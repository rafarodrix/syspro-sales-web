import { NavApp } from "@/components/nav-app";
import { UsuariosClient } from "@/components/usuarios-client";
import { prisma } from "@/lib/database";
import { requireAuth } from "@/lib/server-auth";

export default async function UsuariosPage() {
  await requireAuth("admin");

  const [usuarios, empresas] = await Promise.all([
    prisma.user.findMany({
      include: { empresas: { include: { empresa: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.empresa.findMany({ orderBy: { razaoSocial: "asc" } }),
  ]);

  return (
    <NavApp>
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Gestão de Usuários
        </h1>
        <UsuariosClient
          usuarios={usuarios.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            emailVerified: u.emailVerified,
            empresas: u.empresas.map((ue) => ({
              empresaId: ue.empresaId,
              cnpj: ue.empresa.cnpj,
              razaoSocial: ue.empresa.razaoSocial,
            })),
          }))}
          empresas={empresas.map((e) => ({
            id: e.id,
            cnpj: e.cnpj,
            razaoSocial: e.razaoSocial,
          }))}
        />
      </div>
    </NavApp>
  );
}
