import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import type { ConcentracaoTop, CrescimentoProduto, ItemCurvaABC } from "@/lib/vendas";
import { DataBarPercent } from "./data-bar-percent";
import { TablePagination } from "@/components/table-pagination";
import { TermoExplicado } from "@/components/relatorio-guia";

interface AbaCurvaABCProps {
  relatorioABC: {
    itens: ItemCurvaABC[];
    resumoA: { faturamento: number; itens: number; percentualFaturamento: number; percentualItens: number };
    resumoB: { faturamento: number; itens: number; percentualFaturamento: number; percentualItens: number };
    resumoC: { faturamento: number; itens: number; percentualFaturamento: number; percentualItens: number };
  };
  itensFiltrados: ItemCurvaABC[];
  concentracaoTop10: ConcentracaoTop | null;
  concentracaoTop20: ConcentracaoTop | null;
  produtosEmAlta: CrescimentoProduto[];
  temPeriodoAnterior: boolean;
}

export function AbaCurvaABC({
  relatorioABC,
  itensFiltrados,
  concentracaoTop10,
  concentracaoTop20,
  produtosEmAlta,
  temPeriodoAnterior,
}: AbaCurvaABCProps) {
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

      {/* Dependência do portfólio e produtos em alta */}
      <div className={`grid gap-3 ${temPeriodoAnterior ? "sm:grid-cols-2" : ""}`}>
        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <TermoExplicado
              termo="Dependência do portfólio"
              definicao="% do faturamento concentrado nos 10 e nos 20 produtos mais vendidos. Acima de 80% no Top 20 indica portfólio concentrado — variação nesses itens afeta a receita toda."
            />
            <div className="text-right">
              <div className="font-mono text-lg font-extrabold text-foreground">
                {formatarPercentual(concentracaoTop10?.percentualTop ?? 0, 1)}
                <span className="text-xs font-semibold text-muted-foreground"> / </span>
                {formatarPercentual(concentracaoTop20?.percentualTop ?? 0, 1)}
              </div>
              <div className="text-[10px] text-muted-foreground">Top 10 / Top 20</div>
            </div>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {concentracaoTop10?.itensNoTop ?? 0} produtos respondem por {formatarPercentual(concentracaoTop10?.percentualTop ?? 0, 1)} da receita
          </p>
        </div>

        {temPeriodoAnterior ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="size-3.5" />
              Produtos em alta vs. período anterior
            </div>
            {produtosEmAlta.length === 0 ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Nenhum produto com crescimento comparável entre os dois períodos.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {produtosEmAlta.map((produto) => (
                  <li key={`${produto.id}|${produto.produto}`} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-muted-foreground" title={produto.produto}>
                      <span className="font-mono text-[10px] text-muted-foreground/70">{produto.id}</span>{" "}
                      {produto.produto}
                    </span>
                    <span className="shrink-0 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatarPercentual(produto.variacao.percentual, 0)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
