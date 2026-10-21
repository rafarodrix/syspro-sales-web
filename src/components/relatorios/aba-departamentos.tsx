import { Button } from "@/components/ui/button";
import { ReportTable } from "./report-table";
import { useMemo, useState } from "react";
import { ArrowLeftRight, FileText, LayoutList, MousePointerClick } from "lucide-react";
import {
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
} from "@/lib/formatters";
import type { ItemDepartamentoAnalise } from "@/lib/vendas";
import { DataBarPercent } from "./data-bar-percent";
import { ReportViewSelector } from "./report-view-toggle";
import { ReportBarraVisao, ReportVisaoProvider } from "./report-barra";
import { VisaoComparativoDimensao } from "./visao-comparativo-dimensao";
import { FiltroRelatorio } from "./filtro-relatorio";

export function AbaDepartamentos({
  deptosFiltrados,
  deptosAnteriores = [],
  comparacaoDisponivel = false,
  rotuloPeriodoAnterior,
}: {
  deptosFiltrados: ItemDepartamentoAnalise[];
  deptosAnteriores?: ItemDepartamentoAnalise[];
  comparacaoDisponivel?: boolean;
  rotuloPeriodoAnterior?: string;
}) {
  const [visao, setVisao] = useState<"sintetico" | "analitico" | "comparativo">("sintetico");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [ordenacao, setOrdenacao] = useState<"faturamento" | "desconto" | "margem" | "produtos">("faturamento");
  const deptosOrdenados = useMemo(() => {
    const copia = [...deptosFiltrados];
    switch (ordenacao) {
      case "desconto":
        return copia.sort((a, b) => b.descontoConcedido - a.descontoConcedido);
      case "margem":
        return copia.sort((a, b) => (a.margemBruta ?? 0) - (b.margemBruta ?? 0));
      case "produtos":
        return copia.sort((a, b) => b.quantidadeProdutosDistintos - a.quantidadeProdutosDistintos);
      case "faturamento":
      default:
        return copia.sort((a, b) => b.faturamento - a.faturamento);
    }
  }, [deptosFiltrados, ordenacao]);

  const itens = useMemo(
    () =>
      deptosFiltrados.flatMap((dep) =>
        dep.produtos.map((produto) => ({ ...produto, departamento: dep.nome })),
      ),
    [deptosFiltrados],
  );
  const itensVisiveis = selecionado
    ? itens.filter((item) => item.departamento === selecionado)
    : itens;
  const abrir = (nome: string) => {
    setSelecionado(nome);
    setVisao("analitico");
  };
  const seletorVisao = (
      <ReportViewSelector
        view={visao}
        options={[
          { value: "sintetico", label: "Resumo", icon: LayoutList },
          { value: "analitico", label: "Produtos", icon: FileText },
          { value: "comparativo", label: "Comparativo", icon: ArrowLeftRight },
        ]}
        onViewChange={(novaVisao) => {
          setSelecionado(null);
          setVisao(novaVisao);
        }}
      />
  );

  const barraVisao = (
    <ReportBarraVisao>
      {seletorVisao}
      <FiltroRelatorio
        rotulo="Ordenar departamentos"
        valor={ordenacao}
        opcoes={[
          { valor: "faturamento", rotulo: "Maior faturamento" },
          { valor: "desconto", rotulo: "Maior desconto" },
          { valor: "margem", rotulo: "Menor margem" },
          { valor: "produtos", rotulo: "Mais produtos" },
        ]}
        onChange={(valor) => setOrdenacao(valor as typeof ordenacao)}
      />
    </ReportBarraVisao>
  );

  return (
    <ReportVisaoProvider>
    <div className="space-y-4">
      {barraVisao}

      {visao === "comparativo" ? (
        <VisaoComparativoDimensao
          rotuloDimensao="Departamento"
          itensAtuais={deptosFiltrados.map((dep) => ({ nome: dep.nome, faturamento: dep.faturamento }))}
          itensAnteriores={deptosAnteriores.map((dep) => ({ nome: dep.nome, faturamento: dep.faturamento }))}
          comparacaoDisponivel={comparacaoDisponivel}
          rotuloPeriodoAnterior={rotuloPeriodoAnterior}
        />
      ) : null}

      {visao === "analitico" ? (
        <>
          {selecionado ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSelecionado(null)}
            >
              {selecionado} ×
            </Button>
          ) : null}
          <ReportTable
            caption="Produtos por departamento"
            data={itensVisiveis}
            rowKey={(item) => `${item.departamento}-${item.id}`}
            columns={[
              {
                id: "departamento",
                header: <>Departamento</>,
                kind: "name",
                value: (item) => item.departamento,
                cell: (item) => <>{item.departamento}</>,
              },
              {
                id: "codigoReferencia",
                header: <>Código</>,
                kind: "number",
                value: (item) => item.codigoReferencia,
                cell: (item) => <>{item.codigoReferencia || "—"}</>,
              },
              {
                id: "produto",
                header: <>Produto</>,
                kind: "name",
                value: (item) => item.produto,
                cell: (item) => <>{item.produto}</>,
              },
              {
                id: "quantidade",
                header: <>Quantidade</>,
                kind: "number",
                value: (item) => item.quantidade,
                exportValue: (item) => `${formatarNumero(item.quantidade, 2)} ${item.un}`,
                cell: (item) => (
                  <>
                    {formatarNumero(item.quantidade, 2)} {item.un}
                  </>
                ),
              },
              {
                id: "precoMedio",
                header: <>Preço médio</>,
                kind: "currency",
                value: (item) => item.precoMedio,
                cell: (item) => <>{formatarMoeda(item.precoMedio)}</>,
              },
              {
                id: "total",
                header: <>Faturamento</>,
                kind: "currency",
                value: (item) => item.total,
                cell: (item) => <>{formatarMoeda(item.total)}</>,
              },
            ]}
          />
        </>
      ) : visao === "sintetico" ? (
        <ReportTable
          caption="Resumo por departamento"
          data={deptosOrdenados}
          rowKey={(dep) => dep.nome}
          columns={[
            {
              id: "nome",
              header: <>Departamento</>,
              kind: "name",
              value: (dep) => dep.nome,
              cell: (dep) => (
                <>
                  <button
                    type="button"
                    onClick={() => abrir(dep.nome)}
                    className="inline-flex items-center gap-1.5 hover:text-primary hover:underline"
                  >
                    {dep.nome}
                    <MousePointerClick className="size-3 text-muted-foreground/60" />
                  </button>
                </>
              ),
            },
            {
              id: "quantidadeProdutosDistintos",
              header: <>Produtos</>,
              kind: "number",
              value: (dep) => dep.quantidadeProdutosDistintos,
              cell: (dep) => <>{dep.quantidadeProdutosDistintos}</>,
            },
            {
              id: "pedidos",
              header: <>Pedidos / NF</>,
              kind: "number",
              value: (dep) => dep.pedidos,
              cell: (dep) => <>{formatarNumero(dep.pedidos, 0)}</>,
            },
            {
              id: "ticketMedio",
              header: <>Ticket médio</>,
              kind: "currency",
              value: (dep) => dep.ticketMedio,
              cell: (dep) => <>{formatarMoeda(dep.ticketMedio)}</>,
            },
            {
              id: "desconto",
              header: <>Desconto</>,
              kind: "currency",
              value: (dep) => dep.descontoConcedido,
              cell: (dep) => <>{formatarMoeda(dep.descontoConcedido)}</>,
            },
            {
              id: "taxaDesconto",
              header: <>Taxa desconto</>,
              kind: "percent",
              value: (dep) => dep.taxaDesconto,
              cell: (dep) => <>{formatarPercentual(dep.taxaDesconto, 1)}</>,
            },
            {
              id: "faturamento",
              header: <>Faturamento</>,
              kind: "currency",
              value: (dep) => dep.faturamento,
              cell: (dep) => <>{formatarMoeda(dep.faturamento)}</>,
            },
            {
              id: "lucroBruto",
              header: <>Lucro bruto</>,
              kind: "currency",
              value: (dep) => dep.lucroBruto,
              cell: (dep) => <>{formatarMoeda(dep.lucroBruto)}</>,
            },
            {
              id: "margemBruta",
              header: <>Margem</>,
              kind: "percent",
              value: (dep) => dep.margemBruta,
              cell: (dep) => dep.coberturaCusto > 0
                ? <>{formatarPercentual(dep.margemBruta, 1)}</>
                : <>—</>,
            },
            {
              id: "coberturaCusto",
              header: <>Cobertura custo</>,
              kind: "percent",
              value: (dep) => dep.coberturaCusto,
              cell: (dep) => <>{formatarPercentual(dep.coberturaCusto, 1)}</>,
            },
            {
              id: "percentual",
              header: <>Participação</>,
              kind: "percent",
              value: (dep) => dep.percentual,
              cell: (dep) => (
                <>
                  <DataBarPercent
                    valor={formatarPercentual(dep.percentual, 1)}
                    percentual={dep.percentual}
                    cor="bg-blue-500/20"
                  />
                </>
              ),
            },
          ]}
        />
      ) : null}
    </div>
    </ReportVisaoProvider>
  );
}
