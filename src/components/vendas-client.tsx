"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  BadgePercent,
  ChevronDown,
  ChevronRight,
  DownloadIcon,
  FileText,
  FileDownIcon,
  Package,
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

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {variant === "dashboard" ? "Visão do período" : "Filtros"}
          </CardTitle>
          <CardDescription>
            {variant === "dashboard"
              ? "A empresa é selecionada no topo. O dashboard abre no mês atual."
              : "Escolha uma empresa e o período para analisar as notas fiscais."}
          </CardDescription>
        </CardHeader>
        <CardContent
          className={
            variant === "dashboard"
              ? "flex flex-wrap items-end justify-between gap-4"
              : "grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(420px,1.25fr)_auto] lg:items-end"
          }
        >
          {variant === "vendas" ? (
            <Campo label="CNPJ / Empresa">
              <Select value={empresaId} onValueChange={setEmpresaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.razaoSocial} ({empresa.cnpj})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          ) : null}
          <DateRangeFilter value={periodo} onChange={setPeriodo} />
          <div className="flex gap-2">
            <Button onClick={consultar} disabled={loading}>
              <Search data-icon="inline-start" />
              {loading ? "Consultando..." : "Consultar"}
            </Button>
            {variant === "dashboard" ? (
              <Button asChild variant="outline">
                <Link href={`/vendas?empresa=${empresaId}`}>Ver vendas</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
      {erro ? (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-sm text-destructive">
            {erro}
          </CardContent>
        </Card>
      ) : null}
      {vendas.length > 0 ? (
        <>
          <section
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Resumo de vendas"
          >
            <Indicador
              titulo="Faturamento"
              valor={moeda.format(resumo.faturamento)}
              icone={TrendingUp}
            />
            <Indicador
              titulo="Notas fiscais"
              valor={numero.format(resumo.notas)}
              descricao="notas no período"
              icone={FileText}
            />
            <Indicador
              titulo="Quantidade de itens"
              valor={numero.format(resumo.quantidadeItens)}
              icone={Package}
            />
            <Indicador
              titulo="Clientes atendidos"
              valor={numero.format(resumo.clientes)}
              descricao="clientes únicos"
              icone={UsersRound}
            />
            <Indicador
              titulo="Ticket médio"
              valor={resumo.notas ? moeda.format(resumo.ticketMedio) : "—"}
              descricao="por nota fiscal"
              icone={ShoppingCart}
            />
            <Indicador
              titulo="Descontos concedidos"
              valor={moeda.format(resumo.descontos)}
              icone={BadgePercent}
            />
            <Indicador
              titulo="Frete associado"
              valor={moeda.format(resumo.frete)}
              icone={Truck}
            />
            <Indicador
              titulo="ICMS-ST"
              valor={moeda.format(resumo.icmsSt)}
              icone={FileText}
            />
          </section>
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base">
                    {tituloDaMetrica(metrica)} por dia
                  </CardTitle>
                  <SeletorDeMetrica metrica={metrica} onChange={setMetrica} />
                </div>
                <CardDescription>
                  Acompanhe a métrica selecionada ao longo do período.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GraficoFaturamento
                  dados={serieDaMetrica}
                  formato={metrica === "faturamento" ? "moeda" : "numero"}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Produtos com maior faturamento
                </CardTitle>
                <CardDescription>Top 5 do período consultado.</CardDescription>
              </CardHeader>
              <CardContent>
                <GraficoProdutos dados={topProdutos} />
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
          {variant === "vendas" ? (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>Vendas por nota fiscal</CardTitle>
                    <CardDescription>
                      {notas.length} notas encontradas. Clique em uma venda para
                      visualizar os itens.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => exportarExcel(vendas)}
                      size="sm"
                      variant="outline"
                    >
                      <DownloadIcon data-icon="inline-start" />
                      Excel
                    </Button>
                    <Button
                      onClick={() => window.print()}
                      size="sm"
                      variant="outline"
                    >
                      <FileDownIcon data-icon="inline-start" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>NF</TableHead>
                      <TableHead>Emissão</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Itens</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notas.map((nota) => (
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
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : !loading && !erro ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <BarChart3 className="size-8 text-muted-foreground" />
            <p className="font-medium">
              Consulte um período para montar seu dashboard.
            </p>
            <p className="text-sm text-muted-foreground">
              Os indicadores e as vendas agrupadas aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      ) : null}
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
