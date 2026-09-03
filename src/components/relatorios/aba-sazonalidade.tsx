import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import { DataBarPercent } from "./data-bar-percent";

interface DiaSemanaItem {
  dia: string;
  pedidos: number;
  ticketMedio: number;
  faturamento: number;
  percentual: number;
}

interface QuinzenaItem {
  quinzena: string;
  pedidos: number;
  ticketMedio: number;
  faturamento: number;
  percentual: number;
}

interface AbaSazonalidadeProps {
  relatorioSazonalidade: {
    porDiaSemana: DiaSemanaItem[];
    porQuinzena: QuinzenaItem[];
  };
}

export function AbaSazonalidade({ relatorioSazonalidade }: AbaSazonalidadeProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Vendas por Dia da Semana */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Faturamento por Dia da Semana</CardTitle>
            <CardDescription className="text-xs">Distribuição de receita e pedidos de Segunda a Domingo.</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left font-semibold text-muted-foreground">
                    <th className="py-2.5 pr-2">Dia</th>
                    <th className="py-2.5 px-2 text-right">Pedidos</th>
                    <th className="py-2.5 px-2 text-right">Ticket Médio</th>
                    <th className="py-2.5 px-2 text-right">Faturamento</th>
                    <th className="py-2.5 pl-2 text-right">% Total</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorioSazonalidade.porDiaSemana.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    relatorioSazonalidade.porDiaSemana.map((d) => (
                      <tr key={d.dia} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-2.5 pr-2 font-bold text-foreground whitespace-nowrap">{d.dia}</td>
                        <td className="py-2.5 px-2 text-right font-mono text-muted-foreground whitespace-nowrap">
                          {formatarNumero(d.pedidos, 0)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-muted-foreground whitespace-nowrap">
                          {formatarMoeda(d.ticketMedio)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-foreground whitespace-nowrap">
                          {formatarMoeda(d.faturamento)}
                        </td>
                        <td className="py-2.5 pl-2 text-right whitespace-nowrap min-w-[90px]">
                          <DataBarPercent
                            valor={formatarPercentual(d.percentual, 1)}
                            percentual={d.percentual}
                            cor="bg-indigo-500/20"
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

        {/* Comparativo Quinzenal */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Comparativo Quinzenal</CardTitle>
            <CardDescription className="text-xs">Início de mês (1 a 15) vs. Segunda quinzena (16+).</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left font-semibold text-muted-foreground">
                    <th className="py-2.5 pr-2">Quinzena</th>
                    <th className="py-2.5 px-2 text-right">Pedidos</th>
                    <th className="py-2.5 px-2 text-right">Ticket Médio</th>
                    <th className="py-2.5 px-2 text-right">Faturamento</th>
                    <th className="py-2.5 pl-2 text-right">% Total</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorioSazonalidade.porQuinzena.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    relatorioSazonalidade.porQuinzena.map((q) => (
                      <tr key={q.quinzena} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-2.5 pr-2 font-bold text-foreground whitespace-nowrap">{q.quinzena}</td>
                        <td className="py-2.5 px-2 text-right font-mono text-muted-foreground whitespace-nowrap">
                          {formatarNumero(q.pedidos, 0)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-muted-foreground whitespace-nowrap">
                          {formatarMoeda(q.ticketMedio)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-foreground whitespace-nowrap">
                          {formatarMoeda(q.faturamento)}
                        </td>
                        <td className="py-2.5 pl-2 text-right whitespace-nowrap min-w-[90px]">
                          <DataBarPercent
                            valor={formatarPercentual(q.percentual, 1)}
                            percentual={q.percentual}
                            cor="bg-indigo-500/20"
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
