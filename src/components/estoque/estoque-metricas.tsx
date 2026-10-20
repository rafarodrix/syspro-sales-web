import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  RotateCcw,
  ShieldAlert,
  WalletCards,
} from "lucide-react";
import { MetricaCard } from "@/components/metrica-card";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import type { ResumoSaudeEstoque } from "@/lib/estoque-saude";

export function EstoqueMetricas({ resumo }: { resumo: ResumoSaudeEstoque }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <MetricaCard
        rotulo="Capital em aquisição"
        definicao="Saldo positivo valorizado pelo custo médio de aquisição disponível no período. É uma estimativa operacional, não uma valorização contábil por lote."
        valor={formatarMoeda(resumo.valorAquisicao)}
        rodape={`${formatarPercentual(resumo.coberturaCustoAquisicao)} dos produtos com custo`}
        icone={WalletCards}
        destaque="primario"
      />
      <MetricaCard
        rotulo="Valor de reposição"
        definicao="Saldo positivo valorizado pelo custo de reposição, que inclui impostos, frete e outras despesas."
        valor={formatarMoeda(resumo.valorReposicao)}
        rodape={`${formatarPercentual(resumo.coberturaCustoReposicao)} dos produtos com custo`}
        icone={CircleDollarSign}
      />
      <MetricaCard
        rotulo="Rupturas"
        definicao="Produtos com demanda líquida positiva e saldo atual menor ou igual a zero."
        valor={formatarNumero(resumo.rupturas)}
        rodape={`${formatarNumero(resumo.saldosNegativos)} com saldo negativo`}
        icone={ShieldAlert}
        destaque={resumo.rupturas > 0 ? "negativo" : "positivo"}
      />
      <MetricaCard
        rotulo="Baixa cobertura"
        definicao="Produtos com demanda e menos de 15 dias de cobertura; abaixo de 7 dias são classificados como críticos."
        valor={formatarNumero(resumo.baixaCobertura)}
        rodape="Críticos e em atenção"
        icone={AlertTriangle}
        destaque={resumo.baixaCobertura > 0 ? "amarelo" : "positivo"}
      />
      <MetricaCard
        rotulo="Capital em excesso"
        definicao="Valor de reposição dos produtos com mais de 90 dias de cobertura estimada."
        valor={formatarMoeda(resumo.capitalExcesso)}
        rodape={`${formatarNumero(resumo.excesso)} produtos em excesso · ${formatarNumero(resumo.semGiro)} sem saída`}
        icone={Boxes}
      />
      <MetricaCard
        rotulo="Taxa de EDV"
        definicao="Percentual da quantidade vendida que retornou como devolução de venda. O rodapé mostra quantidade e valor devolvidos."
        valor={formatarPercentual(resumo.taxaDevolucaoQuantidade)}
        rodape={`Valor: ${formatarPercentual(resumo.taxaDevolucaoValor)} · ${formatarMoeda(resumo.devolucoesVendaValor)}`}
        icone={RotateCcw}
        destaque={resumo.devolucoesVendaQuantidade > 0 ? "amarelo" : "neutro"}
      />
    </div>
  );
}
