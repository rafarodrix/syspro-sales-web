import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import type { ItemGeograficoAnalise } from "@/lib/vendas";
import { TablePagination } from "@/components/table-pagination";

interface AbaGeograficoProps {
  cidadesFiltradas: ItemGeograficoAnalise[];
}

export function AbaGeografico({ cidadesFiltradas }: AbaGeograficoProps) {
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);

  const cidadesPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return cidadesFiltradas.slice(inicio, inicio + itensPorPagina);
  }, [cidadesFiltradas, paginaAtual, itensPorPagina]);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[640px] text-xs">
          <thead>
            <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
              <th className="p-3">Cidade</th>
              <th className="p-3">UF</th>
              <th className="p-3 text-right">Pedidos / NF</th>
              <th className="p-3 text-right">Clientes Atendidos</th>
              <th className="p-3 text-right">Ticket Médio</th>
              <th className="p-3 text-right">Frete Rateado</th>
              <th className="p-3 text-right">Faturamento Total</th>
              <th className="p-3 text-right">% Participação</th>
            </tr>
          </thead>
          <tbody>
            {cidadesPaginadas.map((c, i) => (
              <tr key={`${c.cidade}-${c.uf}-${i}`} className="border-b last:border-0 hover:bg-muted/20">
                <td className="p-3 font-semibold text-foreground text-sm">{c.cidade}</td>
                <td className="p-3 font-mono font-bold">
                  <Badge variant="outline">{c.uf}</Badge>
                </td>
                <td className="p-3 text-right font-mono">{formatarNumero(c.pedidos, 0)}</td>
                <td className="p-3 text-right font-mono">{formatarNumero(c.clientes, 0)}</td>
                <td className="p-3 text-right font-mono text-muted-foreground">
                  {formatarMoeda(c.ticketMedio)}
                </td>
                <td className="p-3 text-right font-mono text-muted-foreground">
                  {formatarMoeda(c.frete)}
                </td>
                <td className="p-3 text-right font-mono font-bold text-foreground">
                  {formatarMoeda(c.faturamento)}
                </td>
                <td className="p-3 text-right font-mono font-bold text-primary">
                  {formatarPercentual(c.percentual, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação Padrão */}
      <TablePagination
        paginaAtual={paginaAtual}
        totalItens={cidadesFiltradas.length}
        itensPorPagina={itensPorPagina}
        onPaginaChange={setPaginaAtual}
        onItensPorPaginaChange={setItensPorPagina}
        labelItens="cidades"
      />
    </div>
  );
}
