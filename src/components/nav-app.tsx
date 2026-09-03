import { requireAuth } from "@/lib/server-auth";
import { AppShell } from "@/components/app-shell";

export async function NavApp({
  empresaSelecionada,
  children,
}: {
  empresaSelecionada?: string;
  children?: React.ReactNode;
}) {
  const { session, userRole, empresas } = await requireAuth();

  return (
    <AppShell
      userName={session.user.name}
      userRole={userRole}
      empresas={empresas}
      empresaSelecionada={empresaSelecionada}
    >
      {children}
    </AppShell>
  );
}
