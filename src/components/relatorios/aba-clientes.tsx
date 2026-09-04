import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import type { ClientesNovosRecorrentes, ConcentracaoTop, ItemClienteAnalise } from "@/lib/vendas";
import { DataBarPercent } from "./data-bar-percent";
import { TablePagination } from "@/components/table-pagination";
import { TermoExplicado } from "@/components/relatorio-guia";

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
}

export function AbaClientes({
  relatorioClientes,
  clientesFiltrados,
  concentracaoTop20,
  novosRecorrentes,
  temPeriodoAnterior,
  frequenciaMediaPedidosPorCliente,
  pedidosNoPeriodo,
}: AbaClientesProps) {
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);

  const clientesPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return clientesFiltrados.slice(inicio, inicio + itensPorPagina);
  }, [clientesFiltrados, paginaAtual, itensPorPagina]);

  return (
    <div className="space-y-4">
      {/* Cards Síntese de Clientes */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-lg border bg-muted/20 p-3">
          <TermoExplicado
            termo="Total de Clientes"
            definicao="Clientes distintos que compraram no período, incluindo consumidor de balcão."
          />
          <div className="mt-1 font-mono font-extrabold text-lg text-foreground">
            {formatarNumero(relatorioClientes.totalClientes, 0)}
          </div>
          <span className="text-[11px] text-muted-foreground">
            Ticket médio: {formatarMoeda(relatorioClientes.ticketMedioPorCliente)}
          </span>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3">
          <TermoExplicado
            termo="Clientes Recorrentes"
            definicao="% dos clientes cadastrados que compraram 2x ou mais dentro do próprio período."
          />
          <div className="mt-1 font-mono font-extrabold text-lg text-primary">
            {formatarPercentual(relatorioClientes.taxaRecorrencia, 1)}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {relatorioClientes.clientesRecorrentes} compraram 2x ou mais
          </span>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3">
          <TermoExplicado
            termo="Concentração Top 5"
            definicao="% do faturamento concentrado nos 5 maiores clientes. Alto = risco de dependência."
          />
          <div className="mt-1 font-mono font-extrabold text-lg text-foreground">
            {formatarPercentual(relatorioClientes.concentracaoTop5, 1)}
          </div>
          <span className="text-[11px] text-muted-foreground">
            dos 5 maiores compradores
          </span>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3">
          <TermoExplicado
            termo="Concentração Top 10"
            definicao="% do faturamento concentrado nos 10 maiores clientes."
          />
          <div className="mt-1 font-mono font-extrabold text-lg text-foreground">
            {formatarPercentual(relatorioClientes.concentracaoTop10, 1)}
          </div>
          <span className="text-[11px] text-muted-foreground">
            dos 10 maiores compradores
          </span>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3">
          <TermoExplicado
            termo="Concentração Top 20"
            definicao="% do faturamento concentrado nos 20 maiores clientes. Quanto mais perto de 100%, mais a receita depende de poucos clientes."
          />
          <div className="mt-1 font-mono font-extrabold text-lg text-foreground">
            {formatarPercentual(concentracaoTop20?.percentualTop ?? 0, 1)}
          </div>
          <span className="text-[11px] text-muted-foreground">
            dos 20 maiores compradores
          </span>
        </div>
      </div>

      {/* Gestão da base: frequência e novos vs. recorrentes */}
      <div className={`grid gap-3 ${temPeriodoAnterior ? "sm:grid-cols-2" : ""}`}>
        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <TermoExplicado
              termo="Frequência média de compra"
              definicao="Total de pedidos/NF do período ÷ clientes cadastrados ativos (exclui consumidor de balcão). Mede quantas vezes, em média, cada cliente compra no período."
            />
            <span className="font-mono text-2xl font-extrabold text-foreground">
              {formatarNumero(frequenciaMediaPedidosPorCliente ?? 0, 1)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            pedidos por cliente ativo
            {typeof pedidosNoPeriodo === "number" && ` · ${formatarNumero(pedidosNoPeriodo, 0)} pedidos no total`}
          </p>
        </div>

        {temPeriodoAnterior ? (
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <TermoExplicado
                termo="Novos vs. Recorrentes"
                definicao="Clientes que compraram agora e já compravam no período anterior (recorrentes) vs. os que compraram pela primeira vez (novos). Consumidor de balcão fica fora."
              />
              <span className="font-mono text-2xl font-extrabold text-primary">
                {formatarPercentual(novosRecorrentes.percentualReceitaRecorrentes, 0)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              da receita de clientes cadastrados vem de <strong>recorrentes</strong> —{" "}
              {formatarNumero(novosRecorrentes.recorrentes, 0)} clientes ({formatarMoeda(novosRecorrentes.receitaRecorrentes)}) vs.{" "}
              {formatarNumero(novosRecorrentes.novos, 0)} novos ({formatarMoeda(novosRecorrentes.receitaNovos)})
            </p>
          </div>
        ) : null}
      </div>

      {/* Tabela de Clientes */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[640px] text-xs">
          <thead>
            <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
              <th className="p-3 w-16 text-center">Classe</th>
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
            {clientesPaginados.map((cli, idx) => (
              <tr key={`${cli.nome}-${idx}`} className="border-b last:border-0 hover:bg-muted/20">
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
                <td className="p-3 font-semibold text-foreground">{cli.nome}</td>
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
                <td className="p-3 text-right font-mono font-semibold text-primary">{formatarPercentual(cli.percentualAcumulado, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação Padrão */}
      <TablePagination
        paginaAtual={paginaAtual}
        totalItens={clientesFiltrados.length}
        itensPorPagina={itensPorPagina}
        onPaginaChange={setPaginaAtual}
        onItensPorPaginaChange={setItensPorPagina}
        labelItens="clientes"
      />
    </div>
  );
}
