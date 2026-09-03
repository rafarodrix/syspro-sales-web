import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";

interface FormaPagamentoItem {
  nome: string;
  pedidos: number;
  ticketMedio: number;
  total: number;
  percentual: number;
}

interface ModeloDocumentoItem {
  nome: string;
  pedidos: number;
  ticketMedio: number;
  total: number;
  percentual: number;
}

interface AbaFinanceiroProps {
  relatorioFinanceiro: {
    totaisFrete: number;
    totaisIcmsSt: number;
    formasPagamento: FormaPagamentoItem[];
    modelosDocumento: ModeloDocumentoItem[];
  };
}

export function AbaFinanceiro({ relatorioFinanceiro }: AbaFinanceiroProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-muted/20 p-3">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Frete
          </span>
          <div className="mt-1 font-mono font-extrabold text-lg text-foreground">
            {formatarMoeda(relatorioFinanceiro.totaisFrete)}
          </div>
        </div>
        <div className="rounded-lg border bg-muted/20 p-3">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total ICMS-ST
          </span>
          <div className="mt-1 font-mono font-extrabold text-lg text-foreground">
            {formatarMoeda(relatorioFinanceiro.totaisIcmsSt)}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Formas de Pagamento Declaradas</CardTitle>
            <CardDescription className="text-xs">Distribuição do faturamento por meio de recebimento.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="border-b text-left font-semibold text-muted-foreground">
                    <th className="p-2.5">Forma</th>
                    <th className="p-2.5 text-right">Pedidos</th>
                    <th className="p-2.5 text-right">Ticket Médio</th>
                    <th className="p-2.5 text-right">Total</th>
                    <th className="p-2.5 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorioFinanceiro.formasPagamento.map((fp) => (
                    <tr key={fp.nome} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-2.5 font-medium text-foreground">{fp.nome}</td>
                      <td className="p-2.5 text-right font-mono">{formatarNumero(fp.pedidos, 0)}</td>
                      <td className="p-2.5 text-right font-mono text-muted-foreground">{formatarMoeda(fp.ticketMedio)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-foreground">{formatarMoeda(fp.total)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-primary">{formatarPercentual(fp.percentual, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Modelos de Documentos Fiscais</CardTitle>
            <CardDescription className="text-xs">Divisão entre NF-e (Modelo 55) e NFC-e (Modelo 65).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="border-b text-left font-semibold text-muted-foreground">
                    <th className="p-2.5">Modelo</th>
                    <th className="p-2.5 text-right">Notas Emitidas</th>
                    <th className="p-2.5 text-right">Ticket Médio</th>
                    <th className="p-2.5 text-right">Total</th>
                    <th className="p-2.5 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorioFinanceiro.modelosDocumento.map((m) => (
                    <tr key={m.nome} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-2.5 font-medium text-foreground">{m.nome}</td>
                      <td className="p-2.5 text-right font-mono">{formatarNumero(m.pedidos, 0)}</td>
                      <td className="p-2.5 text-right font-mono text-muted-foreground">{formatarMoeda(m.ticketMedio)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-foreground">{formatarMoeda(m.total)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-primary">{formatarPercentual(m.percentual, 1)}</td>
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
