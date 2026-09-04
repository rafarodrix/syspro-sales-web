import { useMemo, useState } from "react";
import { PackageSearch } from "lucide-react";
import { formatarMoeda, formatarNumero } from "@/lib/formatters";
import type { ItemProdutoPorDimensao } from "@/lib/vendas";
import { TablePagination } from "@/components/table-pagination";

interface VisaoProdutosPorDimensaoProps {
  itens: ItemProdutoPorDimensao[];
  dimensaoRotulo: string;
  dimensaoPlural: string;
}

export function VisaoProdutosPorDimensao({ itens, dimensaoRotulo, dimensaoPlural }: VisaoProdutosPorDimensaoProps) {
  const [dimensaoSelecionada, setDimensaoSelecionada] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);
  const dimensoes = useMemo(
    () => [...new Set(itens.map((item) => item.dimensao))].sort(new Intl.Collator("pt-BR").compare),
    [itens],
  );
  const itensFiltrados = dimensaoSelecionada
    ? itens.filter((item) => item.dimensao === dimensaoSelecionada)
    : itens;
  const itensPaginados = itensFiltrados.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 p-2.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <PackageSearch className="size-4 text-primary" />
          <span>Produtos consolidados dentro de cada {dimensaoRotulo.toLowerCase()}.</span>
        </div>
        <select
          value={dimensaoSelecionada}
          onChange={(event) => {
            setDimensaoSelecionada(event.target.value);
            setPaginaAtual(1);
          }}
          className="h-8 max-w-64 rounded-md border bg-background px-2 text-xs text-foreground"
          aria-label={`Filtrar por ${dimensaoRotulo}`}
        >
          <option value="">Todos os {dimensaoPlural}</option>
          {dimensoes.map((dimensao) => <option key={dimensao} value={dimensao}>{dimensao}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[820px] text-xs">
          <thead>
            <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
              {!dimensaoSelecionada && <th className="p-3">{dimensaoRotulo}</th>}
              <th className="p-3">Código</th>
              <th className="p-3">Produto</th>
              <th className="p-3">Departamento</th>
              <th className="p-3 text-right">Pedidos / NF</th>
              <th className="p-3 text-right">Quantidade</th>
              <th className="p-3 text-right">Desconto</th>
              <th className="p-3 text-right">Faturamento</th>
            </tr>
          </thead>
          <tbody>
            {itensPaginados.length === 0 ? (
              <tr><td colSpan={dimensaoSelecionada ? 7 : 8} className="p-8 text-center text-muted-foreground">Nenhum produto encontrado.</td></tr>
            ) : itensPaginados.map((item) => (
              <tr key={`${item.dimensao}-${item.produtoId}-${item.produto}`} className="border-b last:border-0 hover:bg-muted/20">
                {!dimensaoSelecionada && <td className="max-w-52 truncate p-3 font-semibold" title={item.dimensao}>{item.dimensao}</td>}
                <td className="p-3 font-mono text-muted-foreground">{item.produtoId}</td>
                <td className="max-w-64 truncate p-3 font-medium" title={item.produto}>{item.produto}</td>
                <td className="max-w-48 truncate p-3 text-muted-foreground" title={item.departamento}>{item.departamento}</td>
                <td className="p-3 text-right font-mono">{formatarNumero(item.pedidos, 0)}</td>
                <td className="p-3 text-right font-mono">{formatarNumero(item.quantidade, 2)} {item.un}</td>
                <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400">{formatarMoeda(item.descontos)}</td>
                <td className="p-3 text-right font-mono font-bold">{formatarMoeda(item.faturamento)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination
        paginaAtual={paginaAtual}
        totalItens={itensFiltrados.length}
        itensPorPagina={itensPorPagina}
        onPaginaChange={setPaginaAtual}
        onItensPorPaginaChange={(valor) => { setItensPorPagina(valor); setPaginaAtual(1); }}
        labelItens="produtos"
      />
    </div>
  );
}
