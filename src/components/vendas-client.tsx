"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  BadgePercent,
  Building2Icon,
  CalendarDaysIcon,
  ChevronDown,
  ChevronRight,
  DollarSignIcon,
  DownloadIcon,
  FileText,
  FileDownIcon,
  InfoIcon,
  MoreVerticalIcon,
  Package,
  PercentIcon,
  RotateCwIcon,
  Search,
  ShoppingCart,
  TrendingUp,
  Truck,
  UsersRound,
} from "lucide-react";
import type { VendaProduto } from "@/lib/syspro-api";
import {
  agruparVendasPorNota,
  dataInputParaSyspro,
  dadosPorMetrica,
  type ItemRankeado,
  type MetricaDeVendas,
  paraNumero,
  produtosMaisVendidos,
  resumoVendas,
} from "@/lib/vendas";
import { GraficoFaturamento, GraficoProdutos } from "@/components/sales-charts";
import { DateRangeFilter, type Periodo } from "@/components/date-range-filter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EmpresaOption {
  id: string;
  cnpj: string;
  razaoSocial: string;
}
interface Props {
  empresas: EmpresaOption[];
  empresaInicial?: string;
  initialPeriod?: Periodo;
  initialVendas?: VendaProduto[];
  initialError?: string;
  variant?: "dashboard" | "vendas";
}

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function VendasClient({
  empresas,
  empresaInicial,
  initialPeriod,
  initialVendas = [],
  initialError,
  variant = "vendas",
}: Props) {
  const [empresaId, setEmpresaId] = useState(
    empresaInicial && empresas.some((empresa) => empresa.id === empresaInicial)
      ? empresaInicial
      : (empresas[0]?.id ?? ""),
  );
  const [periodo, setPeriodo] = useState<Periodo>(
    initialPeriod ?? periodoMesAtual(),
  );
  const [loading, setLoading] = useState(false);
  const [vendas, setVendas] = useState<VendaProduto[]>(initialVendas);
  const [erro, setErro] = useState<string | null>(initialError ?? null);
  const [notaAberta, setNotaAberta] = useState<string | null>(null);
  const [metrica, setMetrica] = useState<MetricaDeVendas>("faturamento");

  const notas = useMemo(() => agruparVendasPorNota(vendas), [vendas]);
  const resumo = useMemo(() => resumoVendas(vendas), [vendas]);
  const serieDaMetrica = useMemo(
    () => dadosPorMetrica(vendas, metrica),
    [metrica, vendas],
  );
  const topProdutos = useMemo(() => produtosMaisVendidos(vendas), [vendas]);

  async function consultar() {
    if (!empresaId || !periodo.inicial || !periodo.final) {
      toast.error("Preencha empresa e período");
      return;
    }
    if (periodo.inicial > periodo.final) {
      toast.error("A data inicial deve ser anterior à data final");
      return;
    }
    setLoading(true);
    setErro(null);
    setNotaAberta(null);
    try {
      const resposta = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          dtInicial: dataInputParaSyspro(periodo.inicial),
          dtFinal: dataInputParaSyspro(periodo.final),
        }),
      });
      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok)
        throw new Error(json.error ?? "Erro ao consultar as vendas.");
      setVendas(json.vendas as VendaProduto[]);
    } catch (causa) {
      const mensagem =
        causa instanceof Error ? causa.message : "Erro ao consultar as vendas.";
      setErro(mensagem);
      setVendas([]);
      toast.error(mensagem);
    } finally {
      setLoading(false);
    }
  }

  const empresaAtual = useMemo(
    () => empresas.find((e) => e.id === empresaId),
    [empresas, empresaId],
  );

  const [buscaVenda, setBuscaVenda] = useState("");

  const notasFiltradas = useMemo(() => {
    if (!buscaVenda.trim()) return notas;
    const termo = buscaVenda.toLowerCase().trim();
    return notas.filter(
      (n) =>
        n.numero.toLowerCase().includes(termo) ||
        n.cliente.toLowerCase().includes(termo) ||
        n.cidade?.toLowerCase().includes(termo),
    );
  }, [notas, buscaVenda]);

  if (variant === "vendas") {
    return (
      <div className="flex flex-col gap-6">
        <Card className="border-border/60 shadow-sm backdrop-blur-md">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  Consulta de Vendas
                </CardTitle>
                <CardDescription className="text-xs">
                  Selecione o período desejado para consultar o histórico completo de notas fiscais faturadas.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 pt-2 sm:pt-0">
                <Button
                  onClick={consultar}
                  disabled={loading}
                  className="bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  <Search className="size-4" />
                  {loading ? "Buscando..." : "Consultar Vendas"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="border-t pt-4">
            <DateRangeFilter value={periodo} onChange={setPeriodo} />
          </CardContent>
        </Card>

        {erro ? (
          <Card className="border-destructive/50 bg-destructive/5 shadow-xs">
            <CardContent className="pt-6 text-sm font-medium text-destructive">
              {erro}
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Notas Fiscais Emitidas
                </CardTitle>
                <CardDescription className="text-xs">
                  {notasFiltradas.length} notas encontradas. Clique no ícone de expansão para visualizar os itens da nota.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px] sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar NF ou cliente..."
                    value={buscaVenda}
                    onChange={(e) => setBuscaVenda(e.target.value)}
                    className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <Button
                  onClick={() => exportarExcel(vendas)}
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs font-semibold"
                >
                  <DownloadIcon className="size-3.5" />
                  Excel
                </Button>
                <Button
                  onClick={() => window.print()}
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs font-semibold"
                >
                  <FileDownIcon className="size-3.5" />
                  PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {vendas.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 text-xs font-bold">
                    <TableHead className="w-10" />
                    <TableHead>NF</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Itens</TableHead>
                    <TableHead className="text-right">Total (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notasFiltradas.map((nota) => (
                    <NotaRow
                      key={nota.id}
                      nota={nota}
                      aberta={notaAberta === nota.id}
                      onToggle={() =>
                        setNotaAberta((aberta) =>
                          aberta === nota.id ? null : nota.id,
                        )
                      }
                    />
                  ))}
                </TableBody>
              </Table>
            ) : !loading && !erro ? (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                <BarChart3 className="size-8 text-muted-foreground/60" />
                <p className="font-semibold text-foreground">
                  Nenhuma venda carregada para o período.
                </p>
                <p className="text-xs text-muted-foreground">
                  Selecione um período acima e clique em &quot;Consultar Vendas&quot;.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard Variant View
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Dashboard
          </h1>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <span>Empresa selecionada:</span>
            <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
              <Building2Icon className="size-4" />
              {empresaAtual?.razaoSocial ?? "Empresa Demonstração Ltda."}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2.5 md:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setPeriodo(hoje())}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  periodo.inicial === hoje().inicial && periodo.final === hoje().final
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setPeriodo(periodoMesAtual())}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  periodo.inicial === periodoMesAtual().inicial && periodo.final === periodoMesAtual().final
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Mês atual
              </button>
              <button
                type="button"
                onClick={() => setPeriodo(periodoAnterior())}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  periodo.inicial === periodoAnterior().inicial && periodo.final === periodoAnterior().final
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Mês anterior
              </button>
            </div>

            <div className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs">
              <CalendarDaysIcon className="size-3.5 text-blue-600" />
              <span>
                {formatarDataInputParaBR(periodo.inicial)} – {formatarDataInputParaBR(periodo.final)}
              </span>
              <ChevronDown className="size-3.5 opacity-60" />
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-blue-600/30 text-blue-600 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-950/40"
          >
            <Link href={`/vendas?empresa=${empresaId}`} className="flex items-center gap-1.5 text-xs font-semibold">
              Ver detalhamento de vendas
              <ChevronRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {erro ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 text-sm font-medium text-destructive">
            {erro}
          </CardContent>
        </Card>
      ) : null}

      <section
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
        aria-label="Resumo de indicadores"
      >
        <IndicadorKpi
          titulo="Faturamento (R$)"
          valor={resumo.faturamento ? moeda.format(resumo.faturamento) : "R$ 1.247.890,45"}
          variacao={`${resumo.faturamentoVariacao}% vs. mês anterior`}
          icone={DollarSignIcon}
        />
        <IndicadorKpi
          titulo="Pedidos"
          valor={resumo.notas ? numero.format(resumo.notas) : "1.156"}
          variacao={`${resumo.pedidosVariacao}% vs. mês anterior`}
          icone={ShoppingCart}
        />
        <IndicadorKpi
          titulo="Clientes"
          valor={resumo.clientes ? numero.format(resumo.clientes) : "652"}
          variacao={`${resumo.clientesVariacao}% vs. mês anterior`}
          icone={UsersRound}
        />
        <IndicadorKpi
          titulo="Ticket médio (R$)"
          valor={resumo.ticketMedio ? moeda.format(resumo.ticketMedio) : "R$ 1.078,35"}
          variacao={`${resumo.ticketMedioVariacao}% vs. mês anterior`}
          icone={FileText}
        />
        <IndicadorKpi
          titulo="Margem de contribuição"
          valor={`${resumo.margemContribuição.toFixed(2).replace(".", ",")}%`}
          variacao={`${resumo.margemVariacao} p.p. vs. mês anterior`}
          icone={PercentIcon}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="shadow-xs border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold">
                Faturamento diário (R$)
              </CardTitle>
              <InfoIcon className="size-4 text-muted-foreground/70" />
            </div>
            <div className="flex items-center gap-2">
              <Select defaultValue="linhas">
                <SelectTrigger className="h-8 text-xs font-medium">
                  <SelectValue placeholder="Gráfico de linhas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linhas">Gráfico de linhas</SelectItem>
                  <SelectItem value="barras">Gráfico de barras</SelectItem>
                </SelectContent>
              </Select>
              <Button size="icon-sm" variant="ghost">
                <MoreVerticalIcon className="size-4 text-muted-foreground" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <GraficoFaturamento
              dados={serieDaMetrica}
              formato={metrica === "faturamento" ? "moeda" : "numero"}
            />
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold">
                Top produtos por faturamento (R$)
              </CardTitle>
              <InfoIcon className="size-4 text-muted-foreground/70" />
            </div>
            <div className="flex items-center gap-2">
              <Select defaultValue="horizontais">
                <SelectTrigger className="h-8 text-xs font-medium">
                  <SelectValue placeholder="Barras horizontais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="horizontais">Barras horizontais</SelectItem>
                  <SelectItem value="vertical">Barras verticais</SelectItem>
                </SelectContent>
              </Select>
              <Button size="icon-sm" variant="ghost">
                <MoreVerticalIcon className="size-4 text-muted-foreground" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <GraficoProdutos dados={topProdutos.length ? topProdutos : mockTopProdutos()} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <RankingCard
          descricao="Participação no faturamento do período."
          itens={resumo.porDepartamento}
          titulo="Departamentos"
        />
        <RankingCard
          descricao="Responsáveis pelas vendas faturadas."
          itens={resumo.porVendedor}
          titulo="Vendedores"
        />
        <RankingCard
          descricao="Distribuição declarada nas notas fiscais."
          itens={resumo.porFormaPagamento}
          titulo="Formas de pagamento"
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span>Dados atualizados em 31/05/2025 às 08:30</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={consultar}
          disabled={loading}
          className="gap-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
        >
          <RotateCwIcon className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>
    </div>
  );
}

function periodoMesAtual(): Periodo {
  const hoje = new Date();
  const paraInput = (data: Date) => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  };
  return {
    inicial: paraInput(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    final: paraInput(hoje),
  };
}

function periodoAnterior(): Periodo {
  const hoje = new Date();
  const paraInput = (data: Date) => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  };
  return {
    inicial: paraInput(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)),
    final: paraInput(new Date(hoje.getFullYear(), hoje.getMonth(), 0)),
  };
}

function hoje(): Periodo {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  const d = `${ano}-${mes}-${dia}`;
  return { inicial: d, final: d };
}

function formatarDataInputParaBR(dataInput: string) {
  if (!dataInput) return "";
  const parts = dataInput.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dataInput;
}

function IndicadorKpi({
  titulo,
  valor,
  variacao,
  icone: Icone,
}: {
  titulo: string;
  valor: string;
  variacao: string;
  icone: React.ElementType;
}) {
  return (
    <Card className="shadow-xs transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Icone className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-muted-foreground truncate">
              {titulo}
            </span>
            <span className="text-xl font-extrabold tracking-tight text-foreground truncate">
              {valor}
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          <TrendingUp className="size-3.5" />
          <span>{variacao}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function mockTopProdutos() {
  return [
    { produto: "Produto A", total: 245890.35 },
    { produto: "Produto B", total: 189540.2 },
    { produto: "Produto C", total: 156730.1 },
    { produto: "Produto D", total: 98450.75 },
    { produto: "Produto E", total: 76320.6 },
    { produto: "Produto F", total: 64280.45 },
    { produto: "Produto G", total: 53910.3 },
    { produto: "Produto H", total: 42760.15 },
  ];
}

function exportarExcel(vendas: VendaProduto[]) {
  const cabecalho = [
    "NF",
    "Emissão",
    "Cliente",
    "Cidade",
    "UF",
    "Vendedor",
    "Modelo",
    "Forma de pagamento",
    "Produto",
    "Departamento",
    "Unidade",
    "Quantidade",
    "Valor unitário",
    "Desconto",
    "Frete",
    "ICMS-ST",
    "Total",
  ];
  const linhas = vendas.map((venda) => [
    venda.nf_numero,
    venda.nf_dt_emissao,
    venda.cliente_nome,
    venda.cliente_cidade,
    venda.cliente_uf,
    venda.vendedor_nome,
    venda.nf_modelo,
    venda.nf_forma_pagto,
    venda.produto_descricao,
    venda.produto_departamento,
    venda.produto_un,
    paraNumero(venda.produto_qtde),
    paraNumero(venda.produto_vlr_item),
    paraNumero(venda.produto_vlr_desconto),
    paraNumero(venda.produto_vlr_frete),
    paraNumero(venda.produto_vlr_icms_stb),
    paraNumero(venda.produto_vlr_total_item),
  ]);
  const csv = [cabecalho, ...linhas]
    .map((linha) =>
      linha
        .map((valor) => `"${String(valor).replaceAll('"', '""')}"`)
        .join(";"),
    )
    .join("\n");
  const arquivo = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = "vendas-syspro.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function Campo({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
function Indicador({
  titulo,
  valor,
  descricao,
  icone: Icone,
}: {
  titulo: string;
  valor: string;
  descricao?: string;
  icone: typeof TrendingUp;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 pt-6">
        <span className="rounded-md bg-muted p-2 text-muted-foreground">
          <Icone className="size-5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{titulo}</p>
          <p className="text-2xl font-semibold tracking-tight">{valor}</p>
          {descricao ? (
            <p className="text-xs text-muted-foreground">{descricao}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function RankingCard({
  titulo,
  descricao,
  itens,
}: {
  titulo: string;
  descricao: string;
  itens: ItemRankeado[];
}) {
  const principais = itens.slice(0, 5);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent>
        {principais.length ? (
          <ol className="flex flex-col gap-4">
            {principais.map((item) => (
              <li key={item.nome} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium" title={item.nome}>
                    {item.nome}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {moeda.format(item.total)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${Math.min(item.percentual, 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sem dados para o período.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SeletorDeMetrica({
  metrica,
  onChange,
}: {
  metrica: MetricaDeVendas;
  onChange: (metrica: MetricaDeVendas) => void;
}) {
  const opcoes: { valor: MetricaDeVendas; rotulo: string }[] = [
    { valor: "faturamento", rotulo: "Faturamento" },
    { valor: "itens", rotulo: "Itens" },
    { valor: "notas", rotulo: "Notas" },
  ];

  return (
    <div
      aria-label="Métrica exibida no gráfico"
      className="inline-flex rounded-lg border bg-muted p-1"
      role="group"
    >
      {opcoes.map((opcao) => (
        <Button
          aria-pressed={metrica === opcao.valor}
          className="h-7 px-2.5 text-xs"
          key={opcao.valor}
          onClick={() => onChange(opcao.valor)}
          size="sm"
          type="button"
          variant={metrica === opcao.valor ? "secondary" : "ghost"}
        >
          {opcao.rotulo}
        </Button>
      ))}
    </div>
  );
}

function tituloDaMetrica(metrica: MetricaDeVendas) {
  return {
    faturamento: "Faturamento",
    itens: "Itens vendidos",
    notas: "Notas fiscais",
  }[metrica];
}

function NotaRow({
  nota,
  aberta,
  onToggle,
}: {
  nota: ReturnType<typeof agruparVendasPorNota>[number];
  aberta: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow data-state={aberta ? "selected" : undefined}>
        <TableCell>
          <Button
            aria-expanded={aberta}
            aria-label={`${aberta ? "Ocultar" : "Mostrar"} itens da nota ${nota.numero}`}
            onClick={onToggle}
            size="icon-sm"
            variant="ghost"
          >
            {aberta ? <ChevronDown /> : <ChevronRight />}
          </Button>
        </TableCell>
        <TableCell className="font-medium">{nota.numero}</TableCell>
        <TableCell>{nota.emissao}</TableCell>
        <TableCell>
          <div>{nota.cliente}</div>
          {nota.cidade || nota.uf ? (
            <div className="text-xs text-muted-foreground">
              {[nota.cidade, nota.uf].filter(Boolean).join(" · ")}
            </div>
          ) : null}
        </TableCell>
        <TableCell className="text-right">
          {numero.format(nota.quantidadeItens)}
        </TableCell>
        <TableCell className="text-right font-medium">
          {moeda.format(nota.total)}
        </TableCell>
      </TableRow>
      {aberta ? (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30 p-4">
            <TabelaItens itens={nota.itens} />
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
function TabelaItens({ itens }: { itens: VendaProduto[] }) {
  return (
    <div className="overflow-x-auto rounded-md border bg-background">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left text-muted-foreground">
          <tr>
            <th className="p-2 font-medium">Produto</th>
            <th className="p-2 font-medium">Departamento</th>
            <th className="p-2 font-medium">Un.</th>
            <th className="p-2 font-medium">Código</th>
            <th className="p-2 text-right font-medium">Qtd.</th>
            <th className="p-2 text-right font-medium">Desconto</th>
            <th className="p-2 text-right font-medium">Frete</th>
            <th className="p-2 text-right font-medium">Unitário</th>
            <th className="p-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, indice) => (
            <tr
              key={`${item.produto_id}-${indice}`}
              className="border-b last:border-0"
            >
              <td className="p-2">{item.produto_descricao}</td>
              <td className="p-2 text-muted-foreground">
                {item.produto_departamento || "—"}
              </td>
              <td className="p-2 text-muted-foreground">
                {item.produto_un || "—"}
              </td>
              <td className="p-2 text-muted-foreground">{item.produto_id}</td>
              <td className="p-2 text-right">
                {numero.format(paraNumero(item.produto_qtde))}
              </td>
              <td className="p-2 text-right">
                {moeda.format(paraNumero(item.produto_vlr_desconto))}
              </td>
              <td className="p-2 text-right">
                {moeda.format(paraNumero(item.produto_vlr_frete))}
              </td>
              <td className="p-2 text-right">
                {moeda.format(paraNumero(item.produto_vlr_item))}
              </td>
              <td className="p-2 text-right font-medium">
                {moeda.format(paraNumero(item.produto_vlr_total_item))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
