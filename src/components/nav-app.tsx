import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LogOutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { EmpresaNavSelect } from "@/components/empresa-nav-select";
import { NavLinks } from "@/components/nav-links";
import { UserIcon } from "lucide-react";
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
  const exibeSeletorEmpresa = empresas.length > 1;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 font-extrabold text-white shadow-sm shadow-blue-500/20">
              <svg
                viewBox="0 0 24 24"
                className="size-5 fill-current"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-extrabold tracking-tight text-foreground">
                TRILINK
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                Syspro ERP
              </span>
            </div>
          </Link>

          <NavLinks isAdmin={isAdmin} />
        </div>

        <div className="flex items-center gap-3">
          {exibeSeletorEmpresa ? (
            <>
              <EmpresaNavSelect
                empresas={empresas}
                empresaSelecionada={empresaSelecionada}
              />
              <div className="hidden h-4 w-px bg-border/60 md:block" />
            </>
          ) : null}

          <div className="flex items-center gap-2 text-sm">
            <ThemeToggle variant="switch" />

            <div className="hidden items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-xs font-semibold text-foreground md:flex">
              <UserIcon className="size-3.5 text-muted-foreground" />
              <span>{session.user.name}</span>
            </div>

            <LogOutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
