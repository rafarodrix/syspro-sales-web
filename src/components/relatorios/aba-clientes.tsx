import { useMemo, useState } from "react";
import { FileText, LayoutList, MousePointerClick, PackageSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import type { ItemClienteAnalise, ItemProdutoPorDimensao, VendaAgrupada } from "@/lib/vendas";
import { DataBarPercent } from "./data-bar-percent";
import { TablePagination } from "@/components/table-pagination";
import { VisaoAnaliticaNotas } from "./visao-analitica-notas";
import { ReportViewSelector } from "./report-view-toggle";
import { VisaoProdutosPorDimensao } from "./visao-produtos-por-dimensao";

interface AbaClientesProps {
  clientesFiltrados: ItemClienteAnalise[];
  produtosPorCliente: ItemProdutoPorDimensao[];
  /** Notas do período (agrupadas por NF), usadas na visão analítica. */
  notasAgrupadas: VendaAgrupada[];
}

export function AbaClientes({
  clientesFiltrados,
  produtosPorCliente,
  notasAgrupadas,
}: AbaClientesProps) {
  const [visao, setVisao] = useState<"sintetico" | "produtos" | "analitico">("sintetico");
  const [clientesSelecionados, setClientesSelecionados] = useState<string[]>([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);

  const clientesPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return clientesFiltrados.slice(inicio, inicio + itensPorPagina);
  }, [clientesFiltrados, paginaAtual, itensPorPagina]);

  function abrirAnaliticoDoCliente(nome: string) {
    setClientesSelecionados([nome]);
    setVisao("analitico");
  }

  return (
    <div className="space-y-4">
      <ReportViewSelector
        view={visao}
        description="Síntese mostra o ranking; produtos detalham o mix comprado; notas mostram os documentos que compõem cada cliente."
        options={[
          { value: "sintetico", label: "Síntese", icon: LayoutList },
          { value: "produtos", label: "Produtos", icon: PackageSearch },
          { value: "analitico", label: "Notas detalhadas", icon: FileText },
        ]}
        onViewChange={(proximaVisao) => {
          setClientesSelecionados([]);
          setVisao(proximaVisao);
        }}
      />

      {visao === "sintetico" ? (
        <>
          {/* Tabela de Ranking de Clientes */}
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[680px] text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
                  <th className="w-16 p-3 text-center">Classe</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Praça (Cidade/UF)</th>
                  <th className="p-3 text-right">Pedidos / NF</th>
                  <th className="p-3 text-right">Qtd Itens</th>
                  <th className="p-3 text-right">Ticket Médio</th>
                  <th className="p-3 text-right">Descontos</th>
                  <th className="p-3 text-right">Total Faturado</th>
                  <th className="p-3 text-right">% Fat.</th>
                  <th className="p-3 text-right">% Acum.</th>
                </tr>
              </thead>
              <tbody>
                {clientesPaginados.map((cli) => (
                  <tr
                    key={cli.nome}
                    onClick={() => abrirAnaliticoDoCliente(cli.nome)}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                    title="Clique para ver as notas (analítico) deste cliente"
                  >
                    <td className="p-3 text-center">
                      <Badge
                        variant={cli.classe === "A" ? "default" : cli.classe === "B" ? "secondary" : "outline"}
                        className={`font-bold ${
                          cli.classe === "A"
                            ? "bg-emerald-600 text-white"
                            : cli.classe === "B"
                              ? "bg-blue-600 text-white"
                              : "text-amber-700 dark:text-amber-400 border-amber-500/40"
                        }`}
                      >
                        {cli.classe}
                      </Badge>
                    </td>
                    <td className="p-3 font-semibold text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {cli.nome}
                        <MousePointerClick className="size-3 text-muted-foreground/60" />
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{cli.cidade} / {cli.uf}</td>
                    <td className="p-3 text-right font-mono">{formatarNumero(cli.pedidos, 0)}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{formatarNumero(cli.quantidadeItens, 2)}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{formatarMoeda(cli.ticketMedio)}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{formatarMoeda(cli.descontos)}</td>
                    <td className="p-3 text-right font-mono font-bold text-foreground">{formatarMoeda(cli.faturamento)}</td>
                    <td className="p-3 text-right">
                      <DataBarPercent
                        valor={formatarPercentual(cli.percentual, 2)}
                        percentual={cli.percentual}
                        cor={cli.classe === "A" ? "bg-emerald-500/20" : cli.classe === "B" ? "bg-blue-500/20" : "bg-amber-500/20"}
                      />
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-primary">
                      {formatarPercentual(cli.percentualAcumulado, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TablePagination
            paginaAtual={paginaAtual}
            totalItens={clientesFiltrados.length}
            itensPorPagina={itensPorPagina}
            onPaginaChange={setPaginaAtual}
            onItensPorPaginaChange={setItensPorPagina}
            labelItens="clientes"
          />
          <p className="text-[11px] text-muted-foreground">
            💡 Clique em um cliente para abrir a visão analítica com as notas dele.
          </p>
        </>
      ) : visao === "produtos" ? (
        <VisaoProdutosPorDimensao itens={produtosPorCliente} dimensaoRotulo="Cliente" dimensaoPlural="clientes" />
      ) : (
        <VisaoAnaliticaNotas
          notas={notasAgrupadas}
          dimensaoChave="cliente"
          dimensaoRotulo="Cliente"
          selecionados={clientesSelecionados}
          onSelecionadosChange={setClientesSelecionados}
          dimensaoTemColunaPropria
          nomeCsvBase="vendas-analitico-cliente"
          onVoltar={() => setVisao("sintetico")}
        />
      )}
    </div>
  );
}
