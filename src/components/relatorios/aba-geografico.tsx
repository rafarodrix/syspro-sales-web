import { DataBarPercent } from "./data-bar-percent";
import { ReportTable } from "./report-table";
import { useMemo, useState } from "react";
import { FileText, LayoutList, Map, MousePointerClick } from "lucide-react";
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

export function AbaGeografico({
  cidadesFiltradas,
  ufsFiltradas,
  notasAgrupadas,
}: {
  cidadesFiltradas: ItemGeograficoAnalise[];
  ufsFiltradas: ItemUFVendas[];
  notasAgrupadas: VendaAgrupada[];
}) {
  const [visao, setVisao] = useState<"uf" | "cidade" | "analitico">("uf");
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
  return (
    <div className="space-y-4">
      <ReportViewSelector
        view={visao}
        options={[
          { value: "uf", label: "Estados", icon: Map },
          { value: "cidade", label: "Cidades", icon: LayoutList },
          { value: "analitico", label: "Detalhamento", icon: FileText },
        ]}
        onViewChange={(proximaVisao) => {
          if (proximaVisao === "uf") setUf(null);
          if (proximaVisao === "analitico") setSelecionadas([]);
          setVisao(proximaVisao);
        }}
      />
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
          onRowClick={(item) => {
            (() => {
              setUf(item.uf);
              setVisao("cidade");
            })();
          }}
          columns={[
            {
              id: "uf",
              header: <>UF</>,
              kind: "name",
              value: (item) => item.uf,
              cell: (item) => (
                <>
                  <Badge variant="outline">{item.uf}</Badge>{" "}
                  <MousePointerClick className="ml-1 inline size-3" />
                </>
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
      ) : (
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
            onRowClick={(cidade) => {
              (() => abrirCidade(cidade.cidade))();
            }}
            columns={[
              {
                id: "cidade",
                header: <>Cidade</>,
                kind: "name",
                value: (cidade) => cidade.cidade,
                cell: (cidade) => (
                  <>
                    {cidade.cidade}{" "}
                    <MousePointerClick className="ml-1 inline size-3" />
                  </>
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
      )}
    </div>
  );
}
