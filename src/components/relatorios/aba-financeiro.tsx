import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import { DataBarPercent } from "./data-bar-percent";

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
    formasPagamento: FormaPagamentoItem[];
    modelosDocumento: ModeloDocumentoItem[];
  };
}

export function AbaFinanceiro({ relatorioFinanceiro }: AbaFinanceiroProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Formas de Pagamento Declaradas</CardTitle>
            <CardDescription className="text-xs">Distribuição do faturamento por meio de recebimento.</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left font-semibold text-muted-foreground">
                    <th className="py-2.5 pr-2">Forma</th>
                    <th className="py-2.5 px-2 text-right">Pedidos</th>
                    <th className="py-2.5 px-2 text-right">Ticket Médio</th>
                    <th className="py-2.5 px-2 text-right">Total</th>
                    <th className="py-2.5 pl-2 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorioFinanceiro.formasPagamento.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    relatorioFinanceiro.formasPagamento.map((fp) => (
                      <tr key={fp.nome} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-2.5 pr-2 font-medium text-foreground truncate max-w-[130px]" title={fp.nome}>
                          {fp.nome}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-muted-foreground whitespace-nowrap">
                          {formatarNumero(fp.pedidos, 0)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-muted-foreground whitespace-nowrap">
                          {formatarMoeda(fp.ticketMedio)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-foreground whitespace-nowrap">
                          {formatarMoeda(fp.total)}
                        </td>
                        <td className="py-2.5 pl-2 text-right whitespace-nowrap min-w-[80px]">
                          <DataBarPercent
                            valor={formatarPercentual(fp.percentual, 1)}
                            percentual={fp.percentual}
                            cor="bg-orange-500/20"
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

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Modelos de Documentos Fiscais</CardTitle>
            <CardDescription className="text-xs">Divisão entre NF-e (Modelo 55) e NFC-e (Modelo 65).</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left font-semibold text-muted-foreground">
                    <th className="py-2.5 pr-2">Modelo</th>
                    <th className="py-2.5 px-2 text-right">Notas</th>
                    <th className="py-2.5 px-2 text-right">Ticket Médio</th>
                    <th className="py-2.5 px-2 text-right">Total</th>
                    <th className="py-2.5 pl-2 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorioFinanceiro.modelosDocumento.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    relatorioFinanceiro.modelosDocumento.map((m) => (
                      <tr key={m.nome} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-2.5 pr-2 font-medium text-foreground truncate max-w-[130px]" title={m.nome}>
                          {m.nome}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-muted-foreground whitespace-nowrap">
                          {formatarNumero(m.pedidos, 0)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-muted-foreground whitespace-nowrap">
                          {formatarMoeda(m.ticketMedio)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-foreground whitespace-nowrap">
                          {formatarMoeda(m.total)}
                        </td>
                        <td className="py-2.5 pl-2 text-right whitespace-nowrap min-w-[80px]">
                          <DataBarPercent
                            valor={formatarPercentual(m.percentual, 1)}
                            percentual={m.percentual}
                            cor="bg-orange-500/20"
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
