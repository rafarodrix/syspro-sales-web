import { FileText, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";

export type TipoVisaoRelatorio = "sintetico" | "analitico";

export function ReportViewToggle({ visao, onChange, descricao, rotuloAnalitico = "Notas detalhadas" }: {
  visao: TipoVisaoRelatorio;
  onChange: (visao: TipoVisaoRelatorio) => void;
  descricao: string;
  rotuloAnalitico?: string;
}) {
  return <div className="rounded-lg border bg-muted/20 p-2 sm:flex sm:items-center sm:justify-between"><div className="mb-2 sm:mb-0"><p className="text-xs font-bold text-foreground">Escolha como analisar</p><p className="text-[11px] text-muted-foreground">{descricao}</p></div><div className="flex w-full items-center gap-1 rounded-md border bg-background p-0.5 sm:w-auto" role="tablist" aria-label="Visão do relatório"><Button type="button" role="tab" aria-selected={visao === "sintetico"} variant={visao === "sintetico" ? "secondary" : "ghost"} className="h-8 flex-1 gap-1.5 text-xs sm:flex-none" onClick={() => onChange("sintetico")}><LayoutList className="size-3.5" /> Síntese</Button><Button type="button" role="tab" aria-selected={visao === "analitico"} variant={visao === "analitico" ? "secondary" : "ghost"} className="h-8 flex-1 gap-1.5 text-xs sm:flex-none" onClick={() => onChange("analitico")}><FileText className="size-3.5" /> {rotuloAnalitico}</Button></div></div>;
}
