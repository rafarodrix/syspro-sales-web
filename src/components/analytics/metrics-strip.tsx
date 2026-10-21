export interface MetricsStripItem {
  rotulo: string;
  valor: string;
  detalhe?: string;
  /** Explicação do indicador — exibida como tooltip no item. */
  definicao?: string;
  /** Destaca o valor em vermelho (ex.: resultado negativo). */
  attention?: boolean;
}

/**
 * Faixa compacta de indicadores de contexto — padrão único do app
 * (usado na análise de compras, nos relatórios de vendas e nas visões analíticas).
 * Mantém a explicação de cada métrica via tooltip, sem ocupar espaço de card.
 */
export function MetricsStrip({ itens }: { itens: MetricsStripItem[] }) {
  return (
    <div className="flex flex-wrap divide-border/60 rounded-lg bg-card ring-1 ring-border/50 sm:divide-x">
      {itens.map((item) => (
        <div
          key={item.rotulo}
          title={item.definicao}
          className={`flex min-w-[9.5rem] flex-1 flex-col gap-0.5 px-3 py-2 ${
            item.definicao ? "cursor-help" : ""
          }`}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {item.rotulo}
          </span>
          <span
            className={`font-mono text-sm font-semibold tabular-nums ${
              item.attention ? "text-destructive" : "text-foreground"
            }`}
          >
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
