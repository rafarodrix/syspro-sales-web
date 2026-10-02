import { ReportTable } from "./report-table";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
} from "@/lib/formatters";
import type { ConcentracaoTop, ItemCurvaABC } from "@/lib/vendas";
import { DataBarPercent } from "./data-bar-percent";
import { TermoExplicado } from "@/components/relatorio-guia";

interface AbaCurvaABCProps {
  relatorioABC: {
    itens: ItemCurvaABC[];
    resumoA: {
      faturamento: number;
      itens: number;
      percentualFaturamento: number;
      percentualItens: number;
    };
    resumoB: {
      faturamento: number;
      itens: number;
      percentualFaturamento: number;
      percentualItens: number;
    };
    resumoC: {
      faturamento: number;
      itens: number;
      percentualFaturamento: number;
      percentualItens: number;
    };
  };
  itensFiltrados: ItemCurvaABC[];
  concentracaoTop10: ConcentracaoTop | null;
  concentracaoTop20: ConcentracaoTop | null;
}

export function ResumoCurvaAbcCard({
  relatorioABC,
}: {
  relatorioABC: AbaCurvaABCProps["relatorioABC"];
}) {
  const classes = [
    { label: "A", resumo: relatorioABC.resumoA, tone: "text-emerald-700 dark:text-emerald-400" },
    { label: "B", resumo: relatorioABC.resumoB, tone: "text-blue-700 dark:text-blue-400" },
    { label: "C", resumo: relatorioABC.resumoC, tone: "text-amber-700 dark:text-amber-400" },
  ];

  return (
    <Card className="border-border/60 bg-card/90 shadow-2xs">
      <CardContent className="flex h-full flex-col gap-2 p-3.5 sm:p-4">
        <div className="text-xs font-semibold text-muted-foreground">Curva ABC</div>
        <div className="grid grid-cols-3 gap-2">
          {classes.map(({ label, resumo, tone }) => (
            <div key={label} className="min-w-0">
              <div className={`text-xs font-bold ${tone}`}>Classe {label}</div>
              <div className="truncate font-mono text-base font-extrabold tabular-nums text-foreground">
                {formatarMoeda(resumo.faturamento)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {formatarPercentual(resumo.percentualFaturamento, 1)} · {resumo.itens} itens
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function AbaCurvaABC({
  relatorioABC,
  itensFiltrados,
  concentracaoTop10,
  concentracaoTop20,
}: AbaCurvaABCProps) {
  return (
    <div className="space-y-4">
      {/* Tabela Curva ABC */}
      <ReportTable
        caption="Curva ABC de produtos"
        data={itensFiltrados}
        rowKey={(item) => `${item.id}-${item.produto}-${item.un}`}
        columns={[
          {
            id: "classe",
            header: <>Classe</>,
            kind: "number",
            value: (item) => item.classe,
            cell: (item) => (
              <>
                <Badge
                  variant={
                    item.classe === "A"
                      ? "default"
                      : item.classe === "B"
                        ? "secondary"
                        : "outline"
                  }
                  className={`font-bold ${
                    item.classe === "A"
                      ? "bg-emerald-600 text-white"
                      : item.classe === "B"
                        ? "bg-blue-600 text-white"
                        : "text-amber-700 dark:text-amber-400 border-amber-500/40"
                  }`}
                >
                  {item.classe}
                </Badge>
              </>
            ),
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
            id: "departamento",
            header: <>Departamento</>,
            kind: "name",
            value: (item) => item.departamento,
            cell: (item) => <>{item.departamento}</>,
          },
          {
            id: "quantidade",
            header: <>Qtd Vendida</>,
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
            header: <>Preço Médio</>,
            kind: "currency",
            value: (item) => item.precoMedio,
            cell: (item) => <>{formatarMoeda(item.precoMedio)}</>,
          },
          {
            id: "total",
            header: <>Total Faturado</>,
            kind: "currency",
            value: (item) => item.total,
            cell: (item) => <>{formatarMoeda(item.total)}</>,
          },
          {
            id: "percentual",
            header: <>% Fat.</>,
            kind: "percent",
            value: (item) => item.percentual,
            cell: (item) => (
              <>
                <DataBarPercent
                  valor={formatarPercentual(item.percentual, 2)}
                  percentual={item.percentual}
                  cor={
                    item.classe === "A"
                      ? "bg-emerald-500/20"
                      : item.classe === "B"
                        ? "bg-blue-500/20"
                        : "bg-amber-500/20"
                  }
                />
              </>
            ),
          },
          {
            id: "percentualAcumulado",
            header: <>% Acumulado</>,
            kind: "percent",
            value: (item) => item.percentualAcumulado,
            cell: (item) => (
              <>{formatarPercentual(item.percentualAcumulado, 1)}</>
            ),
          },
        ]}
      />

      {/* Paginação Padrão */}

      {/* Dependência estrutural do portfólio; variações ficam no diagnóstico comum. */}
      <div className="rounded-lg border bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-2">
          <TermoExplicado
            termo="Dependência do portfólio"
            definicao="% do faturamento concentrado nos 10 e nos 20 produtos mais vendidos. Acima de 80% no Top 20 indica portfólio concentrado — variação nesses itens afeta a receita toda."
          />
          <div className="text-right">
            <div className="font-mono text-lg font-extrabold text-foreground">
              {formatarPercentual(concentracaoTop10?.percentualTop ?? 0, 1)}
              <span className="text-xs font-semibold text-muted-foreground">
                {" / "}
              </span>
              {formatarPercentual(concentracaoTop20?.percentualTop ?? 0, 1)}
            </div>
            <div className="text-[10px] text-muted-foreground">Top 10 / Top 20</div>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {concentracaoTop10?.itensNoTop ?? 0} produtos respondem por{" "}
          {formatarPercentual(concentracaoTop10?.percentualTop ?? 0, 1)} da receita
        </p>
      </div>
    </div>
  );
}
