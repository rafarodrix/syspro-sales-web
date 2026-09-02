import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LogOutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { EmpresaNavSelect } from "@/components/empresa-nav-select";
import { ChevronDownIcon, HelpCircleIcon, UserIcon, LayersIcon } from "lucide-react";
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 font-extrabold text-white shadow-sm shadow-blue-500/20">
              <svg viewBox="0 0 24 24" className="size-5 fill-current" stroke="currentColor" strokeWidth="1.5">
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

          <nav className="hidden items-center gap-1 sm:flex text-sm font-medium">
            <Link
              href="/dashboard"
              className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-blue-600 dark:text-blue-400 font-semibold"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Dashboard
              <span className="absolute bottom-[-10px] left-0 right-0 h-0.5 rounded-full bg-blue-600 dark:bg-blue-500" />
            </Link>

            <Link
              href="/vendas"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
              Vendas
              <ChevronDownIcon className="size-3.5 opacity-60" />
            </Link>

            <Link
              href="https://ajuda.trilinksoftware.com.br/"
              target="_blank"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <HelpCircleIcon className="size-4" />
              Ajuda
              <ChevronDownIcon className="size-3.5 opacity-60" />
            </Link>

            {isAdmin && (
              <>
                <Link
                  href="/usuarios"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  Usuários
                </Link>
                <Link
                  href="/configuracoes"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  Configurações
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <EmpresaNavSelect
            empresas={empresas}
            empresaSelecionada={empresaSelecionada}
          />

          <div className="h-4 w-px bg-border/60 hidden md:block" />

          <div className="flex items-center gap-2 text-sm">
            <ThemeToggle variant="switch" />

            <div className="hidden items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-xs font-semibold text-foreground md:flex">
              <UserIcon className="size-3.5 text-muted-foreground" />
              <span>{session.user.name}</span>
            </div>

            <LogOutButton />

            <button
              aria-label="Abrir painel lateral"
              className="hidden rounded-lg border p-1.5 text-muted-foreground transition-colors hover:bg-muted md:block"
              type="button"
            >
              <LayersIcon className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
