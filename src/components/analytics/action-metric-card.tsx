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
    <div
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
      className={`flex min-w-0 flex-col justify-between border-t border-linha pt-3 ${
        clicavel
          ? "cursor-pointer rounded-sm transition-colors hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          : ""
      }`}
    >
      <div className="min-w-0">
        <span className="truncate text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {titulo}
        </span>
        <div className="num mt-1.5 text-[22px] font-semibold leading-none tracking-tight text-foreground">
          {valor}
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{descricao}</p>
    </div>
  );
}
