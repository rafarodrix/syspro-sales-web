import { Button } from "@/components/ui/button";
import { ReportTable } from "./report-table";
import { useMemo, useState } from "react";
import { FileText, LayoutList, MousePointerClick } from "lucide-react";
import {
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
} from "@/lib/formatters";
import type { ItemDepartamentoAnalise } from "@/lib/vendas";
import { DataBarPercent } from "./data-bar-percent";
import { ReportViewSelector } from "./report-view-toggle";

export function AbaDepartamentos({
  deptosFiltrados,
}: {
  deptosFiltrados: ItemDepartamentoAnalise[];
}) {
  const [visao, setVisao] = useState<"sintetico" | "analitico">("sintetico");
  const [selecionado, setSelecionado] = useState<string | null>(null);
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
  return (
    <div className="space-y-4">
      <ReportViewSelector
        view={visao}
        options={[
          { value: "sintetico", label: "Resumo", icon: LayoutList },
          { value: "analitico", label: "Produtos", icon: FileText },
        ]}
        onViewChange={(novaVisao) => {
          setSelecionado(null);
          setVisao(novaVisao);
        }}
      />
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
                id: "id",
                header: <>Código</>,
                kind: "number",
                value: (item) => item.id,
                cell: (item) => <>{item.id}</>,
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
      ) : (
        <ReportTable
          data={deptosFiltrados}
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
              id: "quantidadeItens",
              header: <>Itens</>,
              kind: "number",
              value: (dep) => dep.quantidadeItens,
              cell: (dep) => <>{formatarNumero(dep.quantidadeItens, 2)}</>,
            },
            {
              id: "ticketMedioPorItem",
              header: <>Preço médio</>,
              kind: "currency",
              value: (dep) => dep.ticketMedioPorItem,
              cell: (dep) => <>{formatarMoeda(dep.ticketMedioPorItem)}</>,
            },
            {
              id: "faturamento",
              header: <>Faturamento</>,
              kind: "currency",
              value: (dep) => dep.faturamento,
              cell: (dep) => <>{formatarMoeda(dep.faturamento)}</>,
            },
            {
              id: "percentual",
              header: <>Participação</>,
              kind: "number",
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
      )}
    </div>
  );
}
