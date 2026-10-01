import { useMemo, useState } from "react";
import {
  CalendarDays,
  FileText,
  LayoutList,
  PackageSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
} from "@/lib/formatters";
import type {
  ItemClienteAnalise,
  ItemProdutoPorDimensao,
  VendaAgrupada,
} from "@/lib/vendas";
import { DataBarPercent } from "./data-bar-percent";
import { TablePagination } from "@/components/table-pagination";
import { VisaoAnaliticaNotas } from "./visao-analitica-notas";
import { ReportViewSelector } from "./report-view-toggle";
import { VisaoProdutosPorDimensao } from "./visao-produtos-por-dimensao";
import { formatarDataInputParaBR } from "@/lib/vendas";
import type { RelatorioFrequencia } from "@/lib/clientes-frequencia";
import { VisaoFrequenciaClientes } from "./visao-frequencia-clientes";
import { ExportarVisao, type ContextoExportacao } from "./exportar-visao";
import { FiltroRelatorio } from "./filtro-relatorio";

interface AbaClientesProps {
  clientesFiltrados: ItemClienteAnalise[];
  produtosPorCliente: ItemProdutoPorDimensao[];
  /** Notas do período (agrupadas por NF), usadas na visão analítica. */
  notasAgrupadas: VendaAgrupada[];
  frequencia: RelatorioFrequencia;
  busca: string;
  classe: string;
  contexto: ContextoExportacao;
  periodoAnterior?: string;
}

export function AbaClientes({
  clientesFiltrados,
  produtosPorCliente,
  notasAgrupadas,
  frequencia,
  busca,
  classe,
  contexto,
  periodoAnterior,
}: AbaClientesProps) {
  const [visao, setVisao] = useState<
    "sintetico" | "produtos" | "analitico" | "frequencia"
  >("sintetico");
  const [ordem, setOrdem] = useState("faturamento");
  const [clientesSelecionados, setClientesSelecionados] = useState<string[]>(
    [],
  );
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);
  const paginaExibida = Math.min(
    paginaAtual,
    Math.max(1, Math.ceil(clientesFiltrados.length / itensPorPagina)),
  );

  const frequenciaPorNome = useMemo(
    () => new Map(frequencia.itens.map((item) => [item.nome, item])),
    [frequencia],
  );
  const clientesOrdenados = useMemo(
    () =>
      [...clientesFiltrados].sort((a, b) => {
        if (ordem === "ticket") return b.ticketMedio - a.ticketMedio;
        if (ordem === "frequencia")
          return (
            (frequenciaPorNome.get(b.nome)?.diasComCompra ?? -1) -
            (frequenciaPorNome.get(a.nome)?.diasComCompra ?? -1)
          );
        if (ordem === "ultima")
          return (
            frequenciaPorNome.get(b.nome)?.ultimaCompra ?? ""
          ).localeCompare(frequenciaPorNome.get(a.nome)?.ultimaCompra ?? "");
        return b.faturamento - a.faturamento;
      }),
    [clientesFiltrados, ordem, frequenciaPorNome],
  );
  const nomesFiltrados = useMemo(
    () => new Set(clientesFiltrados.map((item) => item.nome)),
    [clientesFiltrados],
  );
  const produtosFiltrados = useMemo(
    () =>
      produtosPorCliente.filter((item) => nomesFiltrados.has(item.dimensao)),
    [produtosPorCliente, nomesFiltrados],
  );
  const notasFiltradas = useMemo(
    () => notasAgrupadas.filter((item) => nomesFiltrados.has(item.cliente)),
    [notasAgrupadas, nomesFiltrados],
  );
  const clientesPaginados = useMemo(() => {
    const inicio = (paginaExibida - 1) * itensPorPagina;
    return clientesOrdenados.slice(inicio, inicio + itensPorPagina);
  }, [clientesOrdenados, paginaExibida, itensPorPagina]);

  function abrirAnaliticoDoCliente(nome: string) {
    setClientesSelecionados([nome]);
    setVisao("analitico");
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Clientes agrupados pelo nome, padronizando maiúsculas e espaços. A
        integração atual não fornece identificação estável nesta análise:
        homônimos podem ser agrupados, inclusive entre empresas. Consumidor
        genérico permanece no faturamento, mas não representa uma pessoa na
        frequência.
      </p>
      <ReportViewSelector
        view={visao}
        description="Ranking, frequência de compra, mix e documentos da carteira."
        options={[
          { value: "sintetico", label: "Síntese", icon: LayoutList },
          {
            value: "frequencia",
            label: "Frequência e comparativo",
            icon: CalendarDays,
          },
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <FiltroRelatorio
              rotulo="Ordenar clientes"
              valor={ordem}
              onChange={(valor) => {
                setOrdem(valor);
                setPaginaAtual(1);
              }}
              opcoes={[
                { valor: "faturamento", rotulo: "Maior faturamento" },
                { valor: "ticket", rotulo: "Maior ticket médio" },
                { valor: "frequencia", rotulo: "Mais dias com compra" },
                { valor: "ultima", rotulo: "Compra mais recente" },
              ]}
            />
            <ExportarVisao
              titulo="Clientes - Síntese"
              contexto={contexto}
              observacoes="Classe e participação calculadas sobre toda a carteira do período. Dias com compra excluem consumidor genérico. Clientes agrupados pelo nome. Acumulado segue o ranking original de faturamento."
              colunas={[
                "Cliente",
                "Classe",
                "Cidade/UF",
                "Notas",
                "Dias com compra",
                "Última compra",
                "Qtd itens",
                "Ticket médio",
                "Descontos",
                "Faturamento",
                "% faturamento",
                "% acumulado",
              ]}
              linhas={clientesOrdenados.map((cli) => {
                const freq = frequenciaPorNome.get(cli.nome);
                return [
                  cli.nome,
                  cli.classe,
                  `${cli.cidade}/${cli.uf}`,
                  cli.pedidos,
                  freq?.diasComCompra ?? "—",
                  freq?.ultimaCompra
                    ? formatarDataInputParaBR(freq.ultimaCompra)
                    : "—",
                  formatarNumero(cli.quantidadeItens, 2),
                  formatarMoeda(cli.ticketMedio),
                  formatarMoeda(cli.descontos),
                  formatarMoeda(cli.faturamento),
                  formatarPercentual(cli.percentual, 2),
                  formatarPercentual(cli.percentualAcumulado, 1),
                ];
              })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Classe ABC, participação e acumulado usam o ranking completo por
            faturamento, mesmo após filtrar ou reordenar. Ticket médio por nota.
            — na frequência indica consumidor genérico ou data indisponível.
          </p>
          {/* Tabela de Ranking de Clientes */}
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[680px] text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
                  <th className="w-16 p-3 text-center">Classe</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Praça (Cidade/UF)</th>
                  <th className="p-3 text-right">Notas</th>
                  <th className="p-3 text-right">Dias com compra</th>
                  <th className="p-3">Última compra</th>
                  <th className="p-3 text-right">Qtd Itens</th>
                  <th className="p-3 text-right">Ticket Médio</th>
                  <th className="p-3 text-right">Descontos</th>
                  <th className="p-3 text-right">Total Faturado</th>
                  <th className="p-3 text-right">% Fat.</th>
                  <th className="p-3 text-right">% Acum.</th>
                </tr>
              </thead>
              <tbody>
                {clientesPaginados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="p-8 text-center text-muted-foreground"
                    >
                      Nenhum cliente encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : null}
                {clientesPaginados.map((cli) => (
                  <tr
                    key={cli.nome}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="p-3 text-center">
                      <Badge
                        variant={
                          cli.classe === "A"
                            ? "default"
                            : cli.classe === "B"
                              ? "secondary"
                              : "outline"
                        }
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
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => abrirAnaliticoDoCliente(cli.nome)}
                      >
                        {cli.nome}
                      </Button>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {cli.cidade} / {cli.uf}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {formatarNumero(cli.pedidos, 0)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {frequenciaPorNome.get(cli.nome)?.diasComCompra ?? "—"}
                    </td>
                    <td className="whitespace-nowrap p-3">
                      {frequenciaPorNome.get(cli.nome)?.ultimaCompra
                        ? formatarDataInputParaBR(
                            frequenciaPorNome.get(cli.nome)!.ultimaCompra!,
                          )
                        : "—"}
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {formatarNumero(cli.quantidadeItens, 2)}
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {formatarMoeda(cli.ticketMedio)}
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {formatarMoeda(cli.descontos)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-foreground">
                      {formatarMoeda(cli.faturamento)}
                    </td>
                    <td className="p-3 text-right">
                      <DataBarPercent
                        valor={formatarPercentual(cli.percentual, 2)}
                        percentual={cli.percentual}
                        cor={
                          cli.classe === "A"
                            ? "bg-emerald-500/20"
                            : cli.classe === "B"
                              ? "bg-blue-500/20"
                              : "bg-amber-500/20"
                        }
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
            paginaAtual={paginaExibida}
            totalItens={clientesFiltrados.length}
            itensPorPagina={itensPorPagina}
            onPaginaChange={setPaginaAtual}
            onItensPorPaginaChange={(valor) => {
              setItensPorPagina(valor);
              setPaginaAtual(1);
            }}
            labelItens="clientes"
          />
          <p className="text-[11px] text-muted-foreground">
            💡 Clique em um cliente para abrir a visão analítica com as notas
            dele.
          </p>
        </>
      ) : visao === "frequencia" ? (
        <VisaoFrequenciaClientes
          relatorio={frequencia}
          busca={busca}
          classe={classe}
          contexto={contexto}
          periodoAnterior={periodoAnterior}
          onAbrirNotas={abrirAnaliticoDoCliente}
        />
      ) : visao === "produtos" ? (
        <VisaoProdutosPorDimensao
          key={`${busca}-${classe}`}
          itens={produtosFiltrados}
          dimensaoRotulo="Cliente"
          dimensaoPlural="clientes"
          contextoExportacao={contexto}
        />
      ) : (
        <VisaoAnaliticaNotas
          key={`${busca}-${classe}`}
          notas={notasFiltradas}
          contextoExportacao={contexto}
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
