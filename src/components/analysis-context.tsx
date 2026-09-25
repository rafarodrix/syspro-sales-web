import { Building2, CalendarDays, GitCompareArrows, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatarDataInputParaBR } from "@/lib/vendas";
import type { Periodo } from "@/components/date-range-filter";

export function AnalysisContext({
  empresa,
  periodo,
  periodoConsultado,
  comparativo = false,
  loading = false,
}: {
  empresa: string;
  periodo: Periodo;
  periodoConsultado: Periodo;
  comparativo?: boolean;
  loading?: boolean;
}) {
  const pendente = periodo.inicial !== periodoConsultado.inicial || periodo.final !== periodoConsultado.final;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground" aria-live="polite">
      <Badge variant="secondary" className="gap-1 text-[10px] font-semibold">
        <Building2 className="size-3" aria-hidden="true" />{empresa}
      </Badge>
      <Badge variant="outline" className="gap-1 font-mono text-[10px]">
        <CalendarDays className="size-3" aria-hidden="true" />
        {formatarDataInputParaBR(periodoConsultado.inicial)} → {formatarDataInputParaBR(periodoConsultado.final)}
      </Badge>
      {comparativo && <Badge variant="outline" className="gap-1 text-[10px]"><GitCompareArrows className="size-3" />Comparativo</Badge>}
      {pendente && <span className="font-semibold text-amber-700 dark:text-amber-400">Período não consultado</span>}
      {loading && <span className="inline-flex items-center gap-1 text-primary"><RefreshCw className="size-3 animate-spin" />Atualizando</span>}
    </div>
  );
}
