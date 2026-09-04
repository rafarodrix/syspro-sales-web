import { useState } from "react";
import { BadgePercent, CreditCard, Layers3, UserRound } from "lucide-react";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import type { ItemDescontoAnalise, RelatorioDescontos } from "@/lib/vendas";
import { DataBarPercent } from "./data-bar-percent";
import { ReportViewSelector } from "./report-view-toggle";

type VisaoDesconto = "vendedor" | "departamento" | "forma-pagamento";

interface AbaDescontosProps {
  relatorioDescontos: RelatorioDescontos;
}

const opcoesDeVisao = [
  { value: "vendedor", label: "Vendedor", icon: UserRound },
  { value: "departamento", label: "Departamento", icon: Layers3 },
  { value: "forma-pagamento", label: "Forma de pagamento", icon: CreditCard },
] as const;

function dadosDaVisao(relatorio: RelatorioDescontos, visao: VisaoDesconto) {
  if (visao === "departamento") {
    return {
      titulo: "Descontos por departamento",
      descricao: "Compara o desconto concedido entre departamentos e categorias.",
      rotulo: "Departamento",
      itens: relatorio.porDepartamento,
    };
  }

  if (visao === "forma-pagamento") {
    return {
      titulo: "Descontos por forma de pagamento",
      descricao: "Mostra se a concessão de desconto varia conforme o meio de pagamento informado na nota.",
      rotulo: "Forma de pagamento",
      itens: relatorio.porFormaPagamento,
    };
  }

  return {
    titulo: "Descontos por vendedor",
    descricao: "Compara a concessão de desconto entre os vendedores.",
    rotulo: "Vendedor",
    itens: relatorio.porVendedor,
  };
}

function TabelaDescontos({ itens, rotulo }: { itens: ItemDescontoAnalise[]; rotulo: string }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[680px] text-xs">
        <thead>
          <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
            <th className="p-3">{rotulo}</th>
            <th className="p-3 text-right">Pedidos / NF</th>
            <th className="p-3 text-right">Fat. líquido</th>
            <th className="p-3 text-right">Desconto (R$)</th>
            <th className="p-3 text-right">% desconto</th>
          </tr>
        </thead>
        <tbody>
          {itens.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-8 text-center text-muted-foreground">
                Nenhum registro encontrado.
              </td>
            </tr>
          ) : (
            itens.map((item) => (
              <tr key={item.nome} className="border-b last:border-0 hover:bg-muted/20">
                <td className="max-w-[280px] truncate p-3 font-semibold" title={item.nome}>{item.nome}</td>
                <td className="p-3 text-right font-mono">{formatarNumero(item.pedidos ?? 0, 0)}</td>
                <td className="p-3 text-right font-mono text-muted-foreground">{formatarMoeda(item.faturamentoLiquido)}</td>
                <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">{formatarMoeda(item.desconto)}</td>
                <td className="p-3 text-right">
                  <DataBarPercent
                    valor={formatarPercentual(item.taxaDesconto, 1)}
                    percentual={Math.min(item.taxaDesconto * 3, 100)}
                    cor="bg-rose-500/20"
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function AbaDescontos({ relatorioDescontos }: AbaDescontosProps) {
  const [visao, setVisao] = useState<VisaoDesconto>("vendedor");
  const dados = dadosDaVisao(relatorioDescontos, visao);

  return (
    <div className="space-y-4">
      <ReportViewSelector
        view={visao}
        onViewChange={setVisao}
        ariaLabel="Visão de descontos"
        description="Analise a concessão de descontos pela dimensão mais adequada à decisão comercial."
        options={opcoesDeVisao}
      />

      <section className="space-y-3">
        <div className="flex items-start gap-2 px-1">
          <BadgePercent className="mt-0.5 size-4 text-rose-500" />
          <div>
            <h3 className="text-sm font-bold text-foreground">{dados.titulo}</h3>
            <p className="text-xs text-muted-foreground">{dados.descricao}</p>
          </div>
        </div>
        <TabelaDescontos itens={dados.itens} rotulo={dados.rotulo} />
      </section>
    </div>
  );
}
