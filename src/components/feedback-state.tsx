import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type FeedbackVariant = "error" | "empty";

interface FeedbackStateProps {
  variant: FeedbackVariant;
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/** Estado padronizado para resultados vazios e falhas recuperáveis das consultas. */
export function FeedbackState({ variant, title, description, onRetry, retryLabel = "Tentar novamente" }: FeedbackStateProps) {
  const isError = variant === "error";
  const Icon = isError ? AlertCircle : Inbox;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-lg border px-6 py-10 text-center ${isError ? "border-destructive/40 bg-destructive/5" : "border-dashed bg-muted/20"}`}
      role={isError ? "alert" : "status"}
    >
      <div className={`rounded-full p-2.5 ${isError ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className={`text-sm font-semibold ${isError ? "text-destructive" : "text-foreground"}`}>{title}</p>
        {description ? <p className="max-w-md text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onRetry}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
