import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { EmpresaNavSelect } from "@/components/empresa-nav-select";
import { HelpCircleIcon } from "lucide-react";
import { prisma } from "@/lib/database";

export async function NavApp({
  empresaSelecionada,
}: {
  empresaSelecionada?: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "admin";
  const empresas = await prisma.empresa.findMany({
    where: isAdmin
      ? { ativa: true }
      : { ativa: true, usuarios: { some: { userId: session.user.id } } },
    orderBy: { razaoSocial: "asc" },
    select: { id: true, razaoSocial: true, cnpj: true },
  });

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 p-4">
        <Link
          href="/dashboard"
          className="flex min-w-fit flex-col leading-tight"
        >
          <span className="text-base font-bold tracking-tight text-primary">
            TRILINK
          </span>
          <span className="text-xs text-muted-foreground">Syspro ERP</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/vendas">Vendas</Link>
          </Button>
          {isAdmin && (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/usuarios">Usuários</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/configuracoes">Configurações</Link>
              </Button>
            </>
          )}
        </nav>
        <EmpresaNavSelect
          empresas={empresas}
          empresaSelecionada={empresaSelecionada}
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button asChild size="icon-sm" variant="ghost">
            <Link
              aria-label="Central de ajuda Trilink"
              href="https://ajuda.trilinksoftware.com.br/"
              target="_blank"
            >
              <HelpCircleIcon />
            </Link>
          </Button>
          <span>{session.user.name}</span>
          <ThemeToggle />
          <LogOutButton />
        </div>
      </div>
    </header>
  );
}
