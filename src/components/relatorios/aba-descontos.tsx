import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarMoeda, formatarPercentual } from "@/lib/formatters";
import { DataBarPercent } from "./data-bar-percent";
import { MetricaCard } from "@/components/metrica-card";

interface AbaDescontosProps {
  relatorioDescontos: {
    descontoTotal: number;
    faturamentoBruto: number;
    faturamentoLiquido: number;
    taxaDescontoGlobal: number;
    porVendedor: { nome: string; faturamentoLiquido: number; desconto: number; taxaDesconto: number }[];
    porDepartamento: { nome: string; faturamentoLiquido: number; desconto: number; taxaDesconto: number }[];
  };
}

export function AbaDescontos({ relatorioDescontos }: AbaDescontosProps) {
  return (
    <div className="space-y-6">
      {/* Síntese de Descontos */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricaCard
          rotulo="Faturamento bruto"
          definicao="Soma do valor de tabela dos itens antes dos descontos."
          valor={formatarMoeda(relatorioDescontos.faturamentoBruto)}
        />
        <MetricaCard
          rotulo="Descontos concedidos"
          definicao="Soma dos descontos registrados nos itens vendidos no período."
          valor={formatarMoeda(relatorioDescontos.descontoTotal)}
          destaque="negativo"
          rodape={`Taxa global: ${formatarPercentual(relatorioDescontos.taxaDescontoGlobal, 2)}`}
        />
        <MetricaCard
          rotulo="Faturamento líquido"
          definicao="Faturamento bruto menos descontos concedidos — valor efetivamente faturado."
          valor={formatarMoeda(relatorioDescontos.faturamentoLiquido)}
          destaque="primario"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Descontos por Vendedor */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Desconto Concedido por Vendedor</CardTitle>
            <CardDescription className="text-xs">Avaliação de concessão e taxa de desconto por consultor.</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left font-semibold text-muted-foreground">
                    <th className="py-2.5 pr-2">Vendedor</th>
                    <th className="py-2.5 px-2 text-right">Fat. Líquido</th>
                    <th className="py-2.5 px-2 text-right">Desconto (R$)</th>
                    <th className="py-2.5 pl-2 text-right">% Desconto</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorioDescontos.porVendedor.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    relatorioDescontos.porVendedor.map((v) => (
                      <tr key={v.nome} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-2.5 pr-2 font-bold text-foreground truncate max-w-[140px]" title={v.nome}>
                          {v.nome}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-muted-foreground whitespace-nowrap">
                          {formatarMoeda(v.faturamentoLiquido)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {formatarMoeda(v.desconto)}
                        </td>
                        <td className="py-2.5 pl-2 text-right whitespace-nowrap min-w-[90px]">
                          <DataBarPercent
                            valor={formatarPercentual(v.taxaDesconto, 1)}
                            percentual={Math.min(v.taxaDesconto * 3, 100)}
                            cor="bg-rose-500/20"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Descontos por Departamento */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Desconto por Departamento / Categoria</CardTitle>
            <CardDescription className="text-xs">Categorias com maior pressão de desconto comercial.</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left font-semibold text-muted-foreground">
                    <th className="py-2.5 pr-2">Departamento</th>
                    <th className="py-2.5 px-2 text-right">Fat. Líquido</th>
                    <th className="py-2.5 px-2 text-right">Desconto (R$)</th>
                    <th className="py-2.5 pl-2 text-right">% Desconto</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorioDescontos.porDepartamento.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    relatorioDescontos.porDepartamento.map((d) => (
                      <tr key={d.nome} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-2.5 pr-2 font-bold text-foreground truncate max-w-[140px]" title={d.nome}>
                          {d.nome}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-muted-foreground whitespace-nowrap">
                          {formatarMoeda(d.faturamentoLiquido)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {formatarMoeda(d.desconto)}
                        </td>
                        <td className="py-2.5 pl-2 text-right whitespace-nowrap min-w-[90px]">
                          <DataBarPercent
                            valor={formatarPercentual(d.taxaDesconto, 1)}
                            percentual={Math.min(d.taxaDesconto * 3, 100)}
                            cor="bg-rose-500/20"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
