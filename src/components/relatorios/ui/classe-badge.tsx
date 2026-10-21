import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ClasseABC = "A" | "B" | "C";

/**
 * Paleta única das classes ABC no app. Curva, clientes e margens usam as
 * mesmas cores para o mesmo conceito — antes cada tela repetia o mapeamento.
 */
const TONS: Record<ClasseABC, string> = {
  A: "border-emerald-600/30 bg-emerald-600 text-white hover:bg-emerald-600",
  B: "border-blue-600/30 bg-blue-600 text-white hover:bg-blue-600",
  C: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export function ClasseBadge({
  classe,
  rotuloPrefixo,
  className,
}: {
  classe: ClasseABC | string;
  /** Ex.: "Classe" para renderizar "Classe A" em cabeçalhos e detalhes. */
  rotuloPrefixo?: string;
  className?: string;
}) {
  const chave = (classe || "").toUpperCase() as ClasseABC;
  const tom = TONS[chave] ?? "border-border bg-muted text-muted-foreground";
  return (
    <Badge
      variant="outline"
      title={
        rotuloPrefixo
          ? `${rotuloPrefixo} ${chave}`
          : `Classe ${chave} da curva ABC (A concentra a maior parte do faturamento)`
      }
      className={cn("font-mono font-bold", tom, className)}
    >
      {rotuloPrefixo ? `${rotuloPrefixo} ${chave}` : chave}
    </Badge>
  );
}
