import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { temAcessoTodasEmpresas, temPermissao, type Permissao } from "@/lib/role-permissions";
import type { UserRole } from "@/lib/validations";

export async function requireAuth(permissao?: Permissao) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const userRole = (session.user.role ?? "vendas") as UserRole;

  if (permissao && !temPermissao(userRole, permissao)) {
    redirect("/dashboard");
  }

  const isAdmin = temAcessoTodasEmpresas(userRole);
  const empresas = await prisma.empresa.findMany({
    where: isAdmin
      ? { ativa: true }
      : {
          ativa: true,
          usuarios: { some: { userId: session.user.id } },
        },
    orderBy: { razaoSocial: "asc" },
  });

  return { session, userRole, isAdmin, empresas };
}
