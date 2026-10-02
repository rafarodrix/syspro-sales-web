import { useMemo, useState } from "react";
import { ReportTable } from "./report-table";
import {
  ReportToolbar,
  ReportFilters,
  ReportMetricStrip,
} from "./report-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
} from "@/lib/formatters";
import { formatarDataInputParaBR } from "@/lib/vendas";
import {
  filtrarFrequencia,
  type RelatorioFrequencia,
  type SegmentoFrequencia,
} from "@/lib/clientes-frequencia";
import { cn } from "@/lib/utils";
import type { ContextoExportacao } from "./exportar-visao";
import { FiltroRelatorio } from "./filtro-relatorio";

const situacoes = {
  ambos: "Comprou nos dois períodos",
  "so-atual": "Compra só no atual",
  "sem-compra": "Sem compra no atual",
  "sem-comparativo": "Comparativo indisponível",
};
const variacao = (valor: number | null) =>
  valor === null
    ? "—"
    : `${valor > 0 ? "+" : ""}${formatarPercentual(valor, 1)}`;

export function VisaoFrequenciaClientes({
  relatorio,
  busca,
  classe,
  contexto,
  periodoAnterior,
  onAbrirNotas,
}: {
  relatorio: RelatorioFrequencia;
  busca: string;
  classe: string;
  contexto: ContextoExportacao;
  periodoAnterior: string | undefined;
  onAbrirNotas: (nome: string, mes?: string) => void;
}) {
  const [segmento, setSegmento] = useState<SegmentoFrequencia>("todos");
  const [ordem, setOrdem] = useState("frequencia");
  const itens = useMemo(() => {
    const filtrados = filtrarFrequencia(
      relatorio.itens,
      busca,
      classe,
      segmento,
    );
    return filtrados.sort((a, b) => {
      const diferenca =
        ordem === "faturamento"
          ? b.faturamento - a.faturamento
          : ordem === "ausencia"
            ? (b.diasSemCompra ?? -1) - (a.diasSemCompra ?? -1)
            : ordem === "regularidade"
              ? b.mesesComCompra - a.mesesComCompra
              : b.frequencia - a.frequencia;
      return diferenca || a.nome.localeCompare(b.nome, "pt-BR");
    });
  }, [relatorio, busca, classe, segmento, ordem]);
  const meses = relatorio.meses.map(
    (mes) => `${mes.slice(5)}/${mes.slice(0, 4)}`,
  );
  const observacoes = `Frequência em ${relatorio.unidade}; meses sem compra incluídos. Média da carteira: ${formatarNumero(relatorio.media, 2)}; mediana: ${formatarNumero(relatorio.mediana, 2)}. Referência: ${relatorio.ativos} clientes identificados com data de compra válida, antes dos filtros. ${relatorio.comparar ? `Anterior: ${periodoAnterior}. Variação de frequência normalizada por 30 dias.` : "Comparativo indisponível."} Última compra observada nas janelas consultadas; dias sem compra até o final do período atual. Agrupamento por nome, sujeito a homônimos. Consumidor genérico excluído. — indica dado indisponível ou base anterior zero.`;

  return (
    <div className="flex flex-col gap-3">
      <ReportMetricStrip
        items={[
          {
            label: "Clientes com compra",
            value: formatarNumero(relatorio.ativos, 0),
          },
          {
            label: "Frequência média",
            value: formatarNumero(relatorio.media, 2),
          },
          { label: "Mediana", value: formatarNumero(relatorio.mediana, 2) },
          {
            label: "Sem compra no atual",
            value: relatorio.comparar
              ? relatorio.itens.filter((item) => item.situacao === "sem-compra")
                  .length
              : "—",
            attention: relatorio.itens.some(
              (item) => item.situacao === "sem-compra",
            ),
          },
          {
            label: "Queda de frequência",
            value: relatorio.comparar
              ? relatorio.itens.filter(
                  (item) =>
                    item.variacaoFrequencia !== null &&
                    item.variacaoFrequencia < 0,
                ).length
              : "—",
          },
        ]}
      />
      <ReportToolbar>
        <ReportFilters
          count={segmento === "todos" ? 0 : 1}
          onClear={() => {
            setSegmento("todos");
            
          }}
        >
          <FiltroRelatorio
            rotulo="Filtrar frequência"
            valor={segmento}
            onChange={(valor) => {
              setSegmento(valor as SegmentoFrequencia);
              
            }}
            opcoes={[
              { valor: "todos", rotulo: "Todos os clientes" },
              { valor: "regulares", rotulo: "Todos os meses" },
              { valor: "unico-dia", rotulo: "Compra em um dia" },
              {
                valor: "sem-compra",
                rotulo: "Sem compra no atual",
                disabled: !relatorio.comparar,
              },
            ]}
          />
        </ReportFilters>
        <FiltroRelatorio
          rotulo="Ordenar frequência"
          valor={ordem}
          onChange={(valor) => {
            setOrdem(valor);
            
          }}
          opcoes={[
            { valor: "frequencia", rotulo: "Maior frequência" },
            { valor: "regularidade", rotulo: "Mais meses com compra" },
            { valor: "ausencia", rotulo: "Mais dias sem compra" },
            { valor: "faturamento", rotulo: "Maior faturamento" },
          ]}
        />

      </ReportToolbar>
      <p className="text-xs text-muted-foreground">
        Referência: carteira inteira, antes dos filtros. Frequência em{" "}
        {relatorio.unidade}.{" "}
        {relatorio.comparar
          ? `Comparado: ${periodoAnterior}.`
          : "Comparativo indisponível."}
      </p>
      {relatorio.registrosSemData > 0 ? (
        <p role="status" className="text-sm text-destructive">
          {relatorio.registrosSemData} registro(s) sem data válida; frequência
          pode estar subestimada.
        </p>
      ) : null}
      <ReportTable
        data={itens}
        rowKey={(item) => item.nome}
        label="clientes"
        caption="Frequência por cliente"
        stickyFirst
        exportObservacoes={observacoes}
        columns={[
          {
            id: "cliente",
            header: "Cliente",
            kind: "name",
            value: (item) => item.nome,
            cell: (item) => (
              <Button
                variant="link"
                size="sm"
                onClick={() => onAbrirNotas(item.nome)}
              >
                {item.nome}
              </Button>
            ),
          },
          {
            id: "classe",
            header: "Classe",
            kind: "name",
            value: (item) => item.classe ?? "—",
            cell: (item) => item.classe ?? "—",
          },
          {
            id: "situacao",
            header: "Situação",
            kind: "name",
            value: (item) => situacoes[item.situacao],
            cell: (item) => (
              <Badge variant="outline">{situacoes[item.situacao]}</Badge>
            ),
          },
          {
            id: "frequencia",
            header: "Frequência",
            kind: "number",
            value: (item) => item.frequencia,
            exportValue: (item) => formatarNumero(item.frequencia, 2),
            cell: (item) => (
              <span
                title={`Média da carteira: ${formatarNumero(relatorio.media, 2)} ${relatorio.unidade}`}
                className="font-semibold"
              >
                {formatarNumero(item.frequencia, 2)}
              </span>
            ),
          },
          {
            id: "regularidade",
            header: "Regularidade",
            kind: "name",
            value: (item) => `${item.mesesComCompra}/${meses.length}`,
            cell: (item) => `${item.mesesComCompra}/${meses.length}`,
          },
          {
            id: "intervalo",
            header: "Intervalo médio",
            kind: "number",
            value: (item) => item.intervaloMedio,
            exportValue: (item) =>
              item.intervaloMedio === null
                ? "—"
                : `${formatarNumero(item.intervaloMedio, 1)} d`,
            cell: (item) =>
              item.intervaloMedio === null
                ? "—"
                : `${formatarNumero(item.intervaloMedio, 1)} d`,
          },
          ...relatorio.meses.map((mes, i) => ({
            id: mes,
            header: meses[i],
            kind: "month" as const,
            value: (item: RelatorioFrequencia["itens"][number]) => item.porMes[i],
            cell: (item: RelatorioFrequencia["itens"][number]) => (
              <button
                type="button"
                aria-label={`Compras de ${item.nome} em ${meses[i]}`}
                onClick={() => onAbrirNotas(item.nome, mes)}
                className={cn(
                  "h-7 min-w-8 cursor-pointer rounded px-1.5 tabular-nums focus-visible:outline-2 focus-visible:outline-primary",
                  item.porMes[i] === 0
                    ? "bg-muted text-muted-foreground"
                    : item.porMes[i] <= 2
                      ? "bg-primary/10"
                      : item.porMes[i] <= 5
                        ? "bg-primary/25"
                        : "bg-primary text-primary-foreground",
                )}
              >
                {item.porMes[i]}
              </button>
            ),
          })),
          {
            id: "ultima",
            header: "Última compra",
            kind: "date",
            value: (item) => item.ultimaCompra,
            exportValue: (item) =>
              item.ultimaCompra ? formatarDataInputParaBR(item.ultimaCompra) : "—",
            cell: (item) =>
              item.ultimaCompra
                ? formatarDataInputParaBR(item.ultimaCompra)
                : "—",
          },
          {
            id: "ausencia",
            header: "Dias sem compra",
            kind: "number",
            value: (item) => item.diasSemCompra,
            cell: (item) => item.diasSemCompra ?? "—",
          },
          {
            id: "faturamento",
            header: "Faturamento",
            kind: "currency",
            value: (item) => item.faturamento,
            cell: (item) => formatarMoeda(item.faturamento),
          },
          {
            id: "variacao-frequencia",
            header: "Δ Frequência",
            kind: "percent",
            value: (item) => item.variacaoFrequencia,
            exportValue: (item) => variacao(item.variacaoFrequencia),
            cell: (item) => variacao(item.variacaoFrequencia),
          },
          {
            id: "variacao-faturamento",
            header: "Δ Faturamento",
            kind: "percent",
            value: (item) => item.variacaoFaturamento,
            exportValue: (item) => variacao(item.variacaoFaturamento),
            cell: (item) => variacao(item.variacaoFaturamento),
          },
        ]}
      />

      <details className="rounded-md border p-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium">
          Como calculamos
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          <p>
            {relatorio.mesesCompletos
              ? `Dias distintos com compra ÷ ${meses.length} mês(es), incluindo meses zerados.`
              : "Dias distintos com compra ÷ dias corridos do período × 30. Meses parciais incluem somente as datas selecionadas."}{" "}
            Várias notas no mesmo dia contam uma vez; compras não comprovam
            visitas físicas.
          </p>
          <p>
            Variações de frequência e faturamento comparam as janelas completas.
            A variação de frequência usa taxas por 30 dias. — indica comparação
            sem base ou dado indisponível.
          </p>
          <p>
            Intervalo médio exige duas datas de compra. Dias sem compra são
            contados até {formatarDataInputParaBR(contexto.periodo.final)}; a
            última compra é a observada nas janelas consultadas.
          </p>
          <p>
            A classe ABC é a do período atual. “Compra só no atual” não comprova
            aquisição; “sem compra” não comprova perda. Consumidor genérico
            excluído: {formatarMoeda(relatorio.faturamentoNaoIdentificado)},
            mantido no Resumo.
          </p>
          <p>
            Intensidade da grade: 0 · 1–2 · 3–5 · 6 ou mais dias com compra.
            Clique no mês para abrir o detalhe.
          </p>
        </div>
      </details>
    </div>
  );
}
