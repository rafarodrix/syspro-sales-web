import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarMoeda, formatarPercentual } from "@/lib/formatters";

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border bg-muted/20 p-3.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Faturamento Bruto
          </span>
          <div className="mt-1 font-mono font-extrabold text-lg text-foreground">
            {formatarMoeda(relatorioDescontos.faturamentoBruto)}
          </div>
          <span className="text-[11px] text-muted-foreground">Valor de tabela dos itens</span>
        </div>

        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5">
          <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
            Total de Descontos Concedidos
          </span>
          <div className="mt-1 font-mono font-extrabold text-lg text-rose-950 dark:text-rose-200">
            {formatarMoeda(relatorioDescontos.descontoTotal)}
          </div>
          <span className="text-[11px] text-rose-700/80 dark:text-rose-400">
            Taxa global: {formatarPercentual(relatorioDescontos.taxaDescontoGlobal, 2)}
          </span>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Faturamento Líquido
          </span>
          <div className="mt-1 font-mono font-extrabold text-lg text-foreground">
            {formatarMoeda(relatorioDescontos.faturamentoLiquido)}
          </div>
          <span className="text-[11px] text-muted-foreground">Efetivamente faturado</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Descontos por Vendedor */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Desconto Concedido por Vendedor</CardTitle>
            <CardDescription className="text-xs">Avaliação de concessão e taxa de desconto por consultor.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="border-b text-left font-semibold text-muted-foreground">
                    <th className="p-2.5">Vendedor</th>
                    <th className="p-2.5 text-right">Fat. Líquido</th>
                    <th className="p-2.5 text-right">Desconto (R$)</th>
                    <th className="p-2.5 text-right">% Desconto</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorioDescontos.porVendedor.map((v) => (
                    <tr key={v.nome} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-2.5 font-bold text-foreground">{v.nome}</td>
                      <td className="p-2.5 text-right font-mono text-muted-foreground">{formatarMoeda(v.faturamentoLiquido)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">{formatarMoeda(v.desconto)}</td>
                      <td className="p-2.5 text-right font-mono font-bold">{formatarPercentual(v.taxaDesconto, 1)}</td>
                    </tr>
                  ))}
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
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="border-b text-left font-semibold text-muted-foreground">
                    <th className="p-2.5">Departamento</th>
                    <th className="p-2.5 text-right">Fat. Líquido</th>
                    <th className="p-2.5 text-right">Desconto (R$)</th>
                    <th className="p-2.5 text-right">% Desconto</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorioDescontos.porDepartamento.map((d) => (
                    <tr key={d.nome} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-2.5 font-bold text-foreground">{d.nome}</td>
                      <td className="p-2.5 text-right font-mono text-muted-foreground">{formatarMoeda(d.faturamentoLiquido)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">{formatarMoeda(d.desconto)}</td>
                      <td className="p-2.5 text-right font-mono font-bold">{formatarPercentual(d.taxaDesconto, 1)}</td>
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
