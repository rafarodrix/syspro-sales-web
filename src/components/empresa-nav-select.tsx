"use client";

import { useState, useMemo, useEffect } from "react";
import { Building2Icon, Check, ChevronDown, Layers, CheckSquare, Square, Filter, X } from "lucide-react";
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
  empresaSelecionada = "",
}: {
  empresas: EmpresaOption[];
  empresaSelecionada?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [aberto, setAberto] = useState(false);

  // Determinar IDs ativos a partir do parâmetro
  const isTodas = empresaSelecionada === "todas";
  const isMultiplo = empresaSelecionada.includes(",");
  const idsAtivos = useMemo(() => {
    if (isTodas) return empresas.map((e) => e.id);
    if (isMultiplo) return empresaSelecionada.split(",").map((s) => s.trim()).filter(Boolean);
    if (empresaSelecionada) return [empresaSelecionada];
    return [empresas[0]?.id ?? ""];
  }, [empresaSelecionada, isTodas, isMultiplo, empresas]);

  // Estado local para seleção múltipla no dropdown
  const [selecionadosLocal, setSelecionadosLocal] = useState<Set<string>>(new Set(idsAtivos));

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSelecionadosLocal(new Set(idsAtivos)));
    return () => cancelAnimationFrame(frame);
  }, [idsAtivos, aberto]);

  if (empresas.length <= 1) return null;

  const empresaUnica = !isTodas && !isMultiplo ? empresas.find((e) => e.id === empresaSelecionada) ?? empresas[0] : null;

  function navegarPara(idOuIds: string) {
    if (typeof document !== "undefined") {
      document.cookie = `syspro_empresa_ativa=${encodeURIComponent(idOuIds)}; path=/; max-age=2592000; SameSite=Lax`;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("empresa", idOuIds);
    router.push(`${pathname}?${params.toString()}`);
    setAberto(false);
  }

  function toggleEmpresa(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const novos = new Set(selecionadosLocal);
    if (novos.has(id)) {
      if (novos.size > 1) novos.delete(id); // impede desmarcar tudo
    } else {
      novos.add(id);
    }
    setSelecionadosLocal(novos);
  }

  function aplicarConsolidacaoCustom() {
    if (selecionadosLocal.size === empresas.length) {
      navegarPara("todas");
    } else if (selecionadosLocal.size === 1) {
      navegarPara(Array.from(selecionadosLocal)[0]);
    } else {
      navegarPara(Array.from(selecionadosLocal).join(","));
    }
  }

  function selecionarTodas() {
    navegarPara("todas");
  }

  return (
    <DropdownMenu open={aberto} onOpenChange={setAberto}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 max-w-[190px] sm:max-w-[240px] md:max-w-[280px] min-w-0 justify-between gap-1.5 rounded-lg border-border/70 bg-background/95 px-2.5 text-xs font-semibold text-foreground shadow-xs hover:bg-muted/40 transition-colors"
          title={
            isTodas
              ? `Visão Consolidada (Todas as ${empresas.length} empresas)`
              : isMultiplo
                ? `Visão Consolidada (${idsAtivos.length} empresas)`
                : empresaUnica?.razaoSocial
          }
        >
          {isTodas ? (
            <div className="flex items-center gap-1.5 min-w-0 truncate text-primary">
              <Layers className="size-3.5 shrink-0" />
              <span className="truncate font-bold text-[11.5px]">
                Consolidado ({empresas.length})
              </span>
            </div>
          ) : isMultiplo ? (
            <div className="flex items-center gap-1.5 min-w-0 truncate text-primary">
              <Layers className="size-3.5 shrink-0" />
              <span className="truncate font-bold text-[11.5px]">
                Consolidado ({idsAtivos.length}/{empresas.length})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <Building2Icon className="size-3.5 shrink-0 text-primary" />
              <span className="truncate text-[11.5px]">{empresaUnica?.razaoSocial ?? "Empresa"}</span>
            </div>
          )}
          <ChevronDown className="size-3 shrink-0 text-muted-foreground ml-0.5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-84 sm:w-96 p-2 space-y-2.5 shadow-xl border-border/80">
        {/* Header do Menu */}
        <div className="px-2 py-1 flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-1.5">
            <Filter className="size-3.5 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Seleção de Filiais
            </span>
          </div>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {empresas.length} cadastradas
          </Badge>
        </div>

        {/* Opção 1: Atalho Consolidar Todas */}
        <div
          onClick={selecionarTodas}
          className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
            isTodas
              ? "bg-primary/10 border-primary/50 text-primary font-bold shadow-2xs"
              : "bg-muted/20 border-border/70 hover:bg-muted/40 text-foreground"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Layers className="size-4 text-primary shrink-0" />
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold leading-tight">
                Consolidar Todas as Filiais
              </span>
              <span className="text-[10.5px] text-muted-foreground font-normal">
                Consultar e somar as {empresas.length} empresas ativas do grupo
              </span>
            </div>
          </div>
          {isTodas && (
            <Badge className="text-[9.5px] px-1.5 py-0 bg-primary text-primary-foreground font-bold">
              Ativo
            </Badge>
          )}
        </div>

        {/* Subtítulo com instrução */}
        <div className="px-2 pt-0.5 flex items-center justify-between text-[10.5px] text-muted-foreground">
          <span className="font-semibold">Selecione para consolidar ou clique para isolar:</span>
          <span className="font-mono text-[9.5px]">({selecionadosLocal.size} marcadas)</span>
        </div>

        {/* Lista de Empresas Individuais com Checkbox + Ação de Isolar */}
        <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
          {empresas.map((emp) => {
            const isMarcada = selecionadosLocal.has(emp.id);
            const isAtivaUnica = !isTodas && !isMultiplo && emp.id === empresaUnica?.id;

            return (
              <div
                key={emp.id}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors border ${
                  isAtivaUnica
                    ? "bg-primary/15 border-primary/40 text-foreground font-semibold"
                    : isMarcada
                      ? "bg-muted/40 border-border/80 text-foreground"
                      : "border-transparent hover:bg-muted/30 text-muted-foreground"
                }`}
              >
                {/* Checkbox para Consolidação Múltipla */}
                <div
                  onClick={(e) => toggleEmpresa(emp.id, e)}
                  className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer pr-2 select-none"
                >
                  {isMarcada ? (
                    <CheckSquare className="size-4 text-primary shrink-0" />
                  ) : (
                    <Square className="size-4 text-muted-foreground/60 shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-xs font-semibold leading-tight text-foreground">
                      {emp.razaoSocial}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      CNPJ: {emp.cnpj}
                    </span>
                  </div>
                </div>

                {/* Botão para Isolar Somente Esta Filial */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navegarPara(emp.id)}
                  className="h-6 px-2 text-[10.5px] font-semibold text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0"
                  title="Consultar apenas esta empresa"
                >
                  {isAtivaUnica ? "Ativa" : "Apenas esta"}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Barra de Ação da Consolidação Personalizada */}
        <div className="border-t pt-2 flex items-center gap-2">
          <Button
            size="sm"
            onClick={aplicarConsolidacaoCustom}
            className="w-full h-8 text-xs font-bold gap-1.5 shadow-sm"
          >
            <Layers className="size-3.5" />
            <span>
              Aplicar Consolidação ({selecionadosLocal.size} filia{selecionadosLocal.size === 1 ? "l" : "is"})
            </span>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
