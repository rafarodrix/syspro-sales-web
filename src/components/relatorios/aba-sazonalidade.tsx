import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";

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
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="border-b text-left font-semibold text-muted-foreground">
                    <th className="p-2.5">Dia da Semana</th>
                    <th className="p-2.5 text-right">Pedidos</th>
                    <th className="p-2.5 text-right">Ticket Médio</th>
                    <th className="p-2.5 text-right">Faturamento</th>
                    <th className="p-2.5 text-right">% Total</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorioSazonalidade.porDiaSemana.map((d) => (
                    <tr key={d.dia} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-2.5 font-bold text-foreground">{d.dia}</td>
                      <td className="p-2.5 text-right font-mono">{formatarNumero(d.pedidos, 0)}</td>
                      <td className="p-2.5 text-right font-mono text-muted-foreground">{formatarMoeda(d.ticketMedio)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-foreground">{formatarMoeda(d.faturamento)}</td>
                      <td className="p-2.5 text-right font-mono font-semibold text-primary">{formatarPercentual(d.percentual, 1)}</td>
                    </tr>
                  ))}
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
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="border-b text-left font-semibold text-muted-foreground">
                    <th className="p-2.5">Quinzena</th>
                    <th className="p-2.5 text-right">Pedidos</th>
                    <th className="p-2.5 text-right">Ticket Médio</th>
                    <th className="p-2.5 text-right">Faturamento</th>
                    <th className="p-2.5 text-right">% Total</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorioSazonalidade.porQuinzena.map((q) => (
                    <tr key={q.quinzena} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-2.5 font-bold text-foreground">{q.quinzena}</td>
                      <td className="p-2.5 text-right font-mono">{formatarNumero(q.pedidos, 0)}</td>
                      <td className="p-2.5 text-right font-mono text-muted-foreground">{formatarMoeda(q.ticketMedio)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-foreground">{formatarMoeda(q.faturamento)}</td>
                      <td className="p-2.5 text-right font-mono font-semibold text-primary">{formatarPercentual(q.percentual, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
