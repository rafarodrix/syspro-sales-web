import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import type { ItemCurvaABC } from "@/lib/vendas";
import { DataBarPercent } from "./data-bar-percent";
import { TablePagination } from "@/components/table-pagination";

interface AbaCurvaABCProps {
  relatorioABC: {
    itens: ItemCurvaABC[];
    resumoA: { faturamento: number; itens: number; percentualFaturamento: number; percentualItens: number };
    resumoB: { faturamento: number; itens: number; percentualFaturamento: number; percentualItens: number };
    resumoC: { faturamento: number; itens: number; percentualFaturamento: number; percentualItens: number };
  };
  itensFiltrados: ItemCurvaABC[];
}

export function AbaCurvaABC({ relatorioABC, itensFiltrados }: AbaCurvaABCProps) {
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);

  const itensPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return itensFiltrados.slice(inicio, inicio + itensPorPagina);
  }, [itensFiltrados, paginaAtual, itensPorPagina]);

  return (
    <div className="space-y-4">
      {/* Cards Síntese ABC (Pareto) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5">
          <div className="flex items-center justify-between">
            <Badge className="bg-emerald-600 font-bold text-white">Classe A</Badge>
            <span className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300">
              {formatarPercentual(relatorioABC.resumoA.percentualFaturamento, 1)} Faturamento
            </span>
          </div>
          <div className="mt-2 font-mono font-extrabold text-lg text-emerald-950 dark:text-emerald-200">
            {formatarMoeda(relatorioABC.resumoA.faturamento)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {relatorioABC.resumoA.itens} itens ({formatarPercentual(relatorioABC.resumoA.percentualItens, 1)} do catálogo)
          </div>
        </div>

        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3.5">
          <div className="flex items-center justify-between">
            <Badge className="bg-blue-600 font-bold text-white">Classe B</Badge>
            <span className="font-mono text-xs font-bold text-blue-800 dark:text-blue-300">
              {formatarPercentual(relatorioABC.resumoB.percentualFaturamento, 1)} Faturamento
            </span>
          </div>
          <div className="mt-2 font-mono font-extrabold text-lg text-blue-950 dark:text-blue-200">
            {formatarMoeda(relatorioABC.resumoB.faturamento)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {relatorioABC.resumoB.itens} itens ({formatarPercentual(relatorioABC.resumoB.percentualItens, 1)} do catálogo)
          </div>
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5">
          <div className="flex items-center justify-between">
            <Badge className="bg-amber-600 font-bold text-white">Classe C</Badge>
            <span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-300">
              {formatarPercentual(relatorioABC.resumoC.percentualFaturamento, 1)} Faturamento
            </span>
          </div>
          <div className="mt-2 font-mono font-extrabold text-lg text-amber-950 dark:text-amber-200">
            {formatarMoeda(relatorioABC.resumoC.faturamento)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {relatorioABC.resumoC.itens} itens ({formatarPercentual(relatorioABC.resumoC.percentualItens, 1)} do catálogo)
          </div>
        </div>
      </div>

      {/* Tabela Curva ABC */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[640px] text-xs">
          <thead>
            <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
              <th className="p-3 w-16 text-center">Classe</th>
              <th className="p-3">Código</th>
              <th className="p-3">Produto</th>
              <th className="p-3">Departamento</th>
              <th className="p-3 text-right">Qtd Vendida</th>
              <th className="p-3 text-right">Preço Médio</th>
              <th className="p-3 text-right">Total Faturado</th>
              <th className="p-3 text-right">% Fat.</th>
              <th className="p-3 text-right">% Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {itensPaginados.map((item, idx) => (
              <tr key={`${item.id}-${idx}`} className="border-b last:border-0 hover:bg-muted/20">
                <td className="p-3 text-center">
                  <Badge
                    variant={
                      item.classe === "A"
                        ? "default"
                        : item.classe === "B"
                          ? "secondary"
                          : "outline"
                    }
                    className={`font-bold ${
                      item.classe === "A"
                        ? "bg-emerald-600 text-white"
                        : item.classe === "B"
                          ? "bg-blue-600 text-white"
                          : "text-amber-700 dark:text-amber-400 border-amber-500/40"
                    }`}
                  >
                    {item.classe}
                  </Badge>
                </td>
                <td className="p-3 font-mono text-muted-foreground">{item.id}</td>
                <td className="p-3 font-semibold text-foreground">{item.produto}</td>
                <td className="p-3 text-muted-foreground">{item.departamento}</td>
                <td className="p-3 text-right font-mono">
                  {formatarNumero(item.quantidade, 2)} {item.un}
                </td>
                <td className="p-3 text-right font-mono text-muted-foreground">
                  {formatarMoeda(item.precoMedio)}
                </td>
                <td className="p-3 text-right font-mono font-bold text-foreground">
                  {formatarMoeda(item.total)}
                </td>
                <td className="p-3 text-right">
                  <DataBarPercent
                    valor={formatarPercentual(item.percentual, 2)}
                    percentual={item.percentual}
                    cor={
                      item.classe === "A"
                        ? "bg-emerald-500/20"
                        : item.classe === "B"
                          ? "bg-blue-500/20"
                          : "bg-amber-500/20"
                    }
                  />
                </td>
                <td className="p-3 text-right font-mono font-semibold text-primary">
                  {formatarPercentual(item.percentualAcumulado, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação Padrão */}
      <TablePagination
        paginaAtual={paginaAtual}
        totalItens={itensFiltrados.length}
        itensPorPagina={itensPorPagina}
        onPaginaChange={setPaginaAtual}
        onItensPorPaginaChange={setItensPorPagina}
        labelItens="produtos"
      />
    </div>
  );
}
