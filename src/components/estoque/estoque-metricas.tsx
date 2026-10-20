import { ActionMetricCard } from "@/components/analytics/action-metric-card";
import { MetricsStrip } from "@/components/analytics/metrics-strip";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import type { ResumoSaudeEstoque } from "@/lib/estoque-saude";

interface EstoqueMetricasProps {
  resumo: ResumoSaudeEstoque;
  onRupturas: () => void;
  onBaixaCobertura: () => void;
  onExcesso: () => void;
  onDevolucoes: () => void;
}

export function EstoqueMetricas({
  resumo,
  onRupturas,
  onBaixaCobertura,
  onExcesso,
  onDevolucoes,
}: EstoqueMetricasProps) {
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Decisão de estoque</h2>
          <p className="text-xs text-muted-foreground">
            Selecione um indicador para abrir diretamente os produtos ou movimentos relacionados.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ActionMetricCard
            titulo="Rupturas"
            valor={formatarNumero(resumo.rupturas)}
            descricao={`${formatarNumero(resumo.saldosNegativos)} com saldo negativo`}
            onClick={onRupturas}
            acaoTitulo="Mostrar somente produtos em ruptura"
          />
          <ActionMetricCard
            titulo="Baixa cobertura"
            valor={formatarNumero(resumo.baixaCobertura)}
            descricao="Produtos críticos ou em atenção, com menos de 15 dias"
            onClick={onBaixaCobertura}
            acaoTitulo="Mostrar produtos críticos e em atenção"
          />
          <ActionMetricCard
            titulo="Capital em excesso"
            valor={formatarMoeda(resumo.capitalExcesso)}
            descricao={`${formatarNumero(resumo.excesso)} em excesso · ${formatarNumero(resumo.semGiro)} sem saída`}
            onClick={onExcesso}
            acaoTitulo="Mostrar produtos com estoque em excesso"
          />
          <ActionMetricCard
            titulo="Taxa de EDV"
            valor={formatarPercentual(resumo.taxaDevolucaoQuantidade)}
            descricao={`${formatarPercentual(resumo.taxaDevolucaoValor)} do valor · ${formatarMoeda(resumo.devolucoesVendaValor)}`}
            onClick={onDevolucoes}
            acaoTitulo="Abrir somente as devoluções de venda (EDV)"
          />
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Base do período</h2>
          <p className="text-xs text-muted-foreground">
            Valorização operacional do saldo positivo pelos custos disponíveis no período
          </p>
        </div>
        <MetricsStrip
          itens={[
            {
              rotulo: "Capital em aquisição",
              valor: formatarMoeda(resumo.valorAquisicao),
              detalhe: `${formatarPercentual(resumo.coberturaCustoAquisicao)} dos produtos com custo`,
            },
            {
              rotulo: "Valor de reposição",
              valor: formatarMoeda(resumo.valorReposicao),
              detalhe: `${formatarPercentual(resumo.coberturaCustoReposicao)} dos produtos com custo`,
            },
            {
              rotulo: "Produtos analisados",
              valor: formatarNumero(resumo.totalProdutos),
              detalhe: `${formatarNumero(resumo.semGiro)} sem saída no período`,
            },
            {
              rotulo: "Devoluções EDV",
              valor: formatarMoeda(resumo.devolucoesVendaValor),
              detalhe: `${formatarNumero(resumo.devolucoesVendaQuantidade, 0)} unidades devolvidas`,
            },
          ]}
        />
      </section>
    </div>
  );
}
