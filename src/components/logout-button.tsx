"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function LogOutButton({ compacto = false }: { compacto?: boolean }) {
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  if (compacto) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleLogout}
        aria-label="Sair da conta"
        title="Sair da conta"
      >
        <LogOut className="size-4" />
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout}>
      Sair
    </Button>
  );
}
