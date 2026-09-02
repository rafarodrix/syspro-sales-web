import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { NavApp } from "@/components/nav-app";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [empresas, usuarios, totalUsuarios] = await Promise.all([
    prisma.empresa.count(),
    prisma.userEmpresa.count({
      where: { userId: session.user.id },
    }),
    prisma.user.count(),
  ]);

  return (
    <div>
      <NavApp />
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Empresas cadastradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{empresas}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Empresas liberadas p/ você
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{usuarios}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Usuários do sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalUsuarios}</p>
            </CardContent>
          </Card>
        </div>
        <p className="text-sm text-muted-foreground">
          Acesse <strong>Vendas</strong> para consultar o período desejado por
          CNPJ autorizado.
        </p>
      </main>
    </div>
  );
}
