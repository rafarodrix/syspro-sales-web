"use client";

import { useEffect, useMemo, useState } from "react";
import { PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { AnalysisQueryCard } from "@/components/analytics/analysis-query-card";
import { MetricsStrip } from "@/components/analytics/metrics-strip";
import { DataFilterBar } from "@/components/data-filter-bar";
import { DateRangeFilter, periodoMesAtual, type Periodo } from "@/components/date-range-filter";
import { ExportDropdown } from "@/components/export-dropdown";
import { ReportTable, type ReportColumn } from "@/components/relatorios/report-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportarParaCSV } from "@/lib/exportar-csv";
import { formatarMoeda, formatarNumero } from "@/lib/formatters";
import type { CategoriaKardex, MovimentoKardexPublico } from "@/lib/kardex";
import { dataInputParaSyspro } from "@/lib/vendas";

interface EmpresaOption {
  id: string;
  cnpj: string;
  razaoSocial: string;
  grupoEstoquePadrao: string;
}

interface RespostaEstoque {
  movimentos: MovimentoKardexPublico[];
}

const rotulosCategoria: Record<CategoriaKardex, string> = {
  venda: "Vendas",
  devolucao_venda: "Devoluções de venda",
  compra: "Compras",
  devolucao_compra: "Devoluções de compra",
  transferencia: "Transferências",
  bonificacao: "Bonificações",
  fiscal: "Emissões fiscais (NF-e)",
  outros: "Outros movimentos",
};

function dataVisual(valor: string): string {
  const partes = valor.slice(0, 10).split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : valor || "—";
}

const colunasMovimento: ReportColumn<MovimentoKardexPublico>[] = [
  {
    id: "data",
    header: <>Data</>,
    kind: "date",
    value: (item) => item.dataMovimento,
    cell: (item) => <span className="text-xs">{dataVisual(item.dataMovimento)}</span>,
  },
  {
    id: "produto",
    header: <>Produto</>,
    kind: "name",
    value: (item) => item.produtoDescricao,
    cell: (item) => (
      <>
        <p className="text-xs font-medium">{item.produtoDescricao || "Produto sem descrição"}</p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {item.produtoCodigoAuxiliar || "Sem código auxiliar"}
        </p>
      </>
    ),
  },
  {
    id: "documento",
    header: <>Documento</>,
    kind: "name",
    value: (item) => item.documento,
    cell: (item) => <span className="font-mono text-xs">{item.documento || "—"}</span>,
  },
  {
    id: "tipo",
    header: <>Tipo</>,
    kind: "name",
    value: (item) => item.grupoDocumento,
    cell: (item) => (
      <div className="flex flex-col items-start gap-1">
        <Badge variant="outline">{item.grupoDocumento || "Sem grupo"}</Badge>
        <span className="text-[10px] text-muted-foreground">{item.classificacao.rotulo}</span>
      </div>
    ),
  },
  {
    id: "participante",
    header: <>Participante</>,
    kind: "name",
    value: (item) => item.participante,
    cell: (item) => <span className="text-xs">{item.participante || "—"}</span>,
  },
  {
    id: "direcao",
    header: <>Direção</>,
    kind: "name",
    value: (item) => item.direcao,
    cell: (item) => (
      <Badge variant={item.direcao === "entrada" ? "secondary" : "outline"}>
        {item.direcao === "entrada" ? "Entrada" : item.direcao === "saida" ? "Saída" : "Indefinida"}
      </Badge>
    ),
  },
  {
    id: "movimento",
    header: <>Movimento</>,
    kind: "number",
    value: (item) => item.quantidadeMovimentada,
    cell: (item) => <>{formatarNumero(Math.abs(item.quantidadeMovimentada), 2)}</>,
  },
  {
    id: "saldo",
    header: <>Saldo</>,
    kind: "number",
    value: (item) => item.saldo,
    cell: (item) => <span className="font-medium">{formatarNumero(item.saldo, 2)}</span>,
  },
  {
    id: "valor",
    header: <>Valor</>,
    kind: "currency",
    value: (item) => item.valorTotal,
    cell: (item) => <>{formatarMoeda(Math.abs(item.valorTotal))}</>,
  },
];

export function EstoqueView({ empresas, empresaInicial }: { empresas: EmpresaOption[]; empresaInicial?: string }) {
  const [empresaId, setEmpresaId] = useState(
    empresaInicial && empresas.some((empresa) => empresa.id === empresaInicial)
      ? empresaInicial
      : (empresas[0]?.id ?? ""),
  );
  const empresaAtual = empresas.find((empresa) => empresa.id === empresaId);
  const grupoPadrao = empresaAtual?.grupoEstoquePadrao?.trim().toUpperCase() || "GERAL";
  const [periodo, setPeriodo] = useState<Periodo>(periodoMesAtual());
  const [codigoAuxiliar, setCodigoAuxiliar] = useState("");
  const [codigoConsultado, setCodigoConsultado] = useState("");
  const [movimentos, setMovimentos] = useState<MovimentoKardexPublico[]>([]);
  const [consultado, setConsultado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroDirecao, setFiltroDirecao] = useState("todas");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroGrupoDocumento, setFiltroGrupoDocumento] = useState("todos");
  const [filtroGrupoEstoque, setFiltroGrupoEstoque] = useState("todos");

  useEffect(() => {
    if (!empresaInicial) return;
    const frame = requestAnimationFrame(() => setEmpresaId(empresaInicial));
    return () => cancelAnimationFrame(frame);
  }, [empresaInicial]);

  async function consultar(periodoConsulta: Periodo = periodo) {
    if (!empresaId) {
      toast.error("Selecione uma empresa.");
      return;
    }
    const codigo = codigoAuxiliar.trim();
    if (!codigo) {
      toast.error("Informe o código auxiliar do produto.");
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/estoque", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          codigoAuxiliar: codigo,
          dtInicial: dataInputParaSyspro(periodoConsulta.inicial),
          dtFinal: dataInputParaSyspro(periodoConsulta.final),
        }),
      });
      const dados = await resposta.json().catch(() => ({})) as Partial<RespostaEstoque> & { error?: string };
      if (!resposta.ok) throw new Error(dados.error || "Erro ao consultar o estoque.");
      const recebidos = dados.movimentos ?? [];
      setMovimentos(recebidos);
      setCodigoConsultado(codigo);
      setConsultado(true);
      limparFiltros();
      toast.success(`${recebidos.length} movimentação(ões) carregada(s) do Kardex.`);
    } catch (causa) {
      const mensagem = causa instanceof Error ? causa.message : "Erro ao consultar o estoque.";
      setErro(mensagem);
      setMovimentos([]);
      setCodigoConsultado("");
      setConsultado(false);
      toast.error(mensagem);
    } finally {
      setLoading(false);
    }
  }

  const gruposDocumento = useMemo(
    () => Array.from(new Set(movimentos.map((item) => item.grupoDocumento).filter(Boolean))).sort(),
    [movimentos],
  );
  const gruposEstoque = useMemo(
    () => Array.from(new Set(movimentos.map((item) => item.grupoEstoque))).sort((a, b) => {
      if (a === grupoPadrao) return -1;
      if (b === grupoPadrao) return 1;
      return a.localeCompare(b, "pt-BR");
    }),
    [grupoPadrao, movimentos],
  );
  const categorias = useMemo(
    () => Array.from(new Set(movimentos.map((item) => item.classificacao.categoria))).sort(),
    [movimentos],
  );

  const movimentosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return movimentos.filter((item) => {
      const textoBate = !termo || [
        item.documento,
        item.participante,
        item.grupoDocumento,
        item.descricaoGrupoDocumento,
        item.grupoEstoque,
      ].some((campo) => campo.toLocaleLowerCase("pt-BR").includes(termo));
      return textoBate
        && (filtroDirecao === "todas" || item.direcao === filtroDirecao)
        && (filtroCategoria === "todas" || item.classificacao.categoria === filtroCategoria)
        && (filtroGrupoDocumento === "todos" || item.grupoDocumento === filtroGrupoDocumento)
        && (filtroGrupoEstoque === "todos" || item.grupoEstoque === filtroGrupoEstoque);
    });
  }, [busca, filtroCategoria, filtroDirecao, filtroGrupoDocumento, filtroGrupoEstoque, movimentos]);

  const movimentosPorGrupo = useMemo(
    () => gruposEstoque
      .map((grupo) => ({
        grupo,
        movimentos: movimentosFiltrados.filter((item) => item.grupoEstoque === grupo),
      }))
      .filter((item) => item.movimentos.length > 0),
    [gruposEstoque, movimentosFiltrados],
  );

  const totalEntradas = movimentosFiltrados.filter((item) => item.direcao === "entrada").length;
  const totalSaidas = movimentosFiltrados.filter((item) => item.direcao === "saida").length;
  const filtrosAtivos = Boolean(busca)
    || filtroDirecao !== "todas"
    || filtroCategoria !== "todas"
    || filtroGrupoDocumento !== "todos"
    || filtroGrupoEstoque !== "todos";

  function limparFiltros() {
    setBusca("");
    setFiltroDirecao("todas");
    setFiltroCategoria("todas");
    setFiltroGrupoDocumento("todos");
    setFiltroGrupoEstoque("todos");
  }

  function exportarMovimentos() {
    const nomeEmpresa = (empresaAtual?.razaoSocial ?? "empresa")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .toLowerCase();
    exportarParaCSV(
      `kardex-${nomeEmpresa}-${codigoConsultado}-${periodo.inicial}-a-${periodo.final}`,
      ["Grupo de estoque", "Data", "Código auxiliar", "Produto", "Documento", "Grupo documental", "Categoria", "Participante", "Direção", "Quantidade", "Saldo", "Valor"],
      movimentosFiltrados.map((item) => [
        item.grupoEstoque,
        dataVisual(item.dataMovimento),
        item.produtoCodigoAuxiliar,
        item.produtoDescricao,
        item.documento,
        item.grupoDocumento,
        item.classificacao.rotulo,
        item.participante,
        item.direcao,
        Math.abs(item.quantidadeMovimentada),
        item.saldo,
        Math.abs(item.valorTotal),
      ]),
    );
    toast.success(`${movimentosFiltrados.length} movimento(s) exportado(s).`);
  }

  return (
    <div className="flex flex-col gap-6">
      <AnalysisQueryCard
        icon={PackageSearch}
        title="Kardex por Produto"
        description="Informe o código auxiliar para consultar todo o histórico de movimentações de um item, sem limite de dias."
        actions={(
          <ExportDropdown
            onExportarCsv={exportarMovimentos}
            disabled={loading || movimentosFiltrados.length === 0}
            label="Exportar movimentos"
          />
        )}
        footer={`O grupo ${grupoPadrao} é o grupo padrão da empresa. A consulta inclui todos os grupos de estoque e documentos do item.`}
      >
        <div className="space-y-4">
          <div className="max-w-sm space-y-1.5">
            <Label htmlFor="estoque-codigo-auxiliar">Código auxiliar do produto</Label>
            <Input
              id="estoque-codigo-auxiliar"
              value={codigoAuxiliar}
              onChange={(event) => setCodigoAuxiliar(event.target.value)}
              placeholder="Ex.: 5374"
              autoComplete="off"
              className="font-mono"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Campo obrigatório. A busca considera somente este item.
            </p>
          </div>
          <DateRangeFilter
            value={periodo}
            onChange={setPeriodo}
            onConsultar={consultar}
            loading={loading}
            semLimiteDias
            consultaDesabilitada={!codigoAuxiliar.trim()}
          />
        </div>
      </AnalysisQueryCard>

      {erro ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 text-sm font-medium text-destructive">{erro}</CardContent>
        </Card>
      ) : null}

      {consultado ? (
        <>
          <MetricsStrip itens={[
            {
              rotulo: "Movimentos",
              valor: formatarNumero(movimentosFiltrados.length, 0),
              detalhe: `Item ${codigoConsultado} · ${movimentosPorGrupo.length} grupo(s)`,
              definicao: "Quantidade de linhas do Kardex após a aplicação dos filtros da tela.",
            },
            {
              rotulo: "Entradas",
              valor: formatarNumero(totalEntradas, 0),
              definicao: "Movimentações que a API do Kardex classificou como entrada.",
            },
            {
              rotulo: "Saídas",
              valor: formatarNumero(totalSaidas, 0),
              definicao: "Movimentações que a API do Kardex classificou como saída.",
            },
          ]} />

          <DataFilterBar
            busca={busca}
            onBuscaChange={setBusca}
            placeholder="Buscar documento ou participante..."
            temFiltrosAtivos={filtrosAtivos}
            onLimpar={limparFiltros}
          >
            <div className="w-40 sm:w-44">
              <Select value={filtroGrupoEstoque} onValueChange={setFiltroGrupoEstoque}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Grupo de estoque" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os estoques</SelectItem>
                  {gruposEstoque.map((grupo) => <SelectItem key={grupo} value={grupo}>{grupo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40 sm:w-44">
              <Select value={filtroDirecao} onValueChange={setFiltroDirecao}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Entrada / saída" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Entradas e saídas</SelectItem>
                  <SelectItem value="entrada">Somente entradas</SelectItem>
                  <SelectItem value="saida">Somente saídas</SelectItem>
                  <SelectItem value="indefinida">Direção indefinida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-40 sm:w-44">
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as categorias</SelectItem>
                  {categorias.map((categoria) => (
                    <SelectItem key={categoria} value={categoria}>{rotulosCategoria[categoria]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40 sm:w-44">
              <Select value={filtroGrupoDocumento} onValueChange={setFiltroGrupoDocumento}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Grupo documental" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os documentos</SelectItem>
                  {gruposDocumento.map((grupo) => <SelectItem key={grupo} value={grupo}>{grupo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </DataFilterBar>

          {movimentosPorGrupo.length > 0 ? (
            <div className="space-y-6" aria-label="Movimentações por grupo de estoque">
              {movimentosPorGrupo.map(({ grupo, movimentos: itens }) => {
                const entradas = itens.filter((item) => item.direcao === "entrada").length;
                const saidas = itens.filter((item) => item.direcao === "saida").length;
                return (
                  <Card key={grupo}>
                    <CardHeader className="gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">Estoque: {grupo}</CardTitle>
                        {grupo === grupoPadrao ? <Badge>Grupo padrão</Badge> : null}
                      </div>
                      <CardDescription>
                        {formatarNumero(itens.length, 0)} movimento(s) · {formatarNumero(entradas, 0)} entrada(s) · {formatarNumero(saidas, 0)} saída(s)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="px-3 pb-3">
                        <ReportTable<MovimentoKardexPublico>
                          label={`movimentos do estoque ${grupo}`}
                          caption={`Kardex do grupo de estoque ${grupo}`}
                          data={itens}
                          rowKey={(item, index) => `${grupo}-${item.documento}-${item.dataMovimento}-${item.produtoCodigoAuxiliar}-${index}`}
                          showExport={false}
                          columns={colunasMovimento}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {movimentos.length === 0
                  ? `Nenhuma movimentação foi retornada para o item ${codigoConsultado} neste período.`
                  : "Nenhuma movimentação corresponde aos filtros selecionados."}
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
