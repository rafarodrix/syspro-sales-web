export interface MetricsStripItem {
  rotulo: string;
  valor: string;
  detalhe?: string;
}

export function MetricsStrip({ itens }: { itens: MetricsStripItem[] }) {
  return (
    <div className="flex flex-wrap divide-border rounded-lg border bg-card sm:divide-x">
      {itens.map((item) => (
        <div key={item.rotulo} className="flex min-w-[9.5rem] flex-1 flex-col gap-0.5 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {item.rotulo}
          </span>
          <span className="font-mono text-sm font-semibold text-foreground tabular-nums">
            {item.valor}
          </span>
          {item.detalhe ? (
            <span className="text-[10px] leading-tight text-muted-foreground">{item.detalhe}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
