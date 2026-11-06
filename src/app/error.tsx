"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-4">
      <section className="flex max-w-lg flex-col items-center gap-4 rounded-xl bg-destructive/5 p-8 text-center" role="alert">
        <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold">Não foi possível abrir esta tela</h1>
          <p className="text-sm text-muted-foreground">
            Tente novamente. Se o problema continuar, informe o código {error.digest ?? "do horário da ocorrência"} ao suporte.
          </p>
        </div>
        <Button type="button" onClick={retry}>
          <RefreshCw data-icon="inline-start" />
          Tentar novamente
        </Button>
      </section>
    </main>
  );
}
