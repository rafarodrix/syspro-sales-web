import { DataBarPercent } from "./data-bar-percent";
import { ReportTable } from "./report-table";
import { useMemo, useState } from "react";
import { ArrowLeftRight, FileText, LayoutList, Map, MousePointerClick } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
} from "@/lib/formatters";
import type {
  ItemGeograficoAnalise,
  ItemUFVendas,
  VendaAgrupada,
} from "@/lib/vendas";
import { VisaoAnaliticaNotas } from "./visao-analitica-notas";
import { ReportViewSelector } from "./report-view-toggle";
import { ReportBarraVisao, ReportVisaoProvider } from "./report-barra";
import { VisaoComparativoDimensao } from "./visao-comparativo-dimensao";

export function AbaGeografico({
  cidadesFiltradas,
  ufsFiltradas,
  notasAgrupadas,
  ufsAnteriores = [],
  comparacaoDisponivel = false,
  rotuloPeriodoAnterior,
}: {
  cidadesFiltradas: ItemGeograficoAnalise[];
  ufsFiltradas: ItemUFVendas[];
  notasAgrupadas: VendaAgrupada[];
  ufsAnteriores?: ItemUFVendas[];
  comparacaoDisponivel?: boolean;
  rotuloPeriodoAnterior?: string;
}) {
  const [visao, setVisao] = useState<"uf" | "cidade" | "comparativo" | "analitico">("uf");
  const [uf, setUf] = useState<string | null>(null);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const cidades = useMemo(
    () =>
      uf
        ? cidadesFiltradas.filter((cidade) => cidade.uf === uf)
        : cidadesFiltradas,
    [cidadesFiltradas, uf],
  );
  const abrirCidade = (cidade: string) => {
    setSelecionadas([cidade]);
    setVisao("analitico");
  };
  const seletorVisao = (
      <ReportViewSelector
        view={visao}
        options={[
          { value: "uf", label: "Estados", icon: Map },
          { value: "cidade", label: "Cidades", icon: LayoutList },
          { value: "comparativo", label: "Comparativo", icon: ArrowLeftRight },
          { value: "analitico", label: "Detalhamento", icon: FileText },
        ]}
        onViewChange={(proximaVisao) => {
          if (proximaVisao === "uf") setUf(null);
          if (proximaVisao === "analitico") setSelecionadas([]);
          setVisao(proximaVisao);
        }}
      />
  );

  const barraVisao = (
    <ReportBarraVisao>{seletorVisao}</ReportBarraVisao>
  );

  return (
    <ReportVisaoProvider>
    <div className="space-y-4">
      {barraVisao}

      {visao === "comparativo" ? (
        <VisaoComparativoDimensao
          rotuloDimensao="UF"
          itensAtuais={ufsFiltradas.map((item) => ({ nome: item.uf, faturamento: item.faturamento }))}
          itensAnteriores={ufsAnteriores.map((item) => ({ nome: item.uf, faturamento: item.faturamento }))}
          comparacaoDisponivel={comparacaoDisponivel}
          rotuloPeriodoAnterior={rotuloPeriodoAnterior}
        />
      ) : null}

      {visao === "analitico" ? (
        <VisaoAnaliticaNotas
          notas={notasAgrupadas}
          dimensaoChave="cidade"
          dimensaoRotulo="Cidade"
          selecionados={selecionadas}
          onSelecionadosChange={setSelecionadas}
          nomeCsvBase="vendas-analitico-cidade"
          onVoltar={() => setVisao(uf ? "cidade" : "uf")}
        />
      ) : visao === "uf" ? (
        <ReportTable
          caption="Resumo por UF"
          data={ufsFiltradas}
          rowKey={(item) => item.uf}
          columns={[
            {
              id: "uf",
              header: <>UF</>,
              kind: "name",
              value: (item) => item.uf,
              cell: (item) => (
                <button
                  type="button"
                  onClick={() => {
                    setUf(item.uf);
                    setVisao("cidade");
                  }}
                  className="inline-flex items-center gap-1 text-left hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <Badge variant="outline">{item.uf}</Badge>
                  <MousePointerClick className="size-3" />
                </button>
              ),
            },
            {
              id: "cidades",
              header: <>Cidades</>,
              kind: "number",
              value: (item) => item.cidades,
              cell: (item) => <>{item.cidades}</>,
            },
            {
              id: "pedidos",
              header: <>Pedidos</>,
              kind: "number",
              value: (item) => item.pedidos,
              cell: (item) => <>{item.pedidos}</>,
            },
            {
              id: "clientes",
              header: <>Clientes</>,
              kind: "number",
              value: (item) => item.clientes,
              cell: (item) => <>{item.clientes}</>,
            },
            {
              id: "ticketMedio",
              header: <>Ticket médio</>,
              kind: "currency",
              value: (item) => item.ticketMedio,
              cell: (item) => <>{formatarMoeda(item.ticketMedio)}</>,
            },
            {
              id: "frete",
              header: <>Frete</>,
              kind: "currency",
              value: (item) => item.frete,
              cell: (item) => <>{formatarMoeda(item.frete)}</>,
            },
            {
              id: "faturamento",
              header: <>Faturamento</>,
              kind: "currency",
              value: (item) => item.faturamento,
              cell: (item) => <>{formatarMoeda(item.faturamento)}</>,
            },
            {
              id: "lucroBruto",
              header: <>Lucro bruto</>,
              kind: "currency",
              value: (item) => item.lucroBruto,
              cell: (item) => <>{formatarMoeda(item.lucroBruto)}</>,
            },
            {
              id: "margemBruta",
              header: <>Margem</>,
              kind: "percent",
              value: (item) => item.margemBruta,
              cell: (item) => item.coberturaCusto > 0
                ? <>{formatarPercentual(item.margemBruta, 1)}</>
                : <>—</>,
            },
            {
              id: "percentual",
              header: <>Participação</>,
              kind: "percent",
              value: (item) => item.percentual,
              cell: (item) => (
                <DataBarPercent
                  valor={formatarPercentual(item.percentual, 1)}
                  percentual={item.percentual}
                />
              ),
            },
          ]}
        />
      ) : visao === "cidade" ? (
        <>
          {uf ? (
            <Button
              size="sm"
              variant="secondary"
              aria-label="Remover filtro de estado"
              onClick={() => setUf(null)}
            >
              {uf} ×
            </Button>
          ) : null}
          <ReportTable
            data={cidades}
            rowKey={(cidade) => `${cidade.cidade}-${cidade.uf}`}
            columns={[
              {
                id: "cidade",
                header: <>Cidade</>,
                kind: "name",
                value: (cidade) => cidade.cidade,
                cell: (cidade) => (
                  <button
                    type="button"
                    onClick={() => abrirCidade(cidade.cidade)}
                    className="inline-flex items-center gap-1 text-left hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {cidade.cidade}
                    <MousePointerClick className="size-3" />
                  </button>
                ),
              },
              {
                id: "uf",
                header: <>UF</>,
                kind: "number",
                value: (cidade) => cidade.uf,
                cell: (cidade) => (
                  <>
                    <Badge variant="outline">{cidade.uf}</Badge>
                  </>
                ),
              },
              {
                id: "pedidos",
                header: <>Pedidos</>,
                kind: "number",
                value: (cidade) => cidade.pedidos,
                cell: (cidade) => <>{formatarNumero(cidade.pedidos, 0)}</>,
              },
              {
                id: "clientes",
                header: <>Clientes</>,
                kind: "number",
                value: (cidade) => cidade.clientes,
                cell: (cidade) => <>{formatarNumero(cidade.clientes, 0)}</>,
              },
              {
                id: "ticketMedio",
                header: <>Ticket médio</>,
                kind: "currency",
                value: (cidade) => cidade.ticketMedio,
                cell: (cidade) => <>{formatarMoeda(cidade.ticketMedio)}</>,
              },
              {
                id: "frete",
                header: <>Frete</>,
                kind: "currency",
                value: (cidade) => cidade.frete,
                cell: (cidade) => <>{formatarMoeda(cidade.frete)}</>,
              },
              {
                id: "faturamento",
                header: <>Faturamento</>,
                kind: "currency",
                value: (cidade) => cidade.faturamento,
                cell: (cidade) => <>{formatarMoeda(cidade.faturamento)}</>,
              },
              {
                id: "lucroBruto",
                header: <>Lucro bruto</>,
                kind: "currency",
                value: (cidade) => cidade.lucroBruto,
                cell: (cidade) => <>{formatarMoeda(cidade.lucroBruto)}</>,
              },
              {
                id: "margemBruta",
                header: <>Margem</>,
                kind: "percent",
                value: (cidade) => cidade.margemBruta,
                cell: (cidade) => cidade.coberturaCusto > 0
                  ? <>{formatarPercentual(cidade.margemBruta, 1)}</>
                  : <>—</>,
              },
              {
                id: "percentual",
                header: <>Participação</>,
                kind: "percent",
                value: (cidade) => cidade.percentual,
                cell: (cidade) => (
                  <DataBarPercent
                    valor={formatarPercentual(cidade.percentual, 1)}
                    percentual={cidade.percentual}
                  />
                ),
              },
            ]}
          />
        </>
      ) : null}
    </div>
    </ReportVisaoProvider>
  );
}
