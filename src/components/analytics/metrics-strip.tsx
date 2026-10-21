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
 * (análise de compras, relatórios de vendas e visões analíticas).
 *
 * Grade com separadores de 1px (sem borda por célula): mantém as colunas
 * alinhadas em qualquer quantidade de itens e evita o acúmulo de bordas.
 */
export function MetricsStrip({ itens }: { itens: MetricsStripItem[] }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-lg bg-border/50 ring-1 ring-border/50 [grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr))]">
      {itens.map((item) => (
        <div
          key={item.rotulo}
          title={item.definicao}
          className={`flex min-w-0 flex-col gap-0.5 bg-card px-3 py-2 ${
            item.definicao ? "cursor-help" : ""
          }`}
        >
          <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {item.rotulo}
          </span>
          <span
            className={`truncate font-mono text-sm font-semibold tabular-nums ${
              item.attention ? "text-destructive" : "text-foreground"
            }`}
          >
            {item.valor}
          </span>
          {item.detalhe ? (
            <span className="truncate text-[10px] leading-tight text-muted-foreground">
              {item.detalhe}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
