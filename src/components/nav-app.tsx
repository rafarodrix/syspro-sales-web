import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOutButton } from "@/components/logout-button";

export async function NavApp() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "admin";

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 p-4">
        <Link href="/" className="font-semibold">
          Syspro Sales Web
        </Link>
        <nav className="flex items-center gap-1 text-sm">
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{session.user.name}</span>
          <LogOutButton />
        </div>
      </div>
    </header>
  );
}
