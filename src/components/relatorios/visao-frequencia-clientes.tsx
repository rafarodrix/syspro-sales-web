import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { TablePagination } from "@/components/table-pagination";
import { FeedbackState } from "@/components/feedback-state";
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
import { ExportarVisao, type ContextoExportacao } from "./exportar-visao";
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
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(25);
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
  const paginaSegura = Math.min(
    pagina,
    Math.max(1, Math.ceil(itens.length / porPagina)),
  );
  const exibidos = itens.slice(
    (paginaSegura - 1) * porPagina,
    paginaSegura * porPagina,
  );
  const meses = relatorio.meses.map(
    (mes) => `${mes.slice(5)}/${mes.slice(0, 4)}`,
  );
  const observacoes = `Frequência em ${relatorio.unidade}; meses sem compra incluídos. Média da carteira: ${formatarNumero(relatorio.media, 2)}; mediana: ${formatarNumero(relatorio.mediana, 2)}. Referência: ${relatorio.ativos} clientes identificados com data de compra válida, antes dos filtros. ${relatorio.comparar ? `Anterior: ${periodoAnterior}. Variação de frequência normalizada por 30 dias.` : "Comparativo indisponível."} Última compra observada nas janelas consultadas; dias sem compra até o final do período atual. Agrupamento por nome, sujeito a homônimos. Consumidor genérico excluído. — indica dado indisponível ou base anterior zero.`;
  const colunas = [
    "Cliente",
    "Cidade",
    "UF",
    "Classe atual",
    "Situação",
    ...meses.map((mes) => `Dias ${mes}`),
    "Dias com compra",
    `Frequência (${relatorio.unidade})`,
    "Meses com compra",
    "Intervalo médio (dias)",
    "Última compra observada",
    "Dias sem compra",
    "Frequência anterior/30 dias",
    "Frequência atual/30 dias",
    "Variação frequência (%)",
    "Faturamento anterior",
    "Faturamento atual",
    "Variação faturamento (%)",
    "Média carteira",
    "Mediana carteira",
    "Período anterior comparado",
  ];
  const linhas = itens.map((item) => [
    item.nome,
    item.cidade,
    item.uf,
    item.classe ?? "—",
    situacoes[item.situacao],
    ...item.porMes,
    item.diasComCompra,
    formatarNumero(item.frequencia, 2),
    `${item.mesesComCompra}/${meses.length}`,
    item.intervaloMedio === null ? "—" : formatarNumero(item.intervaloMedio, 1),
    item.ultimaCompra ? formatarDataInputParaBR(item.ultimaCompra) : "—",
    item.diasSemCompra ?? "—",
    item.frequenciaAnterior30 === null
      ? "—"
      : formatarNumero(item.frequenciaAnterior30, 2),
    formatarNumero(item.frequenciaAtual30, 2),
    variacao(item.variacaoFrequencia),
    item.faturamentoAnterior === null
      ? "—"
      : formatarMoeda(item.faturamentoAnterior),
    formatarMoeda(item.faturamento),
    variacao(item.variacaoFaturamento),
    formatarNumero(relatorio.media, 2),
    formatarNumero(relatorio.mediana, 2),
    relatorio.comparar ? (periodoAnterior ?? "—") : "Indisponível",
  ]);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            titulo: "Clientes identificados",
            valor: formatarNumero(relatorio.ativos, 0),
            descricao: "Com compra no período",
          },
          {
            titulo: "Frequência média",
            valor: formatarNumero(relatorio.media, 2),
            descricao: relatorio.unidade,
          },
          {
            titulo: "Mediana",
            valor: formatarNumero(relatorio.mediana, 2),
            descricao: relatorio.unidade,
          },
        ].map((card) => (
          <Card key={card.titulo}>
            <CardHeader>
              <CardTitle>{card.titulo}</CardTitle>
              <CardDescription>{card.descricao}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {card.valor}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <FiltroRelatorio
          rotulo="Filtrar frequência"
          valor={segmento}
          onChange={(valor) => {
            setSegmento(valor as SegmentoFrequencia);
            setPagina(1);
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
        <FiltroRelatorio
          rotulo="Ordenar frequência"
          valor={ordem}
          onChange={(valor) => {
            setOrdem(valor);
            setPagina(1);
          }}
          opcoes={[
            { valor: "frequencia", rotulo: "Maior frequência" },
            { valor: "regularidade", rotulo: "Mais meses com compra" },
            { valor: "ausencia", rotulo: "Mais dias sem compra" },
            { valor: "faturamento", rotulo: "Maior faturamento" },
          ]}
        />
        <ExportarVisao
          titulo="Clientes - Frequência"
          contexto={contexto}
          colunas={colunas}
          linhas={linhas}
          observacoes={observacoes}
        />
      </div>
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
      {itens.length === 0 ? (
        <FeedbackState
          variant="empty"
          title="Nenhum cliente neste recorte"
          description="Revise a busca e os filtros."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <caption className="p-3 text-left font-semibold">
                Dias com compra por mês
              </caption>
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th scope="col" className="p-3">
                    Cliente
                  </th>
                  {meses.map((mes) => (
                    <th scope="col" key={mes} className="p-3 text-center">
                      {mes}
                    </th>
                  ))}
                  <th scope="col" className="p-3 text-center">
                    Regularidade
                  </th>
                </tr>
              </thead>
              <tbody>
                {exibidos.map((item) => (
                  <tr key={item.nome} className="border-b last:border-0">
                    <th scope="row" className="min-w-44 p-3 text-left">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => onAbrirNotas(item.nome)}
                      >
                        {item.nome}
                      </Button>
                    </th>
                    {item.porMes.map((dias, i) => (
                      <td key={meses[i]} className="p-2 text-center">
                        <button
                          type="button"
                          aria-label={`Compras de ${item.nome} em ${meses[i]}`}
                          onClick={() =>
                            onAbrirNotas(item.nome, relatorio.meses[i])
                          }
                          className={cn(
                            "min-w-10 cursor-pointer rounded p-2 tabular-nums focus-visible:outline-2 focus-visible:outline-primary",
                            dias === 0
                              ? "bg-muted/30 text-muted-foreground"
                              : dias <= 2
                                ? "bg-primary/10"
                                : dias <= 5
                                  ? "bg-primary/25"
                                  : "bg-primary text-primary-foreground",
                          )}
                        >
                          {dias}
                        </button>
                      </td>
                    ))}
                    <td className="p-3 text-center">
                      {item.mesesComCompra}/{meses.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <caption className="p-3 text-left font-semibold">
                Frequência por cliente
              </caption>
              <thead>
                <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                  {[
                    "Cliente",
                    "Frequência",
                    "Vs. média",
                    "Intervalo médio",
                    "Última compra",
                    "Dias sem compra",
                    "Faturamento",
                  ].map((titulo) => (
                    <th
                      key={titulo}
                      scope="col"
                      className="whitespace-nowrap p-3"
                    >
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exibidos.map((item) => (
                  <tr
                    key={item.nome}
                    className="border-b last:border-0 hover:bg-muted/20"
                  >
                    <td className="min-w-44 p-3">
                      <div className="flex flex-col items-start gap-1">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => onAbrirNotas(item.nome)}
                        >
                          {item.nome}
                        </Button>
                        <Badge variant="outline">
                          {situacoes[item.situacao]}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      <span className="font-semibold">
                        {formatarNumero(item.frequencia, 2)}
                      </span>
                      <span
                        className="block text-[11px] text-muted-foreground"
                        title="Variação em relação ao período comparado; taxas normalizadas por 30 dias"
                      >
                        {variacao(item.variacaoFrequencia)}
                      </span>
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {relatorio.ativos
                        ? `${item.frequencia >= relatorio.media ? "+" : ""}${formatarNumero(item.frequencia - relatorio.media, 2)}`
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap p-3 text-right">
                      {item.intervaloMedio === null
                        ? "—"
                        : `${formatarNumero(item.intervaloMedio, 1)} dias`}
                    </td>
                    <td className="p-3">
                      {item.ultimaCompra
                        ? formatarDataInputParaBR(item.ultimaCompra)
                        : "—"}
                    </td>
                    <td className="p-3 text-right">
                      {item.diasSemCompra ?? "—"}
                    </td>
                    <td className="whitespace-nowrap p-3 text-right">
                      {formatarMoeda(item.faturamento)}
                      <span className="block text-[11px] text-muted-foreground">
                        {variacao(item.variacaoFaturamento)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <TablePagination
        paginaAtual={paginaSegura}
        totalItens={itens.length}
        itensPorPagina={porPagina}
        onPaginaChange={setPagina}
        onItensPorPaginaChange={(valor) => {
          setPorPagina(valor);
          setPagina(1);
        }}
        labelItens="clientes"
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
            Percentuais sob frequência e faturamento comparam as janelas
            completas. A variação de frequência usa taxas por 30 dias. — indica
            comparação sem base ou dado indisponível.
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
