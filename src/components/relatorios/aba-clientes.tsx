import { ReportTable } from "./report-table";
import { useMemo, useState } from "react";
import { CalendarDays, FileText, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
} from "@/lib/formatters";
import type { ItemClienteAnalise, VendaAgrupada } from "@/lib/vendas";
import { DataBarPercent } from "./data-bar-percent";
import { ReportViewSelector } from "./report-view-toggle";
import { DetalhamentoClientes } from "./detalhamento-clientes";
import type { Periodo } from "@/lib/periodo";
import { formatarDataInputParaBR } from "@/lib/vendas";
import type { RelatorioFrequencia } from "@/lib/clientes-frequencia";
import { VisaoFrequenciaClientes } from "./visao-frequencia-clientes";
import { ExportarVisao, type ContextoExportacao } from "./exportar-visao";
import { FiltroRelatorio } from "./filtro-relatorio";

interface AbaClientesProps {
  clientesFiltrados: ItemClienteAnalise[];
  notasAnteriores: VendaAgrupada[];
  intervaloAnterior: Periodo | null;
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
  notasAnteriores,
  intervaloAnterior,
  notasAgrupadas,
  frequencia,
  busca,
  classe,
  contexto,
  periodoAnterior,
}: AbaClientesProps) {
  const [visao, setVisao] = useState<"sintetico" | "analitico" | "frequencia">(
    "sintetico",
  );
  const [origem, setOrigem] = useState<"sintetico" | "frequencia">("sintetico");
  const [mesDetalhe, setMesDetalhe] = useState("");
  const [janelaDetalhe, setJanelaDetalhe] = useState<"atual" | "anterior">(
    "atual",
  );
  const [ordem, setOrdem] = useState("faturamento");
  const [clientesSelecionados, setClientesSelecionados] = useState<string[]>(
    [],
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
  const notasAnterioresFiltradas = useMemo(() => {
    const termo = busca.toLocaleUpperCase("pt-BR").trim();
    return notasAnteriores.filter(
      (nota) =>
        (classe === "todas" || nomesFiltrados.has(nota.cliente)) &&
        (!termo ||
          [nota.cliente, nota.cidade, nota.uf].some((valor) =>
            valor.toLocaleUpperCase("pt-BR").includes(termo),
          )),
    );
  }, [notasAnteriores, nomesFiltrados, classe, busca]);
  const notasFiltradas = useMemo(
    () => notasAgrupadas.filter((item) => nomesFiltrados.has(item.cliente)),
    [notasAgrupadas, nomesFiltrados],
  );
  function abrirAnaliticoDoCliente(nome: string, mes?: string) {
    setClientesSelecionados([nome]);
    setOrigem(visao === "frequencia" ? "frequencia" : "sintetico");
    setMesDetalhe(mes ?? "");
    setJanelaDetalhe(
      !mes && frequenciaPorNome.get(nome)?.situacao === "sem-compra"
        ? "anterior"
        : "atual",
    );
    setVisao("analitico");
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Identificação por nome, sujeita a homônimos. Consumidor genérico não
        entra na frequência.
      </p>
      <ReportViewSelector
        view={visao}
        options={[
          { value: "sintetico", label: "Resumo", icon: LayoutList },
          {
            value: "frequencia",
            label: "Frequência",
            icon: CalendarDays,
          },
          { value: "analitico", label: "Detalhamento", icon: FileText },
        ]}
        onViewChange={(proximaVisao) => {
          if (proximaVisao === "analitico" && visao !== "analitico")
            setOrigem(visao);
          setVisao(proximaVisao);
        }}
      />

      <div hidden={visao !== "sintetico"}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <FiltroRelatorio
              rotulo="Ordenar clientes"
              valor={ordem}
              onChange={(valor) => {
                setOrdem(valor);
              }}
              opcoes={[
                { valor: "faturamento", rotulo: "Maior faturamento" },
                { valor: "ticket", rotulo: "Maior ticket médio" },
                { valor: "frequencia", rotulo: "Mais dias com compra" },
                { valor: "ultima", rotulo: "Compra mais recente" },
              ]}
            />
            <ExportarVisao
              titulo="Clientes - Resumo"
              contexto={contexto}
              observacoes="Classe e participação calculadas sobre toda a carteira do período. Dias com compra excluem consumidor genérico. Clientes agrupados pelo nome. Acumulado segue o ranking original de faturamento."
              colunas={[
                "Cliente",
                "Classe",
                "Cidade/UF",
                "Notas",
                "Dias com compra",
                "Última compra",
                "SKUs distintos",
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
                  formatarNumero(cli.produtosDistintos, 0),
                  formatarMoeda(cli.ticketMedio),
                  formatarMoeda(cli.descontos),
                  formatarMoeda(cli.faturamento),
                  formatarPercentual(cli.percentual, 2),
                  formatarPercentual(cli.percentualAcumulado, 1),
                ];
              })}
            />
          </div>
          {/* Ranking de clientes no padrão único de relatórios */}
          <ReportTable
            data={clientesOrdenados}
            rowKey={(cli) => cli.nome}
            label="clientes"
            caption="Ranking de clientes"
            showExport={false}
            columns={[
              {
                id: "classe",
                header: "Classe",
                kind: "number",
                value: (cli) => cli.classe,
                cell: (cli) => (
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
                ),
              },
              {
                id: "cliente",
                header: "Cliente",
                kind: "name",
                value: (cli) => cli.nome,
                cell: (cli) => (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => abrirAnaliticoDoCliente(cli.nome)}
                  >
                    {cli.nome}
                  </Button>
                ),
              },
              {
                id: "praca",
                header: "Praça (Cidade/UF)",
                kind: "name",
                value: (cli) => `${cli.cidade} / ${cli.uf}`,
                cell: (cli) => <>{cli.cidade} / {cli.uf}</>,
              },
              {
                id: "notas",
                header: "Notas",
                kind: "number",
                value: (cli) => cli.pedidos,
                cell: (cli) => <>{formatarNumero(cli.pedidos, 0)}</>,
              },
              {
                id: "dias-compra",
                header: "Dias com compra",
                kind: "number",
                value: (cli) => frequenciaPorNome.get(cli.nome)?.diasComCompra ?? null,
                cell: (cli) => <>{frequenciaPorNome.get(cli.nome)?.diasComCompra ?? "—"}</>,
              },
              {
                id: "ultima-compra",
                header: "Última compra",
                kind: "date",
                value: (cli) => frequenciaPorNome.get(cli.nome)?.ultimaCompra ?? null,
                exportValue: (cli) => {
                  const data = frequenciaPorNome.get(cli.nome)?.ultimaCompra;
                  return data ? formatarDataInputParaBR(data) : "—";
                },
                cell: (cli) => {
                  const data = frequenciaPorNome.get(cli.nome)?.ultimaCompra;
                  return <>{data ? formatarDataInputParaBR(data) : "—"}</>;
                },
              },
              {
                id: "produtosDistintos",
                header: "SKUs distintos",
                kind: "number",
                value: (cli) => cli.produtosDistintos,
                cell: (cli) => <>{formatarNumero(cli.produtosDistintos, 0)}</>,
              },
              {
                id: "ticket",
                header: "Ticket Médio",
                kind: "currency",
                value: (cli) => cli.ticketMedio,
                cell: (cli) => <>{formatarMoeda(cli.ticketMedio)}</>,
              },
              {
                id: "descontos",
                header: "Descontos",
                kind: "currency",
                value: (cli) => cli.descontos,
                cell: (cli) => <>{formatarMoeda(cli.descontos)}</>,
              },
              {
                id: "faturamento",
                header: "Total Faturado",
                kind: "currency",
                value: (cli) => cli.faturamento,
                cell: (cli) => <strong>{formatarMoeda(cli.faturamento)}</strong>,
              },
              {
                id: "percentual",
                header: "% Fat.",
                kind: "number",
                value: (cli) => cli.percentual,
                exportValue: (cli) => formatarPercentual(cli.percentual, 2),
                cell: (cli) => (
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
                ),
              },
              {
                id: "acumulado",
                header: "% Acum.",
                kind: "number",
                value: (cli) => cli.percentualAcumulado,
                exportValue: (cli) => formatarPercentual(cli.percentualAcumulado, 1),
                cell: (cli) => (
                  <span className="font-semibold text-primary">
                    {formatarPercentual(cli.percentualAcumulado, 1)}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </div>
      <div hidden={visao !== "frequencia"}>
        <VisaoFrequenciaClientes
          relatorio={frequencia}
          busca={busca}
          classe={classe}
          contexto={contexto}
          periodoAnterior={periodoAnterior}
          onAbrirNotas={abrirAnaliticoDoCliente}
        />
      </div>
      <div hidden={visao !== "analitico"}>
        <DetalhamentoClientes
          notas={notasFiltradas}
          anteriores={notasAnterioresFiltradas}
          clientes={frequencia.itens}
          contexto={contexto}
          periodoAnterior={intervaloAnterior}
          comparacaoDisponivel={frequencia.comparar}
          selecionados={clientesSelecionados}
          onSelecionados={setClientesSelecionados}
          mes={mesDetalhe}
          onMes={setMesDetalhe}
          janela={janelaDetalhe}
          onJanela={setJanelaDetalhe}
          onVoltar={() => setVisao(origem)}
          rotuloVoltar={
            origem === "frequencia" ? "Voltar à frequência" : "Voltar ao resumo"
          }
        />
      </div>
    </div>
  );
}
