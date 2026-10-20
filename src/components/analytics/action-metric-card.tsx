import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ActionMetricCard({
  titulo,
  valor,
  descricao,
  onClick,
  acaoTitulo,
}: {
  titulo: string;
  valor: string;
  descricao: string;
  onClick?: () => void;
  acaoTitulo?: string;
}) {
  const clicavel = Boolean(onClick);

  return (
    <Card
      size="sm"
      onClick={onClick}
      role={clicavel ? "button" : undefined}
      tabIndex={clicavel ? 0 : undefined}
      title={clicavel ? acaoTitulo : undefined}
      onKeyDown={clicavel ? (evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
          evento.preventDefault();
          onClick?.();
        }
      } : undefined}
      className={clicavel
        ? "cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        : undefined}
    >
      <CardHeader>
        <CardDescription>{titulo}</CardDescription>
        <CardTitle className="font-mono text-2xl tabular-nums">{valor}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{descricao}</CardContent>
    </Card>
  );
}
