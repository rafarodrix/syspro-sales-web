import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalysisQueryCardProps {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
}

/** Cabeçalho padrão das consultas operacionais, com contexto, período e ações. */
export function AnalysisQueryCard({
  icon: Icon,
  title,
  description,
  children,
  actions,
  footer,
}: AnalysisQueryCardProps) {
  return (
    <Card className="no-print border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <Icon className="size-5 text-primary" aria-hidden="true" />
              {title}
            </CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 border-t border-border/60 pt-4">
        {children}
        {footer ? <div className="text-xs text-muted-foreground">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}
