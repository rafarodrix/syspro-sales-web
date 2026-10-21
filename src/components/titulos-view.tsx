"use client";

import { useMemo, useState } from "react";
import { BanknoteArrowDown, BanknoteArrowUp } from "lucide-react";
import { toast } from "sonner";
import { AnalysisQueryCard } from "@/components/analytics/analysis-query-card";
import { MetricsStrip } from "@/components/analytics/metrics-strip";
import { DataFilterBar } from "@/components/data-filter-bar";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { DateRangeFilter, periodoMesAtual, type Periodo } from "@/components/date-range-filter";
import { FiltroRelatorio } from "@/components/relatorios/filtro-relatorio";
import { ExportDropdown } from "@/components/export-dropdown";
import { FeedbackState } from "@/components/feedback-state";
import { StatusRelatorio } from "@/components/relatorios/ui/status-relatorio";
import { ReportTable } from "@/components/relatorios/report-table";
import { Skeleton } from "@/components/ui/skeleton";
import { dataInputParaSyspro } from "@/lib/vendas";
import { formatarDataInputParaBR } from "@/lib/vendas";
import { formatarMoeda, formatarNumero } from "@/lib/formatters";
import { exportarParaCSV } from "@/lib/exportar-csv";
import { faixasAging, type CategoriaTitulo, type ResumoTitulos, type TituloNormalizado } from "@/lib/titulos";

interface RespostaTitulos {
  categoria: CategoriaTitulo;
  empresaNome: string;
  periodo: { inicial: string; final: string };
  consultadoEm: string;
  ignoradosPorEmpresa: number;
  avisoEmpresa?: boolean;
  itens: TituloNormalizado[];
  resumo: ResumoTitulos;
  error?: string;
  rotaNaoAutorizada?: boolean;
}

export function TitulosView({
  empresaId,
  categoria,
}: {
  empresaId: string;
  categoria: CategoriaTitulo;
}) {
  const [modo, setModo] = useState<"aberto" | "pagos" | "todos">("aberto");
  const [personalizado, setPersonalizado] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoMesAtual());
  const [consultado, setConsultado] = useState<Periodo | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [naoAutorizada, setNaoAutorizada] = useState(false);
  const [dados, setDados] = useState<RespostaTitulos | null>(null);

  const titulo = categoria === "pagar" ? "Contas a Pagar" : "Contas a Receber";
  const Icone = categoria === "pagar" ? BanknoteArrowDown : BanknoteArrowUp;

  async function consultar(alvo: Periodo = periodo) {
    setLoading(true);
    setErro(null);
    setNaoAutorizada(false);
    try {
      const resposta = await fetch("/api/financeiro/titulos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          categoria,
          modo,
          ...(personalizado
            ? {
                dtInicial: dataInputParaSyspro(alvo.inicial),
                dtFinal: dataInputParaSyspro(alvo.final),
              }
            : {}),
        }),
      });
      const json = (await resposta.json().catch(() => ({}))) as RespostaTitulos;
      if (!resposta.ok) {
        setNaoAutorizada(Boolean(json.rotaNaoAutorizada));
        throw new Error(json.error || "Erro ao consultar títulos.");
      }
      setDados(json);
      setConsultado(alvo);
      toast.success(`${json.itens.length} título(s) em ${titulo.toLowerCase()}.`);
    } catch (causa) {
      setDados(null);
      setErro(causa instanceof Error ? causa.message : "Erro ao consultar títulos.");
    } finally {
      setLoading(false);
    }
  }

  const itens = useMemo(() => dados?.itens ?? [], [dados]);
  const aging = useMemo(() => faixasAging(itens), [itens]);
  const [somenteVencidos, setSomenteVencidos] = useState(false);
  const [faixa, setFaixa] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  // Compromisso da semana: o número que o financeiro abre a tela para ver.
  const proximos7 = useMemo(() => {
    const limite = new Date();
    limite.setUTCDate(limite.getUTCDate() + 7);
    const iso = limite.toISOString().slice(0, 10);
    const hojeIso = new Date().toISOString().slice(0, 10);
    return itens
      .filter((item) => item.situacao !== "pago" && item.vencimento && item.vencimento >= hojeIso && item.vencimento <= iso)
      .reduce((acc, item) => ({ valor: acc.valor + item.saldo, quantidade: acc.quantidade + 1 }), { valor: 0, quantidade: 0 });
  }, [itens]);

  // Quem mais pesa no saldo em aberto.
  const topParticipantes = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const item of itens) {
      if (item.situacao === "pago") continue;
      mapa.set(item.participante, (mapa.get(item.participante) ?? 0) + item.saldo);
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [itens]);

  const itensVisiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return itens.filter((item) => {
      if (somenteVencidos && item.situacao !== "vencido") return false;
      if (faixa) {
        const dias = item.diasAtraso;
        const emFaixa =
          faixa === "A vencer"
            ? item.situacao === "aberto"
            : item.situacao === "vencido" &&
              (faixa === "0 a 30 dias" ? dias <= 30
                : faixa === "31 a 60 dias" ? dias > 30 && dias <= 60
                  : faixa === "61 a 90 dias" ? dias > 60 && dias <= 90
                    : dias > 90);
        if (!emFaixa) return false;
      }
      if (!termo) return true;
      return [item.participante, item.numero, item.formaPagto ?? ""]
        .some((valor) => String(valor).toLowerCase().includes(termo));
    });
  }, [busca, faixa, itens, somenteVencidos]);

  function exportar() {
    if (!itens.length) {
      toast.error("Nada para exportar.");
      return;
    }
    exportarParaCSV(
      `${categoria}-${(dados?.empresaNome ?? "empresa").replace(/[^\w-]+/g, "-").toLowerCase()}-${consultado?.inicial ?? ""}-a-${consultado?.final ?? ""}`,
      [
        "Empresa",
        "Participante",
        "Título",
        "Emissão",
        "Vencimento",
        "Baixa",
        "Valor",
        "Acréscimo",
        "Desconto",
        "Valor pago",
        "Saldo",
        "Situação",
        "Dias de atraso",
        "Forma de pagamento",
      ],
      itens.map((item) => [
        item.empresaNome,
        item.participante,
        item.numero,
        item.emissao ?? "",
        item.vencimento ?? "",
        item.baixa ?? "",
        item.valor,
        item.acrescimo,
        item.desconto,
        item.valorPago,
        item.saldo,
        item.situacao,
        item.diasAtraso,
        item.formaPagto ?? "",
      ]),
    );
    toast.success(`${itens.length} título(s) exportado(s).`);
  }

  return (
    <div className="flex flex-col gap-6">
      <AnalysisQueryCard
        icon={Icone}
        title={titulo}
        description={`Títulos do Syspro com vencimento no período consultado.`}
        footer="Rota de exportação do Syspro: os valores vêm da própria base, sem recálculo."
      >
        <div className="flex flex-wrap items-end gap-2">
          <FiltroRelatorio
            rotulo="Situação dos títulos"
            valor={modo}
            largura="w-52"
            opcoes={[
              { valor: "aberto", rotulo: "Em aberto (vencidos + a vencer)" },
              { valor: "pagos", rotulo: "Somente pagos" },
              { valor: "todos", rotulo: "Todos" },
            ]}
            onChange={(valor) => setModo(valor as "aberto" | "pagos" | "todos")}
          />
          <Button
            type="button"
            size="sm"
            variant={personalizado ? "secondary" : "outline"}
            className="h-9 text-xs"
            aria-pressed={personalizado}
            onClick={() => setPersonalizado((atual) => !atual)}
          >
            {personalizado ? "Período personalizado" : "Escolher período"}
          </Button>
          {personalizado ? (
            <DateRangeFilter
              value={periodo}
              onChange={setPeriodo}
              onConsultar={consultar}
              loading={loading}
            />
          ) : (
            <Button size="sm" className="h-9" disabled={loading} onClick={() => consultar()}>
              {loading ? "Consultando..." : "Consultar"}
            </Button>
          )}
        </div>
      </AnalysisQueryCard>

      {erro ? (
        <FeedbackState
          variant={naoAutorizada ? "empty" : "error"}
          title={naoAutorizada ? "Rota ainda não liberada no Syspro" : "Não foi possível consultar"}
          description={erro}
          onRetry={naoAutorizada ? undefined : () => consultar()}
        />
      ) : null}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : dados ? (
        <>
          <MetricsStrip
            itens={[
              {
                rotulo: "Vence em 7 dias",
                valor: formatarMoeda(proximos7.valor),
                detalhe: `${formatarNumero(proximos7.quantidade, 0)} título(s)`,
                attention: proximos7.valor > 0,
                definicao: "Saldo em aberto com vencimento entre hoje e os próximos 7 dias.",
              },
              {
                rotulo: "Títulos",
                valor: formatarNumero(dados.resumo.quantidade, 0),
                detalhe: `${formatarNumero(dados.resumo.participantes, 0)} participante(s)`,
                definicao: "Quantidade de títulos retornados para o período consultado.",
              },
              {
                rotulo: "Valor total",
                valor: formatarMoeda(dados.resumo.valorTotal),
                detalhe: `pago ${formatarMoeda(dados.resumo.valorPago)}`,
                definicao: "Soma do valor dos títulos e do valor já liquidado (baixa).",
              },
              {
                rotulo: "Em aberto",
                valor: formatarMoeda(dados.resumo.emAberto),
                detalhe: `${formatarNumero(dados.resumo.quantidadeVencidos, 0)} vencido(s)`,
                definicao: "Saldo dos títulos sem baixa (valor + acréscimo − desconto − pago).",
                attention: dados.resumo.emAberto > 0 && dados.resumo.vencido > 0,
              },
              {
                rotulo: "Vencido",
                valor: formatarMoeda(dados.resumo.vencido),
                detalhe: `atraso médio ${formatarNumero(dados.resumo.atrasoMedioDias, 0)} dia(s)`,
                definicao:
                  "Saldo em aberto com vencimento anterior a hoje. O atraso médio é ponderado pelo valor.",
                attention: dados.resumo.vencido > 0,
              },
              {
                rotulo: "A vencer",
                valor: formatarMoeda(dados.resumo.aVencer),
                detalhe: dados.resumo.proximoVencimento
                  ? `próximo ${formatarDataInputParaBR(dados.resumo.proximoVencimento)}`
                  : undefined,
                definicao: "Saldo em aberto com vencimento hoje ou à frente.",
              },
            ]}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={faixa === null ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => setFaixa(null)}
            >
              Todas as faixas
            </Button>
            {aging.map((faixaItem) => (
              <Button
                key={faixaItem.rotulo}
                type="button"
                size="sm"
                variant={faixa === faixaItem.rotulo ? "default" : "outline"}
                className="h-8 gap-2 text-xs"
                title={`${faixaItem.quantidade} título(s) · clique para filtrar a tabela`}
                onClick={() => setFaixa((atual) => (atual === faixaItem.rotulo ? null : faixaItem.rotulo))}
              >
                <span>{faixaItem.rotulo}</span>
                <span className="font-mono font-bold">{formatarMoeda(faixaItem.valor)}</span>
              </Button>
            ))}
          </div>

          {topParticipantes.length ? (
            <div className="rounded-lg bg-muted/25 p-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Maiores saldos em aberto
              </p>
              <ul className="grid gap-1 sm:grid-cols-2 xl:grid-cols-5">
                {topParticipantes.map(([nome, valor]) => (
                  <li key={nome} className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-medium text-foreground" title={nome}>{nome}</span>
                    <span className="font-mono text-xs font-semibold tabular-nums">{formatarMoeda(valor)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <DataFilterBar
              busca={busca}
              onBuscaChange={setBusca}
              placeholder="Buscar participante, título ou forma..."
              temFiltrosAtivos={Boolean(busca) || somenteVencidos}
              onLimpar={() => {
                setBusca("");
                setSomenteVencidos(false);
              }}
            >
              <Button
                type="button"
                size="sm"
                variant={somenteVencidos ? "default" : "outline"}
                className="h-9 text-xs"
                aria-pressed={somenteVencidos}
                onClick={() => setSomenteVencidos((atual) => !atual)}
              >
                Somente vencidos
              </Button>
            </DataFilterBar>
          </div>

          <ReportTable<TituloNormalizado>
            label="títulos"
            caption={`${titulo} por vencimento`}
            data={itensVisiveis}
            rowKey={(item) => `${item.empresaCodigo}-${item.numero}-${item.vencimento ?? ""}`}
            rodape={() => {
              const total = itensVisiveis.reduce(
                (acc, item) => ({
                  valor: acc.valor + item.valor,
                  pago: acc.pago + item.valorPago,
                  saldo: acc.saldo + item.saldo,
                }),
                { valor: 0, pago: 0, saldo: 0 },
              );
              return (
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    {formatarNumero(itensVisiveis.length, 0)} título(s)
                  </TableCell>
                  <TableCell className="text-right">{formatarMoeda(total.valor)}</TableCell>
                  <TableCell className="text-right">{formatarMoeda(total.pago)}</TableCell>
                  <TableCell className="text-right">{formatarMoeda(total.saldo)}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              );
            }}
            showExport={false}
            acoesExtras={
              <ExportDropdown onExportarCsv={exportar} disabled={!itens.length} label="Exportar" />
            }
            columns={[
              {
                id: "participante",
                header: <>Participante</>,
                kind: "name",
                value: (item) => item.participante,
                cell: (item) => <span className="text-xs font-medium">{item.participante}</span>,
              },
              {
                id: "numero",
                header: <>Título</>,
                kind: "name",
                value: (item) => item.numero,
                cell: (item) => <span className="font-mono text-xs">{item.numero}</span>,
              },
              {
                id: "emissao",
                header: <>Emissão</>,
                kind: "date",
                value: (item) => item.emissao,
                cell: (item) => <span className="text-xs">{item.emissao ? formatarDataInputParaBR(item.emissao) : "—"}</span>,
              },
              {
                id: "vencimento",
                header: <>Vencimento</>,
                kind: "date",
                value: (item) => item.vencimento,
                cell: (item) => <span className="text-xs">{item.vencimento ? formatarDataInputParaBR(item.vencimento) : "—"}</span>,
              },
              {
                id: "valor",
                header: <>Valor</>,
                kind: "currency",
                value: (item) => item.valor,
                cell: (item) => <>{formatarMoeda(item.valor)}</>,
              },
              {
                id: "pago",
                header: <>Pago</>,
                kind: "currency",
                value: (item) => item.valorPago,
                cell: (item) => <>{formatarMoeda(item.valorPago)}</>,
              },
              {
                id: "saldo",
                header: <>Saldo</>,
                kind: "currency",
                value: (item) => item.saldo,
                cell: (item) => <span className="font-semibold">{formatarMoeda(item.saldo)}</span>,
              },
              {
                id: "situacao",
                header: <>Situação</>,
                kind: "name",
                value: (item) => item.situacao,
                cell: (item) => (
                  <span
                    className={
                      item.situacao === "pago"
                        ? "text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                        : item.situacao === "vencido"
                          ? "text-xs font-semibold text-rose-700 dark:text-rose-400"
                          : "text-xs text-muted-foreground"
                    }
                  >
                    {item.situacao === "pago" ? "Pago" : item.situacao === "vencido" ? `Vencido (${item.diasAtraso}d)` : "A vencer"}
                  </span>
                ),
              },
              {
                id: "forma",
                header: <>Forma</>,
                kind: "name",
                value: (item) => item.formaPagto ?? "",
                cell: (item) => <span className="text-xs text-muted-foreground">{item.formaPagto ?? "—"}</span>,
              },
            ]}
          />

          <StatusRelatorio
            itens={[
              {
                rotulo: "Universo",
                valor: `${formatarNumero(dados.itens.length, 0)} título(s) · ${dados.empresaNome}`,
                definicao: "Títulos devolvidos pela API de exportação para a empresa selecionada.",
              },
              {
                rotulo: "Período",
                valor: `${formatarDataInputParaBR(dados.periodo.inicial)} a ${formatarDataInputParaBR(dados.periodo.final)} · ${new Date(dados.consultadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
              },
              ...(dados.avisoEmpresa
                ? [
                    {
                      rotulo: "Atenção",
                      valor: "base devolveu outra empresa_codigo",
                      destaque: true,
                      definicao:
                        "O Syspro retornou registros com empresa_codigo diferente da empresa selecionada. Os dados foram exibidos para não deixar a tela vazia — confira se a filial está correta no cadastro da empresa.",
                    },
                  ]
                : []),
              ...(dados.ignoradosPorEmpresa > 0
                ? [
                    {
                      rotulo: "Descartados",
                      valor: `${formatarNumero(dados.ignoradosPorEmpresa, 0)} de outra empresa`,
                      destaque: true,
                      definicao:
                        "Registros devolvidos com empresa_codigo diferente da selecionada foram descartados para não misturar dados entre empresas.",
                    },
                  ]
                : []),
            ]}
          />
        </>
      ) : null}
    </div>
  );
}
