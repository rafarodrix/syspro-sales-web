import { ReportTable } from "./report-table";
import { useState } from "react";
import {
  FileText,
  LayoutList,
  MousePointerClick,
  PackageSearch,
} from "lucide-react";
import {
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
} from "@/lib/formatters";
import { DataBarPercent } from "./data-bar-percent";
import { VisaoAnaliticaNotas } from "./visao-analitica-notas";
import { ReportViewSelector } from "./report-view-toggle";
import type {
  ItemProdutoPorDimensao,
  ItemVendedorAnalise,
  VendaAgrupada,
} from "@/lib/vendas";
import { VisaoProdutosPorDimensao } from "./visao-produtos-por-dimensao";

type VisaoVendedores = "sintetico" | "produtos" | "analitico";

interface AbaVendedoresProps {
  vendedoresFiltrados: ItemVendedorAnalise[];
  produtosPorVendedor: ItemProdutoPorDimensao[];
  /** Notas do período (agrupadas por NF), usadas na visão analítica. */
  notasAgrupadas: VendaAgrupada[];
}

export function AbaVendedores({
  vendedoresFiltrados,
  produtosPorVendedor,
  notasAgrupadas,
}: AbaVendedoresProps) {
  const [visao, setVisao] = useState<VisaoVendedores>("sintetico");
  const [vendedoresSelecionados, setVendedoresSelecionados] = useState<
    string[]
  >([]);

  function abrirAnaliticoDoVendedor(nome: string) {
    setVendedoresSelecionados([nome]);
    setVisao("analitico");
  }

  return (
    <div className="space-y-4">
      <ReportViewSelector
        view={visao}
        options={[
          { value: "sintetico", label: "Resumo", icon: LayoutList },
          { value: "produtos", label: "Produtos", icon: PackageSearch },
          { value: "analitico", label: "Detalhamento", icon: FileText },
        ]}
        onViewChange={(proximaVisao) => {
          setVendedoresSelecionados([]);
          setVisao(proximaVisao);
        }}
      />

      {visao === "sintetico" ? (
        <>
          {/* Tabela de Ranking Sintético */}
          <ReportTable
            caption="Resumo por vendedor"
            data={vendedoresFiltrados}
            rowKey={(vendedor) => vendedor.nome}
            columns={[
              {
                id: "nome",
                header: <>Vendedor</>,
                kind: "name",
                value: (vendedor) => vendedor.nome,
                cell: (vendedor) => (
                  <button
                    type="button"
                    onClick={() => abrirAnaliticoDoVendedor(vendedor.nome)}
                    className="inline-flex items-center gap-1.5 text-left hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {vendedor.nome}
                    <MousePointerClick className="size-3 text-muted-foreground/60" />
                  </button>
                ),
              },
              {
                id: "pedidos",
                header: <>Pedidos / NF</>,
                kind: "number",
                value: (vendedor) => vendedor.pedidos,
                cell: (vendedor) => <>{formatarNumero(vendedor.pedidos, 0)}</>,
              },
              {
                id: "clientes",
                header: <>Clientes Únicos</>,
                kind: "number",
                value: (vendedor) => vendedor.clientes,
                cell: (vendedor) => <>{formatarNumero(vendedor.clientes, 0)}</>,
              },
              {
                id: "produtosDistintos",
                header: <>SKUs distintos</>,
                kind: "number",
                value: (vendedor) => vendedor.produtosDistintos,
                cell: (vendedor) => (
                  <>{formatarNumero(vendedor.produtosDistintos, 0)}</>
                ),
              },
              {
                id: "ticketMedio",
                header: <>Ticket Médio</>,
                kind: "currency",
                value: (vendedor) => vendedor.ticketMedio,
                cell: (vendedor) => <>{formatarMoeda(vendedor.ticketMedio)}</>,
              },
              {
                id: "descontoConcedido",
                header: <>Desconto (R$)</>,
                kind: "currency",
                value: (vendedor) => vendedor.descontoConcedido,
                cell: (vendedor) => (
                  <>{formatarMoeda(vendedor.descontoConcedido)}</>
                ),
              },
              {
                id: "taxaDesconto",
                header: <>% Desconto</>,
                kind: "percent",
                value: (vendedor) => vendedor.taxaDesconto,
                cell: (vendedor) => (
                  <>{formatarPercentual(vendedor.taxaDesconto, 1)}</>
                ),
              },
              {
                id: "faturamento",
                header: <>Faturamento Total</>,
                kind: "currency",
                value: (vendedor) => vendedor.faturamento,
                cell: (vendedor) => <>{formatarMoeda(vendedor.faturamento)}</>,
              },
              {
                id: "percentual",
                header: <>% Participação</>,
                kind: "percent",
                value: (vendedor) => vendedor.percentual,
                cell: (vendedor) => (
                  <>
                    <DataBarPercent
                      valor={formatarPercentual(vendedor.percentual, 1)}
                      percentual={vendedor.percentual}
                      cor="bg-violet-500/20"
                    />
                  </>
                ),
              },
              {
                id: "principalProduto",
                header: <>Principal Produto</>,
                kind: "name",
                value: (vendedor) => vendedor.principalProduto,
                cell: (vendedor) => <>{vendedor.principalProduto ?? "—"}</>,
              },
            ]}
          />
        </>
      ) : visao === "produtos" ? (
        <VisaoProdutosPorDimensao
          itens={produtosPorVendedor}
          dimensaoRotulo="Vendedor"
          dimensaoPlural="vendedores"
        />
      ) : (
        <VisaoAnaliticaNotas
          notas={notasAgrupadas}
          dimensaoChave="vendedor"
          dimensaoRotulo="Vendedor"
          selecionados={vendedoresSelecionados}
          onSelecionadosChange={setVendedoresSelecionados}
          nomeCsvBase="vendas-analitico-vendedor"
          onVoltar={() => setVisao("sintetico")}
        />
      )}
    </div>
  );
}
