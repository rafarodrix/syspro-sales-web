import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { NavApp } from "@/components/nav-app";
import { UsuariosClient } from "@/components/usuarios-client";

export default async function UsuariosPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const [usuarios, empresas] = await Promise.all([
    prisma.user.findMany({
      include: { empresas: { include: { empresa: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.empresa.findMany({ orderBy: { razaoSocial: "asc" } }),
  ]);

  return (
    <div>
      <NavApp />
      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <h1 className="text-2xl font-semibold">Usuários</h1>
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
      </main>
    </div>
  );
}
