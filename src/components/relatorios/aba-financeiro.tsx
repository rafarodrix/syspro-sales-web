import { useState } from "react";
import { CreditCard, FileText } from "lucide-react";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
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

function TabelaFinanceira({ itens, rotulo }: { itens: ItemFinanceiro[]; rotulo: string }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[640px] text-xs">
        <thead>
          <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
            <th className="p-3">{rotulo}</th>
            <th className="p-3 text-right">Pedidos / NF</th>
            <th className="p-3 text-right">Ticket médio</th>
            <th className="p-3 text-right">Faturamento</th>
            <th className="p-3 text-right">Participação</th>
          </tr>
        </thead>
        <tbody>
          {itens.length === 0 ? (
            <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum registro encontrado.</td></tr>
          ) : (
            itens.map((item) => (
              <tr key={item.nome} className="border-b last:border-0 hover:bg-muted/20">
                <td className="max-w-[280px] truncate p-3 font-semibold" title={item.nome}>{item.nome}</td>
                <td className="p-3 text-right font-mono">{formatarNumero(item.pedidos, 0)}</td>
                <td className="p-3 text-right font-mono text-muted-foreground">{formatarMoeda(item.ticketMedio)}</td>
                <td className="p-3 text-right font-mono font-bold">{formatarMoeda(item.total)}</td>
                <td className="p-3 text-right"><DataBarPercent valor={formatarPercentual(item.percentual, 1)} percentual={item.percentual} cor="bg-orange-500/20" /></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
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
        description="Pagamento mostra o mix informado nas notas; documento fiscal separa o tipo de emissão usado na venda."
        options={[
          { value: "pagamento", label: "Forma de pagamento", icon: CreditCard },
          { value: "documento", label: "Documento fiscal", icon: FileText },
        ]}
      />
      <TabelaFinanceira itens={exibePagamentos ? relatorioFinanceiro.formasPagamento : relatorioFinanceiro.modelosDocumento} rotulo={exibePagamentos ? "Forma de pagamento" : "Documento fiscal"} />
    </div>
  );
}
