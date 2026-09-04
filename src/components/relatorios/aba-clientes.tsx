import { useMemo, useState } from "react";
import { FileText, LayoutList, MousePointerClick } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import type {
  ClientesNovosRecorrentes,
  ConcentracaoTop,
  ItemClienteAnalise,
  VendaAgrupada,
} from "@/lib/vendas";
import { DataBarPercent } from "./data-bar-percent";
import { TablePagination } from "@/components/table-pagination";
import { TermoExplicado } from "@/components/relatorio-guia";
import { MetricaCard } from "@/components/metrica-card";
import { VisaoAnaliticaNotas } from "./visao-analitica-notas";

interface AbaClientesProps {
  relatorioClientes: {
    totalClientes: number;
    clientesRecorrentes: number;
    taxaRecorrencia: number;
    concentracaoTop5: number;
    concentracaoTop10: number;
    ticketMedioPorCliente: number;
  };
  clientesFiltrados: ItemClienteAnalise[];
  concentracaoTop20: ConcentracaoTop | null;
  novosRecorrentes: ClientesNovosRecorrentes;
  temPeriodoAnterior: boolean;
  frequenciaMediaPedidosPorCliente?: number;
  pedidosNoPeriodo?: number;
  /** Notas do período (agrupadas por NF), usadas na visão analítica. */
  notasAgrupadas: VendaAgrupada[];
}

const estiloBotaoVisao = (ativo: boolean) =>
  `flex h-7 items-center gap-1 px-2 text-[11px] font-semibold transition-colors ${
    ativo ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
  }`;

export function AbaClientes({
  relatorioClientes,
  clientesFiltrados,
  concentracaoTop20,
  novosRecorrentes,
  temPeriodoAnterior,
  frequenciaMediaPedidosPorCliente,
  pedidosNoPeriodo,
  notasAgrupadas,
}: AbaClientesProps) {
  const [visao, setVisao] = useState<"sintetico" | "analitico">("sintetico");
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
      {/* Cards Síntese de Clientes */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricaCard
          rotulo="Total de Clientes"
          definicao="Clientes distintos que compraram no período, incluindo consumidor de balcão."
          valor={formatarNumero(relatorioClientes.totalClientes, 0)}
          rodape={`Ticket médio: ${formatarMoeda(relatorioClientes.ticketMedioPorCliente)}`}
        />
        <MetricaCard
          rotulo="Clientes Recorrentes"
          definicao="% dos clientes cadastrados que compraram 2x ou mais dentro do próprio período."
          valor={formatarPercentual(relatorioClientes.taxaRecorrencia, 1)}
          destaque="primario"
          rodape={`${relatorioClientes.clientesRecorrentes} compraram 2x ou mais`}
        />
        <MetricaCard
          rotulo="Concentração Top 5"
          definicao="% do faturamento concentrado nos 5 maiores clientes. Alto = risco de dependência."
          valor={formatarPercentual(relatorioClientes.concentracaoTop5, 1)}
          rodape="dos 5 maiores compradores"
        />
        <MetricaCard
          rotulo="Concentração Top 10"
          definicao="% do faturamento concentrado nos 10 maiores clientes."
          valor={formatarPercentual(relatorioClientes.concentracaoTop10, 1)}
          rodape="dos 10 maiores compradores"
        />
        <MetricaCard
          rotulo="Concentração Top 20"
          definicao="% do faturamento concentrado nos 20 maiores clientes. Quanto mais perto de 100%, mais a receita depende de poucos clientes."
          valor={formatarPercentual(concentracaoTop20?.percentualTop ?? 0, 1)}
          rodape="dos 20 maiores compradores"
        />
      </div>

      {/* Gestão da base: frequência e novos vs. recorrentes */}
      <div className={`grid grid-cols-1 gap-3 ${temPeriodoAnterior ? "sm:grid-cols-2" : ""}`}>
        <MetricaCard
          rotulo="Frequência média de compra"
          definicao="Total de pedidos/NF do período ÷ clientes cadastrados ativos (exclui consumidor de balcão). Mede quantas vezes, em média, cada cliente compra no período."
          valor={formatarNumero(frequenciaMediaPedidosPorCliente ?? 0, 1)}
          rodape={
            <>
              pedidos por cliente ativo
              {typeof pedidosNoPeriodo === "number" && ` · ${formatarNumero(pedidosNoPeriodo, 0)} pedidos no total`}
            </>
          }
        />

        {temPeriodoAnterior ? (
          <MetricaCard
            rotulo="Novos vs. Recorrentes"
            definicao="Clientes que compraram agora e já compravam no período anterior (recorrentes) vs. os que compraram pela primeira vez (novos). Consumidor de balcão fica fora."
            valor={formatarPercentual(novosRecorrentes.percentualReceitaRecorrentes, 0)}
            destaque="primario"
            rodape={
              <>
                da receita de clientes cadastrados vem de <strong>recorrentes</strong> —{" "}
                {formatarNumero(novosRecorrentes.recorrentes, 0)} clientes ({formatarMoeda(novosRecorrentes.receitaRecorrentes)}) vs.{" "}
                {formatarNumero(novosRecorrentes.novos, 0)} novos ({formatarMoeda(novosRecorrentes.receitaNovos)})
              </>
            }
          />
        ) : null}
      </div>

      {/* Alternador de visão: ranking de clientes vs. notas por cliente */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TermoExplicado
          termo="Visões do relatório"
          definicao="Sintético: ranking de clientes com concentração. Analítico: as notas/NF de cada cliente. Clique em um cliente do ranking para abrir as notas dele."
        />
        <div className="flex items-center gap-0.5 rounded-lg border bg-muted/20 p-0.5">
          <Button
            type="button"
            variant="ghost"
            className={estiloBotaoVisao(visao === "sintetico")}
            onClick={() => setVisao("sintetico")}
          >
            <LayoutList className="size-3.5" />
            Sintético
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={estiloBotaoVisao(visao === "analitico")}
            onClick={() => {
              setClientesSelecionados([]);
              setVisao("analitico");
            }}
          >
            <FileText className="size-3.5" />
            Analítico
          </Button>
        </div>
      </div>

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
