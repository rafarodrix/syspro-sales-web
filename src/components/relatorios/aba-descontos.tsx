import { ReportTable } from "./report-table";
import { useState } from "react";
import { CreditCard, Layers3, UserRound } from "lucide-react";
import {
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
} from "@/lib/formatters";
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
      descricao:
        "Compara descontos, custo de aquisição e margem entre departamentos e categorias.",
      rotulo: "Departamento",
      itens: relatorio.porDepartamento,
    };
  }

  if (visao === "forma-pagamento") {
    return {
      titulo: "Descontos por forma de pagamento",
      descricao:
        "Mostra desconto e margem conforme o meio de pagamento informado na nota.",
      rotulo: "Forma de pagamento",
      itens: relatorio.porFormaPagamento,
    };
  }

  return {
    titulo: "Descontos por vendedor",
    descricao: "Compara descontos, custo de aquisição e margem entre os vendedores.",
    rotulo: "Vendedor",
    itens: relatorio.porVendedor,
  };
}

function TabelaDescontos({
  itens,
  rotulo,
}: {
  itens: ItemDescontoAnalise[];
  rotulo: string;
}) {
  return (
    <ReportTable
      caption={`Descontos por ${rotulo.toLowerCase()}`}
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
          cell: (item) => <>{formatarNumero(item.pedidos ?? 0, 0)}</>,
        },
        {
          id: "faturamentoLiquido",
          header: <>Fat. líquido</>,
          kind: "currency",
          value: (item) => item.faturamentoLiquido,
          cell: (item) => <>{formatarMoeda(item.faturamentoLiquido)}</>,
        },
        {
          id: "desconto",
          header: <>Desconto (R$)</>,
          kind: "currency",
          value: (item) => item.desconto,
          cell: (item) => <>{formatarMoeda(item.desconto)}</>,
        },
        {
          id: "taxaDesconto",
          header: <>% desconto</>,
          kind: "percent",
          value: (item) => item.taxaDesconto,
          cell: (item) => (
            <>
              <DataBarPercent
                valor={formatarPercentual(item.taxaDesconto, 1)}
                percentual={Math.min(item.taxaDesconto * 3, 100)}
                cor="bg-rose-500/20"
              />
            </>
          ),
        },
        {
          id: "custoAquisicao",
          header: <>Custo aquisição</>,
          kind: "currency",
          value: (item) => item.custoAquisicao,
          cell: (item) => <>{formatarMoeda(item.custoAquisicao)}</>,
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
          header: <>Margem bruta</>,
          kind: "percent",
          value: (item) => item.margemBruta,
          exportValue: (item) => item.coberturaCusto > 0
            ? formatarPercentual(item.margemBruta, 1)
            : "Sem custo",
          cell: (item) => item.coberturaCusto > 0
            ? <>{formatarPercentual(item.margemBruta, 1)}</>
            : <>—</>,
        },
        {
          id: "coberturaCusto",
          header: <>Cobertura custo</>,
          kind: "percent",
          value: (item) => item.coberturaCusto,
          cell: (item) => <>{formatarPercentual(item.coberturaCusto, 1)}</>,
        },
      ]}
    />
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
        options={opcoesDeVisao}
      />

      <section className="space-y-3">
        <TabelaDescontos itens={dados.itens} rotulo={dados.rotulo} />
      </section>
    </div>
  );
}
