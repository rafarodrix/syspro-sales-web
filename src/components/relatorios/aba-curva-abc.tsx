"use client";

import { useMemo, useState } from "react";
import { Factory, Package } from "lucide-react";

import { ReportTable } from "./report-table";
import { ClasseBadge } from "./ui/classe-badge";

import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import type {
  ConcentracaoTop,
  ItemCurvaABC,
  MetricaCurvaABC,
  RelatorioCurvaABC,
} from "@/lib/vendas";
import type { VendaComEmpresa, VendaProduto } from "@/lib/syspro-api";
import { curvaAbcPorFornecedor } from "@/lib/analise-fornecedores";
import { DataBarPercent } from "./data-bar-percent";
import { TermoExplicado } from "@/components/relatorio-guia";
import { FiltroRelatorio } from "./filtro-relatorio";
import { ReportBarraVisao, ReportVisaoProvider } from "./report-barra";
import { ReportViewSelector } from "./report-view-toggle";

interface AbaCurvaABCProps {
  relatorioABC: RelatorioCurvaABC;
  itensFiltrados: ItemCurvaABC[];
  concentracaoTop10: ConcentracaoTop | null;
  concentracaoTop20: ConcentracaoTop | null;
  metrica: MetricaCurvaABC;
  onMetricaChange: (metrica: MetricaCurvaABC) => void;
  /** Necessário para classificar a curva por fornecedor. */
  vendas?: (VendaProduto | VendaComEmpresa)[];
}

const ROTULOS_METRICA: Record<MetricaCurvaABC, string> = {
  faturamento: "Faturamento",
  lucro: "Lucro bruto",
  quantidade: "Quantidade",
  custo: "Custo de reposição",
};

/** Painel de dependência: quanto a métrica está concentrada no topo da classificação. */
function Dependencia({
  titulo,
  metrica,
  top10,
  top20,
  legenda,
}: {
  titulo: string;
  metrica: MetricaCurvaABC;
  top10: { itensNoTop: number; percentualTop: number } | null;
  top20: { itensNoTop: number; percentualTop: number } | null;
  legenda: string;
}) {
  return (
    <div className="rounded-lg bg-muted/25 p-3">
      <div className="flex items-center justify-between gap-2">
        <TermoExplicado
          termo={titulo}
          definicao={`% de ${ROTULOS_METRICA[metrica].toLowerCase()} concentrado nos 10 e nos 20 primeiros da classificação.`}
        />
        <div className="text-right">
          <div className="font-mono text-lg font-extrabold text-foreground">
            {formatarPercentual(top10?.percentualTop ?? 0, 1)}
            <span className="text-xs font-semibold text-muted-foreground">{" / "}</span>
            {formatarPercentual(top20?.percentualTop ?? 0, 1)}
          </div>
          <div className="text-[11px] text-muted-foreground">Top 10 / Top 20</div>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {top10?.itensNoTop ?? 0} {legenda} respondem por{" "}
        {formatarPercentual(top10?.percentualTop ?? 0, 1)} de {ROTULOS_METRICA[metrica].toLowerCase()}
      </p>
    </div>
  );
}

export function AbaCurvaABC({
  itensFiltrados,
  concentracaoTop10,
  concentracaoTop20,
  metrica,
  onMetricaChange,
  vendas = [],
}: AbaCurvaABCProps) {
  const [visao, setVisao] = useState<"produto" | "fornecedor">("produto");

  const curvaFornecedor = useMemo(() => curvaAbcPorFornecedor(vendas, metrica), [vendas, metrica]);

  return (
    <ReportVisaoProvider>
      <div className="flex flex-col gap-4">
        <ReportBarraVisao>
          <ReportViewSelector
            view={visao}
            options={[
              { value: "produto", label: "Produto", icon: Package },
              { value: "fornecedor", label: "Fornecedor", icon: Factory },
            ]}
            onViewChange={(proxima) => setVisao(proxima as "produto" | "fornecedor")}
            ariaLabel="Curva ABC por"
          />
          <FiltroRelatorio
            rotulo="Classificar curva por"
            valor={metrica}
            onChange={(valor) => onMetricaChange(valor as MetricaCurvaABC)}
            opcoes={(Object.entries(ROTULOS_METRICA) as [MetricaCurvaABC, string][]).map(
              ([valor, rotulo]) => ({ valor, rotulo }),
            )}
          />
        </ReportBarraVisao>

        {visao === "produto" ? (
          <>
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
                      <ClasseBadge classe={item.classe} />
                    </>
                  ),
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
                  header: <>% {ROTULOS_METRICA[metrica]}</>,
                  kind: "percent",
                  value: (item) => item.percentual,
                  cell: (item) => (
                    <>
                      <DataBarPercent
                        valor={formatarPercentual(item.percentual, 2)}
                        percentual={item.percentual}
                        classe={item.classe}
                      />
                    </>
                  ),
                },
                {
                  id: "percentualAcumulado",
                  header: <>% Acumulado</>,
                  kind: "percent",
                  value: (item) => item.percentualAcumulado,
                  cell: (item) => <>{formatarPercentual(item.percentualAcumulado, 1)}</>,
                },
              ]}
            />

            <Dependencia
              titulo="Dependência do portfólio"
              metrica={metrica}
              top10={concentracaoTop10}
              top20={concentracaoTop20}
              legenda="produtos"
            />

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Custo de reposição, lucro bruto e margem por produto ficam em{" "}
              <strong>Vendas &amp; Margem</strong>, onde aparecem antes e depois das devoluções (EDV).
            </p>
          </>
        ) : (
          <>
            <ReportTable
              caption="Curva ABC de fornecedores"
              data={curvaFornecedor.itens}
              rowKey={(item) => item.fornecedor}
              stickyFirst
              exportObservacoes={`Classificação por ${ROTULOS_METRICA[metrica].toLowerCase()}: classe A até 80% do acumulado, B até 95% e C o restante.`}
              columns={[
                {
                  id: "classe",
                  header: <>Classe</>,
                  kind: "number",
                  value: (item) => item.classe,
                  cell: (item) => <ClasseBadge classe={item.classe} />,
                },
                {
                  id: "fornecedor",
                  header: <>Fornecedor</>,
                  kind: "name",
                  value: (item) => item.fornecedor,
                  cell: (item) => <span className="block max-w-[24rem] truncate">{item.fornecedor}</span>,
                },
                {
                  id: "skus",
                  header: <>SKUs</>,
                  kind: "number",
                  value: (item) => item.skus,
                  cell: (item) => <>{formatarNumero(item.skus, 0)}</>,
                },
                {
                  id: "quantidade",
                  header: <>Qtd Vendida</>,
                  kind: "number",
                  value: (item) => item.quantidade,
                  cell: (item) => <>{formatarNumero(item.quantidade, 2)}</>,
                },
                {
                  id: "faturamento",
                  header: <>Faturamento</>,
                  kind: "currency",
                  value: (item) => item.faturamento,
                  cell: (item) => <>{formatarMoeda(item.faturamento)}</>,
                },
                {
                  id: "percentual",
                  header: <>% {ROTULOS_METRICA[metrica]}</>,
                  kind: "percent",
                  value: (item) => item.percentual,
                  cell: (item) => (
                    <DataBarPercent
                      valor={formatarPercentual(item.percentual, 2)}
                      percentual={item.percentual}
                      classe={item.classe}
                    />
                  ),
                },
                {
                  id: "percentualAcumulado",
                  header: <>% Acumulado</>,
                  kind: "percent",
                  value: (item) => item.percentualAcumulado,
                  cell: (item) => <>{formatarPercentual(item.percentualAcumulado, 1)}</>,
                },
              ]}
              renderDetalhe={(item) => (
                <div className="flex flex-wrap gap-4 px-3 py-2 text-[11px] text-muted-foreground">
                  <span>
                    Faturamento:{" "}
                    <strong className="num text-foreground">{formatarMoeda(item.faturamento)}</strong>
                  </span>
                  <span>
                    Lucro bruto: <strong className="num text-foreground">{formatarMoeda(item.lucro)}</strong>
                  </span>
                  <span>
                    Custo de reposição:{" "}
                    <strong className="num text-foreground">{formatarMoeda(item.custo)}</strong>
                  </span>
                </div>
              )}
              modoDetalhe="fechado"
            />

            <Dependencia
              titulo="Dependência de fornecedores"
              metrica={metrica}
              top10={curvaFornecedor.concentracaoTop10}
              top20={curvaFornecedor.concentracaoTop20}
              legenda="fornecedores"
            />

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {formatarNumero(curvaFornecedor.totalFornecedores, 0)} fornecedor(es) na classificação ·
              o lucro bruto considera apenas itens com custo de reposição informado.
            </p>
          </>
        )}
      </div>
    </ReportVisaoProvider>
  );
}
