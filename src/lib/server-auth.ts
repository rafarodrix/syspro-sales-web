import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";

export async function requireAuth(minRole?: "admin" | "gerente") {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const userRole = session.user.role ?? "vendas";

  if (minRole === "admin" && userRole !== "admin") {
    redirect("/dashboard");
  }

  if (minRole === "gerente" && (userRole === "vendas" || userRole === "user")) {
    redirect("/dashboard");
  }

  const isAdmin = userRole === "admin";
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
