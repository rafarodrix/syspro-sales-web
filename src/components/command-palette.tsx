"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { comandosNavegacao } from "@/lib/navigation";
import { temPermissao } from "@/lib/role-permissions";

export function CommandPalette({ userRole }: { userRole: string }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const router = useRouter();

  // Escutar atalho Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setAberto((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filtrados = comandosNavegacao.filter((c) =>
    temPermissao(userRole, c.permissao) && (
      c.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      c.categoria.toLowerCase().includes(busca.toLowerCase())
    ),
  );

  function selecionar(href: string) {
    setAberto(false);
    setBusca("");
    router.push(href);
  }

  return (
    <>
      {/* Botão de Busca Rápida na Topbar */}
      <button
        onClick={() => setAberto(true)}
        className="hidden md:flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all"
        title="Busca Rápida (Ctrl + K)"
      >
        <Search className="size-3.5" />
        <span>Buscar página ou relatório...</span>
        <kbd className="pointer-events-none flex h-4 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-semibold text-muted-foreground">
          Ctrl K
        </kbd>
      </button>

      {/* Modal Dialog do Command Palette */}
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden shadow-2xl border-border/80">
          <DialogHeader className="p-3 border-b border-border/60 flex flex-row items-center gap-2 space-y-0">
            <Search className="size-4 text-muted-foreground ml-1" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite o nome de uma tela ou relatório..."
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-none h-9"
              autoFocus
            />
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto p-2 space-y-1">
            {filtrados.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Nenhum atalho encontrado para &quot;{busca}&quot;.
              </div>
            ) : (
              filtrados.map((item) => {
                const Icone = item.icone;
                return (
                  <button
                    key={item.id}
                    onClick={() => selecionar(item.href)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-colors text-left group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icone className={`size-4 ${item.cor || "text-muted-foreground group-hover:text-primary"}`} />
                      <span>{item.titulo}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-normal group-hover:text-primary/80">
                      {item.categoria}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-border/60 bg-muted/20 px-3 py-2 text-[10.5px] text-muted-foreground flex items-center justify-between">
            <span>Navegação instantânea do SysproERP Reports</span>
            <kbd className="font-mono text-[9.5px]">ESC para fechar</kbd>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
