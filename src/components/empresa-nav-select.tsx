"use client";

import { useState } from "react";
import { Building2Icon, Check, ChevronDown, Layers, CheckSquare, Square } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EmpresaOption {
  id: string;
  razaoSocial: string;
  cnpj: string;
}

export function EmpresaNavSelect({
  empresas,
  empresaSelecionada,
}: {
  empresas: EmpresaOption[];
  empresaSelecionada?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [aberto, setAberto] = useState(false);

  if (empresas.length <= 1) return null;

  // Padrão seguro: Empresa 1 (a primeira vinculada), a menos que explicitamente solicitado "todas"
  const isConsolidado = empresaSelecionada === "todas";
  const empresaAtiva = empresas.find((e) => e.id === empresaSelecionada) ?? empresas[0];

  function navegarPara(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("empresa", id);
    router.push(`${pathname}?${params.toString()}`);
    setAberto(false);
  }

  return (
    <DropdownMenu open={aberto} onOpenChange={setAberto}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 max-w-80 gap-2 rounded-lg border-border/70 bg-background/95 px-2.5 text-xs font-semibold text-foreground shadow-xs hover:bg-muted/40"
        >
          {isConsolidado ? (
            <div className="flex items-center gap-1.5 text-primary">
              <Layers className="size-3.5 shrink-0" />
              <span className="font-bold">Visão Consolidada ({empresas.length})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 truncate">
              <Building2Icon className="size-3.5 shrink-0 text-primary" />
              <span className="truncate">{empresaAtiva?.razaoSocial ?? "Empresa 1"}</span>
            </div>
          )}
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-2 space-y-2">
        {/* Header do Menu */}
        <div className="px-2 py-1 flex items-center justify-between border-b pb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Filiais & Consolidação
          </span>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {empresas.length} empresas
          </Badge>
        </div>

        {/* Card de Ação: Checkbox / Botão de Consolidação */}
        <div
          onClick={() => navegarPara(isConsolidado ? empresas[0].id : "todas")}
          className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
            isConsolidado
              ? "bg-primary/10 border-primary/40 text-primary font-bold shadow-2xs"
              : "bg-muted/20 border-border/70 hover:bg-muted/40 text-foreground"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isConsolidado ? (
              <CheckSquare className="size-4 text-primary shrink-0" />
            ) : (
              <Square className="size-4 text-muted-foreground shrink-0" />
            )}
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold leading-tight">
                Consolidar Todas as Empresas
              </span>
              <span className="text-[10.5px] text-muted-foreground font-normal">
                Consultar e somar as {empresas.length} unidades do grupo
              </span>
            </div>
          </div>
          {isConsolidado && (
            <Badge className="text-[9.5px] px-1.5 py-0 bg-primary text-primary-foreground font-bold">
              Ativo
            </Badge>
          )}
        </div>

        {/* Divisor */}
        <div className="px-2 pt-1">
          <span className="text-[10px] font-semibold text-muted-foreground">
            Ou selecione uma empresa individual:
          </span>
        </div>

        {/* Lista de Empresas Individuais */}
        <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
          {empresas.map((emp, index) => {
            const selecionada = !isConsolidado && emp.id === empresaAtiva?.id;
            return (
              <button
                key={emp.id}
                onClick={() => navegarPara(emp.id)}
                className={`w-full flex items-center justify-between p-2 rounded-md text-left text-xs transition-colors ${
                  selecionada
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "hover:bg-muted/60 text-foreground"
                }`}
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="truncate font-semibold">
                    {index === 0 && !isConsolidado ? `⭐ ${emp.razaoSocial}` : emp.razaoSocial}
                  </span>
                  <span
                    className={`text-[10px] font-mono ${
                      selecionada ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    CNPJ: {emp.cnpj}
                  </span>
                </div>
                {selecionada && <Check className="size-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
