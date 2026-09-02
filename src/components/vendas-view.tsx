"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  DownloadIcon,
  FileDownIcon,
  Search,
} from "lucide-react";
import type { VendaProduto } from "@/lib/syspro-api";
import {
  agruparVendasPorNota,
  dataInputParaSyspro,
  formatarDataInputParaBR,
  paraNumero,
} from "@/lib/vendas";
import {
  DateRangeFilter,
  periodoMesAtual,
  type Periodo,
} from "@/components/date-range-filter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Skeleton } from "@/components/ui/skeleton";

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
}

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function VendasView({
  empresas,
  empresaInicial,
  initialPeriod,
  initialVendas = [],
  initialError,
}: Props) {
  const [empresaId] = useState(
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
  const [buscaVenda, setBuscaVenda] = useState("");

  const empresaAtual = useMemo(
    () => empresas.find((e) => e.id === empresaId),
    [empresas, empresaId],
  );

  const notas = useMemo(() => agruparVendasPorNota(vendas), [vendas]);

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

  const resumoBusca = useMemo(() => {
    let faturamento = 0;
    const clientes = new Set<string>();
    for (const n of notasFiltradas) {
      faturamento += n.total;
      if (n.cliente) clientes.add(n.cliente);
    }
    const totalNotas = notasFiltradas.length;
    const ticketMedio = totalNotas ? faturamento / totalNotas : 0;
    return { faturamento, totalNotas, clientes: clientes.size, ticketMedio };
  }, [notasFiltradas]);

  async function consultar(periodoDaConsulta = periodo) {
    if (!empresaId || !periodoDaConsulta.inicial || !periodoDaConsulta.final) {
      toast.error("Preencha o período de consulta");
      return;
    }
    if (periodoDaConsulta.inicial > periodoDaConsulta.final) {
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
          dtInicial: dataInputParaSyspro(periodoDaConsulta.inicial),
          dtFinal: dataInputParaSyspro(periodoDaConsulta.final),
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
      {/* Print-Only Header */}
      <div className="print-only mb-4 border-b pb-3">
        <h1 className="text-xl font-bold uppercase tracking-wide text-black">
          Relatório de Vendas — Syspro ERP
        </h1>
        <p className="text-xs text-slate-700">
          Empresa: {empresaAtual?.razaoSocial ?? "Empresa"} | CNPJ:{" "}
          {empresaAtual?.cnpj} | Período:{" "}
          {formatarDataInputParaBR(periodo.inicial)} a{" "}
          {formatarDataInputParaBR(periodo.final)}
        </p>
      </div>

      {/* Search & Filter Controls */}
      <Card className="no-print border-border/60 shadow-sm backdrop-blur-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">
                Consulta de Vendas
              </CardTitle>
              <CardDescription className="text-xs">
                Selecione o período desejado para consultar o histórico completo
                de notas fiscais faturadas.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="border-t pt-4">
          <DateRangeFilter
            value={periodo}
            onChange={setPeriodo}
            onConsultar={consultar}
            loading={loading}
          />
        </CardContent>
      </Card>

      {erro ? (
        <Card className="border-destructive/50 bg-destructive/5 shadow-xs">
          <CardContent className="pt-6 text-sm font-medium text-destructive">
            {erro}
          </CardContent>
        </Card>
      ) : null}

      {/* Main Sales Table Card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-bold">
                Notas Fiscais Emitidas
              </CardTitle>
              <CardDescription className="text-xs">
                {notasFiltradas.length} notas encontradas. Clique no ícone de
                expansão para visualizar os itens da nota.
              </CardDescription>
            </div>
            <div className="no-print flex flex-wrap items-center gap-2">
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
          {loading ? (
            <div className="flex flex-col gap-3 py-4">
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : vendas.length > 0 ? (
            <>
              {/* Summary Bar */}
              <div className="no-print mb-4 grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3.5 sm:grid-cols-4">
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Total Faturado
                  </span>
                  <span className="text-base font-extrabold text-foreground">
                    {moeda.format(resumoBusca.faturamento)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Notas Fiscais
                  </span>
                  <span className="text-base font-extrabold text-foreground">
                    {numero.format(resumoBusca.totalNotas)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Clientes Atendidos
                  </span>
                  <span className="text-base font-extrabold text-foreground">
                    {numero.format(resumoBusca.clientes)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Ticket Médio
                  </span>
                  <span className="text-base font-extrabold text-foreground">
                    {moeda.format(resumoBusca.ticketMedio)}
                  </span>
                </div>
              </div>
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
            </>
          ) : !loading && !erro ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
              <BarChart3 className="size-8 text-muted-foreground/60" />
              <p className="font-semibold text-foreground">
                Nenhuma venda carregada para o período.
              </p>
              <p className="text-xs text-muted-foreground">
                Selecione um período acima e clique em &quot;Consultar
                Vendas&quot;.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
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
        <TableCell className="font-medium font-mono">{nota.numero}</TableCell>
        <TableCell>{nota.emissao}</TableCell>
        <TableCell>
          <div className="font-semibold text-foreground">{nota.cliente}</div>
          {nota.cidade || nota.uf ? (
            <div className="text-xs text-muted-foreground">
              {[nota.cidade, nota.uf].filter(Boolean).join(" · ")}
            </div>
          ) : null}
        </TableCell>
        <TableCell className="text-right font-mono">
          {numero.format(nota.quantidadeItens)}
        </TableCell>
        <TableCell className="text-right font-semibold font-mono">
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
    <div className="overflow-x-auto rounded-md border bg-background shadow-xs">
      <table className="w-full text-xs">
        <thead className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
          <tr>
            <th className="p-2.5 font-semibold">Produto</th>
            <th className="p-2.5 font-semibold">Departamento</th>
            <th className="p-2.5 font-semibold">Un.</th>
            <th className="p-2.5 font-semibold">Código</th>
            <th className="p-2.5 text-right font-semibold">Qtd.</th>
            <th className="p-2.5 text-right font-semibold">Desconto</th>
            <th className="p-2.5 text-right font-semibold">Frete</th>
            <th className="p-2.5 text-right font-semibold">Unitário</th>
            <th className="p-2.5 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, indice) => (
            <tr
              key={`${item.produto_id}-${indice}`}
              className="border-b last:border-0 hover:bg-muted/20"
            >
              <td className="p-2.5 font-medium text-foreground">
                {item.produto_descricao}
              </td>
              <td className="p-2.5 text-muted-foreground">
                {item.produto_departamento || "—"}
              </td>
              <td className="p-2.5 text-muted-foreground">
                {item.produto_un || "—"}
              </td>
              <td className="p-2.5 font-mono text-muted-foreground">
                {item.produto_id}
              </td>
              <td className="p-2.5 text-right font-mono">
                {numero.format(paraNumero(item.produto_qtde))}
              </td>
              <td className="p-2.5 text-right font-mono">
                {moeda.format(paraNumero(item.produto_vlr_desconto))}
              </td>
              <td className="p-2.5 text-right font-mono">
                {moeda.format(paraNumero(item.produto_vlr_frete))}
              </td>
              <td className="p-2.5 text-right font-mono">
                {moeda.format(paraNumero(item.produto_vlr_item))}
              </td>
              <td className="p-2.5 text-right font-semibold font-mono text-foreground">
                {moeda.format(paraNumero(item.produto_vlr_total_item))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
