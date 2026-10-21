import { Button } from "@/components/ui/button";
import { ReportTable } from "./report-table";
import { useMemo, useState } from "react";
import {
  FileText,
  TrendingDown,
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
import { ReportBarraVisao, ReportVisaoProvider } from "./report-barra";
import type {
  ItemProdutoPorDimensao,
  ItemVendedorAnalise,
  VendaAgrupada,
} from "@/lib/vendas";
import { VisaoProdutosPorDimensao } from "./visao-produtos-por-dimensao";
import { FiltroRelatorio } from "./filtro-relatorio";

type VisaoVendedores = "sintetico" | "produtos" | "analitico";
type OrdenacaoVendedor = "faturamento" | "ticket" | "desconto" | "taxaDesconto" | "margem";

interface AbaVendedoresProps {
  vendedoresFiltrados: ItemVendedorAnalise[];
  produtosPorVendedor: ItemProdutoPorDimensao[];
  /** Notas do período (agrupadas por NF), usadas na visão analítica. */
  notasAgrupadas: VendaAgrupada[];
  /** Vendedores com faturamento menor que no período comparado. */
  vendedoresEmQueda?: string[];
}

export function AbaVendedores({
  vendedoresFiltrados,
  produtosPorVendedor,
  notasAgrupadas,
  vendedoresEmQueda = [],
}: AbaVendedoresProps) {
  const [visao, setVisao] = useState<VisaoVendedores>("sintetico");
  const [vendedoresSelecionados, setVendedoresSelecionados] = useState<
    string[]
  >([]);
  const [ordenacao, setOrdenacao] = useState<OrdenacaoVendedor>("faturamento");
  const [somenteQueda, setSomenteQueda] = useState(false);

  const vendedoresExibidos = useMemo(() => {
    const emQueda = new Set(vendedoresEmQueda);
    const base = somenteQueda
      ? vendedoresFiltrados.filter((item) => emQueda.has(item.nome))
      : vendedoresFiltrados;
    const copia = [...base];
    switch (ordenacao) {
      case "desconto":
        return copia.sort((a, b) => b.descontoConcedido - a.descontoConcedido);
      case "taxaDesconto":
        return copia.sort((a, b) => b.taxaDesconto - a.taxaDesconto);
      case "margem":
        return copia.sort((a, b) => (a.margemBruta ?? 0) - (b.margemBruta ?? 0));
      case "ticket":
        return copia.sort((a, b) => b.ticketMedio - a.ticketMedio);
      case "faturamento":
      default:
        return copia.sort((a, b) => b.faturamento - a.faturamento);
    }
  }, [ordenacao, somenteQueda, vendedoresEmQueda, vendedoresFiltrados]);

  function abrirAnaliticoDoVendedor(nome: string) {
    setVendedoresSelecionados([nome]);
    setVisao("analitico");
  }

  const seletorVisao = (
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
  );

  const barraVisao = (
    <ReportBarraVisao
      controlesDireita={
        <>
      <FiltroRelatorio
        rotulo="Ordenar vendedores"
        valor={ordenacao}
        opcoes={[
          { valor: "faturamento", rotulo: "Maior faturamento" },
          { valor: "ticket", rotulo: "Maior ticket médio" },
          { valor: "desconto", rotulo: "Maior desconto concedido" },
          { valor: "taxaDesconto", rotulo: "Maior taxa de desconto" },
          { valor: "margem", rotulo: "Menor margem" },
        ]}
        onChange={(valor) => setOrdenacao(valor as OrdenacaoVendedor)}
      />
      <Button
        type="button"
        size="sm"
        variant={somenteQueda ? "default" : "outline"}
        className="h-9 text-xs"
        aria-pressed={somenteQueda}
        title="Mostrar apenas vendedores com queda de faturamento no comparativo"
        onClick={() => setSomenteQueda((atual) => !atual)}
      >
        <span className="hidden xl:inline">Queda no comparativo</span>
        <TrendingDown className="size-3.5 xl:hidden" />
      </Button>
        </>
      }
    >
      {seletorVisao}
    </ReportBarraVisao>
  );

  return (
    <ReportVisaoProvider>
    <div className="space-y-4">
      {barraVisao}


      {visao === "sintetico" ? (
        <>
          {/* Tabela de Ranking Sintético */}
          <ReportTable
            caption="Resumo por vendedor"
            data={vendedoresExibidos}
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
                id: "lucroBruto",
                header: <>Lucro bruto</>,
                kind: "currency",
                value: (vendedor) => vendedor.lucroBruto,
                cell: (vendedor) => <>{formatarMoeda(vendedor.lucroBruto)}</>,
              },
              {
                id: "margemBruta",
                header: <>Margem</>,
                kind: "percent",
                value: (vendedor) => vendedor.margemBruta,
                cell: (vendedor) => vendedor.coberturaCusto > 0
                  ? <>{formatarPercentual(vendedor.margemBruta, 1)}</>
                  : <>—</>,
              },
              {
                id: "coberturaCusto",
                header: <>Cobertura custo</>,
                kind: "percent",
                value: (vendedor) => vendedor.coberturaCusto,
                cell: (vendedor) => <>{formatarPercentual(vendedor.coberturaCusto, 1)}</>,
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
    </ReportVisaoProvider>
  );
}
