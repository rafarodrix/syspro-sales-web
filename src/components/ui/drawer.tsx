"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Painel lateral de detalhe (drawer).
 *
 * Substitui a expansão da linha em tabelas densas: o contexto continua
 * visível à esquerda e o detalhe abre por cima, sem deslocar as linhas.
 */
function Drawer({
  aberto,
  onOpenChange,
  titulo,
  meta,
  acoes,
  children,
  largura = "420px",
}: {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  titulo: React.ReactNode;
  meta?: React.ReactNode;
  acoes?: React.ReactNode;
  children: React.ReactNode;
  largura?: string;
}) {
  return (
    <DialogPrimitive.Root open={aberto} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-150" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          style={{ width: largura }}
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex max-w-full flex-col border-l border-border bg-card shadow-xl outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right duration-150 ease-out"
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
            <div className="min-w-0">
              <DialogPrimitive.Title className="titulo-secao truncate text-foreground">
                {titulo}
              </DialogPrimitive.Title>
              {meta ? (
                <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{meta}</div>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {acoes}
              <DialogPrimitive.Close
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export { Drawer };
