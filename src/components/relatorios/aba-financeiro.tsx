import { ReportTable } from "./report-table";
import { useState } from "react";
import { CreditCard, FileText } from "lucide-react";
import {
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
} from "@/lib/formatters";
import { DataBarPercent } from "./data-bar-percent";
import { ReportViewSelector } from "./report-view-toggle";

type VisaoFinanceira = "pagamento" | "documento";

interface ItemFinanceiro {
  nome: string;
  pedidos: number;
  ticketMedio: number;
  total: number;
  percentual: number;
}

interface AbaFinanceiroProps {
  relatorioFinanceiro: {
    formasPagamento: ItemFinanceiro[];
    modelosDocumento: ItemFinanceiro[];
  };
}

function TabelaFinanceira({
  itens,
  rotulo,
}: {
  itens: ItemFinanceiro[];
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
          id: "total",
          header: <>Faturamento</>,
          kind: "currency",
          value: (item) => item.total,
          cell: (item) => <>{formatarMoeda(item.total)}</>,
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

  return (
    <div className="space-y-4">
      <ReportViewSelector
        view={visao}
        onViewChange={setVisao}
        options={[
          { value: "pagamento", label: "Forma de pagamento", icon: CreditCard },
          { value: "documento", label: "Documento fiscal", icon: FileText },
        ]}
      />
      <TabelaFinanceira
        itens={
          exibePagamentos
            ? relatorioFinanceiro.formasPagamento
            : relatorioFinanceiro.modelosDocumento
        }
        rotulo={exibePagamentos ? "Forma de pagamento" : "Documento fiscal"}
      />
    </div>
  );
}
