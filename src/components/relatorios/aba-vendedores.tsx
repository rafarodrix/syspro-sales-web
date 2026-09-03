import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import type { ItemVendedorAnalise } from "@/lib/vendas";
import { DataBarPercent } from "./data-bar-percent";

interface AbaVendedoresProps {
  vendedoresFiltrados: ItemVendedorAnalise[];
}

export function AbaVendedores({ vendedoresFiltrados }: AbaVendedoresProps) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[640px] text-xs">
        <thead>
          <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
            <th className="p-3">Vendedor</th>
            <th className="p-3 text-right">Pedidos / NF</th>
            <th className="p-3 text-right">Clientes Únicos</th>
            <th className="p-3 text-right">Qtd Itens</th>
            <th className="p-3 text-right">Ticket Médio</th>
            <th className="p-3 text-right">Desconto (R$)</th>
            <th className="p-3 text-right">% Desconto</th>
            <th className="p-3 text-right">Faturamento Total</th>
            <th className="p-3 text-right">% Participação</th>
            <th className="p-3">Principal Produto</th>
          </tr>
        </thead>
        <tbody>
          {vendedoresFiltrados.map((v) => (
            <tr key={v.nome} className="border-b last:border-0 hover:bg-muted/20">
              <td className="p-3 font-bold text-sm text-foreground">{v.nome}</td>
              <td className="p-3 text-right font-mono">{formatarNumero(v.pedidos, 0)}</td>
              <td className="p-3 text-right font-mono">{formatarNumero(v.clientes, 0)}</td>
              <td className="p-3 text-right font-mono text-muted-foreground">
                {formatarNumero(v.quantidadeItens, 2)}
              </td>
              <td className="p-3 text-right font-mono text-muted-foreground">
                {formatarMoeda(v.ticketMedio)}
              </td>
              <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400">
                {formatarMoeda(v.descontoConcedido)}
              </td>
              <td className="p-3 text-right font-mono">
                {formatarPercentual(v.taxaDesconto, 1)}
              </td>
              <td className="p-3 text-right font-mono font-bold text-foreground">
                {formatarMoeda(v.faturamento)}
              </td>
              <td className="p-3 text-right">
                <DataBarPercent
                  valor={formatarPercentual(v.percentual, 1)}
                  percentual={v.percentual}
                  cor="bg-violet-500/20"
                />
              </td>
              <td className="p-3 text-muted-foreground truncate max-w-[180px]" title={v.principalProduto}>
                {v.principalProduto ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
