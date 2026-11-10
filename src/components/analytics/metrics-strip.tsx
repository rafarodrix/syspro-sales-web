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
    <div className="grid gap-px overflow-hidden bg-linha [grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr))]">
      {itens.map((item) => (
        <div
          key={item.rotulo}
          title={item.definicao}
          className={`flex min-w-0 flex-col gap-0.5 bg-background px-3 py-2 ${
            item.definicao ? "cursor-help" : ""
          }`}
        >
          <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {item.rotulo}
          </span>
          <span
            className={`num truncate text-sm font-semibold ${
              item.attention ? "text-negativo" : "text-foreground"
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
