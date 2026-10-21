import { ReportTable } from "./report-table";
import { useMemo, useState } from "react";
import { CreditCard, FileText } from "lucide-react";
import {
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
} from "@/lib/formatters";
import { DataBarPercent } from "./data-bar-percent";
import { ReportViewSelector } from "./report-view-toggle";
import { ReportBarraVisao, ReportVisaoProvider } from "./report-barra";
import { FiltroRelatorio } from "./filtro-relatorio";
import type { ItemFinanceiroAnalise } from "@/lib/vendas";

type VisaoFinanceira = "pagamento" | "documento";

interface AbaFinanceiroProps {
  relatorioFinanceiro: {
    formasPagamento: ItemFinanceiroAnalise[];
    modelosDocumento: ItemFinanceiroAnalise[];
  };
}

function TabelaFinanceira({
  itens,
  rotulo,
}: {
  itens: ItemFinanceiroAnalise[];
  rotulo: string;
}) {
  return (
    <ReportTable
      caption={rotulo}
      data={itens}
      rowKey={(item) => item.nome}
      columns={[
        {
          id: "nome",
          header: <>{rotulo}</>,
          kind: "name",
          value: (item) => item.nome,
          cell: (item) => <>{item.nome}</>,
        },
        {
          id: "pedidos",
          header: <>Pedidos / NF</>,
          kind: "number",
          value: (item) => item.pedidos,
          cell: (item) => <>{formatarNumero(item.pedidos, 0)}</>,
        },
        {
          id: "ticketMedio",
          header: <>Ticket médio</>,
          kind: "currency",
          value: (item) => item.ticketMedio,
          cell: (item) => <>{formatarMoeda(item.ticketMedio)}</>,
        },
        {
          id: "desconto",
          header: <>Desconto</>,
          kind: "currency",
          value: (item) => item.descontoConcedido,
          cell: (item) => <>{formatarMoeda(item.descontoConcedido)}</>,
        },
        {
          id: "taxaDesconto",
          header: <>Taxa desconto</>,
          kind: "percent",
          value: (item) => item.taxaDesconto,
          cell: (item) => <>{formatarPercentual(item.taxaDesconto, 1)}</>,
        },
        {
          id: "total",
          header: <>Faturamento</>,
          kind: "currency",
          value: (item) => item.total,
          cell: (item) => <>{formatarMoeda(item.total)}</>,
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
            <>
              <DataBarPercent
                valor={formatarPercentual(item.percentual, 1)}
                percentual={item.percentual}
                cor="bg-orange-500/20"
              />
            </>
          ),
        },
      ]}
    />
  );
}

export function AbaFinanceiro({ relatorioFinanceiro }: AbaFinanceiroProps) {
  const [visao, setVisao] = useState<VisaoFinanceira>("pagamento");
  const exibePagamentos = visao === "pagamento";
  const [ordenacao, setOrdenacao] = useState<"total" | "desconto" | "margem" | "pedidos">("total");

  const itensOrdenados = useMemo(() => {
    const base = exibePagamentos
      ? relatorioFinanceiro.formasPagamento
      : relatorioFinanceiro.modelosDocumento;
    const copia = [...base];
    switch (ordenacao) {
      case "desconto":
        return copia.sort((a, b) => b.descontoConcedido - a.descontoConcedido);
      case "margem":
        return copia.sort((a, b) => (a.margemBruta ?? 0) - (b.margemBruta ?? 0));
      case "pedidos":
        return copia.sort((a, b) => b.pedidos - a.pedidos);
      case "total":
      default:
        return copia.sort((a, b) => b.total - a.total);
    }
  }, [exibePagamentos, ordenacao, relatorioFinanceiro]);

  const seletorVisao = (
    <ReportViewSelector
      view={visao}
      onViewChange={setVisao}
      options={[
        { value: "pagamento", label: "Forma de pagamento", icon: CreditCard },
        { value: "documento", label: "Documento fiscal", icon: FileText },
      ]}
    />
  );

  return (
    <ReportVisaoProvider>
    <div className="space-y-4">
      <ReportBarraVisao
      controlesDireita={
        <>
      <FiltroRelatorio
          rotulo="Ordenar"
          valor={ordenacao}
          opcoes={[
            { valor: "total", rotulo: "Maior faturamento" },
            { valor: "pedidos", rotulo: "Mais notas" },
            { valor: "desconto", rotulo: "Maior desconto" },
            { valor: "margem", rotulo: "Menor margem" },
          ]}
          onChange={(valor) => setOrdenacao(valor as typeof ordenacao)}
        />
        </>
      }
    >
        {seletorVisao}
        </ReportBarraVisao>

      <TabelaFinanceira
        itens={itensOrdenados}
        rotulo={exibePagamentos ? "Forma de pagamento" : "Documento fiscal"}
      />
    </div>
    </ReportVisaoProvider>
  );
}
