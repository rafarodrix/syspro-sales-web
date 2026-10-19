"use client";

import { useMemo, useState } from "react";
import { RotateCcw, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import { DataFilterBar } from "@/components/data-filter-bar";
import {
  DateRangeFilter,
  periodoUltimos90Dias,
  salvarPeriodoCookie,
  type Periodo,
} from "@/components/date-range-filter";
import { FeedbackState } from "@/components/feedback-state";
import { TablePagination } from "@/components/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarNumero, formatarPercentual } from "@/lib/formatters";
import type { ClasseCurvaCompras, RelatorioCompras } from "@/lib/relatorio-compras";

const RELATORIO_VAZIO: RelatorioCompras = {
  itens: [],
  resumo: {
    totalProdutos: 0,
    quantidadeVendida: 0,
    quantidadeDevolvida: 0,
    demandaLiquida: 0,
    taxaDevolucao: 0,
    produtosSemSaldo: 0,
    produtosSemSaldoLocalizado: 0,
  },
};

function ResumoCard({
  titulo,
  valor,
  descricao,
}: {
  titulo: string;
  valor: string;
  descricao: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{titulo}</CardDescription>
        <CardTitle className="font-mono text-2xl">{valor}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{descricao}</CardContent>
    </Card>
  );
}

function badgeCurva(curva: ClasseCurvaCompras) {
  if (curva === "A") return "default" as const;
  if (curva === "B") return "secondary" as const;
  return "outline" as const;
}

export function ComprasView({
  empresaId,
  empresaNome,
}: {
  empresaId: string;
  empresaNome: string;
}) {
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoUltimos90Dias());
  const [periodoConsultado, setPeriodoConsultado] = useState<Periodo | null>(null);
  const [relatorio, setRelatorio] = useState<RelatorioCompras>(RELATORIO_VAZIO);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [curva, setCurva] = useState<"todas" | ClasseCurvaCompras>("todas");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(25);

  async function consultar(proximoPeriodo: Periodo = periodo) {
    if (!empresaId) {
      toast.error("Selecione uma empresa.");
      return;
    }

    setLoading(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/relatorios/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          dtInicial: proximoPeriodo.inicial,
          dtFinal: proximoPeriodo.final,
          forcarAtualizacao: true,
        }),
      });
      const dados = (await resposta.json().catch(() => ({}))) as RelatorioCompras & {
        error?: string;
      };
      if (!resposta.ok) throw new Error(dados.error || "Erro ao gerar o relatório.");

      setRelatorio(dados);
      setPeriodoConsultado({ ...proximoPeriodo });
      salvarPeriodoCookie(proximoPeriodo);
      setPagina(1);
      toast.success(`${dados.resumo.totalProdutos} produto(s) analisado(s).`);
    } catch (causa) {
      const mensagem = causa instanceof Error ? causa.message : "Erro ao gerar o relatório.";
      setErro(mensagem);
      setRelatorio(RELATORIO_VAZIO);
      toast.error(mensagem);
    } finally {
      setLoading(false);
    }
  }

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return relatorio.itens.filter(
      (item) =>
        (curva === "todas" || item.curva === curva) &&
        (!termo ||
          item.codigo.toLowerCase().includes(termo) ||
          item.produto.toLowerCase().includes(termo)),
    );
  }, [busca, curva, relatorio.itens]);

  const totalPaginas = Math.max(1, Math.ceil(itensFiltrados.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const itensDaPagina = itensFiltrados.slice(
    (paginaAtual - 1) * porPagina,
    paginaAtual * porPagina,
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBasket aria-hidden="true" />
            Relatório de Compras
          </CardTitle>
          <CardDescription>
            Vendas, devoluções de venda EDC e estoque atual por produto em {empresaNome}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DateRangeFilter
            value={periodo}
            onChange={setPeriodo}
            onConsultar={consultar}
            loading={loading}
          />
        </CardContent>
      </Card>

      {erro ? (
        <FeedbackState
          variant="error"
          title="Não foi possível gerar o relatório"
          description={erro}
          onRetry={() => consultar()}
        />
      ) : null}

      {periodoConsultado ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <ResumoCard
            titulo="Produtos analisados"
            valor={formatarNumero(relatorio.resumo.totalProdutos, 0)}
            descricao="Produtos com vendas no período"
          />
          <ResumoCard
            titulo="Quantidade vendida"
            valor={formatarNumero(relatorio.resumo.quantidadeVendida, 0)}
            descricao="Origem: consulta de vendas"
          />
          <ResumoCard
            titulo="Demanda líquida"
            valor={formatarNumero(relatorio.resumo.demandaLiquida, 0)}
            descricao="Vendas menos devoluções EDC"
          />
          <ResumoCard
            titulo="Taxa de devolução"
            valor={formatarPercentual(relatorio.resumo.taxaDevolucao, 1)}
            descricao={`${formatarNumero(relatorio.resumo.quantidadeDevolvida, 0)} unidade(s) devolvida(s)`}
          />
          <ResumoCard
            titulo="Sem estoque"
            valor={formatarNumero(relatorio.resumo.produtosSemSaldo, 0)}
            descricao={`${relatorio.resumo.produtosSemSaldoLocalizado} sem saldo localizado`}
          />
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Produtos para analise de compra</CardTitle>
          <CardDescription>
            Curva ABC calculada pela demanda líquida. O estoque usa o saldo do movimento mais
            recente encontrado até hoje.
          </CardDescription>
          <DataFilterBar
            busca={busca}
            onBuscaChange={(valor) => {
              setBusca(valor);
              setPagina(1);
            }}
            placeholder="Buscar por descrição..."
            temFiltrosAtivos={Boolean(busca) || curva !== "todas"}
            onLimpar={() => {
              setBusca("");
              setCurva("todas");
              setPagina(1);
            }}
          >
            <Select
              value={curva}
              onValueChange={(valor) => {
                setCurva(valor as "todas" | ClasseCurvaCompras);
                setPagina(1);
              }}
            >
              <SelectTrigger className="w-44" aria-label="Filtrar por curva ABC">
                <SelectValue placeholder="Curva ABC" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="todas">Todas as curvas</SelectItem>
                  <SelectItem value="A">Curva A</SelectItem>
                  <SelectItem value="B">Curva B</SelectItem>
                  <SelectItem value="C">Curva C</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </DataFilterBar>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col gap-3 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : periodoConsultado && itensFiltrados.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Curva</TableHead>
                      <TableHead className="text-right">Vendas no periodo</TableHead>
                      <TableHead className="text-right">Devoluções EDC</TableHead>
                      <TableHead className="text-right">Demanda líquida</TableHead>
                      <TableHead className="text-right">Estoque atual</TableHead>
                      <TableHead className="text-right">Cobertura</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensDaPagina.map((item) => (
                      <TableRow key={item.codigo}>
                        <TableCell>
                          <p className="font-medium">{item.produto}</p>
                          <p className="text-xs text-muted-foreground">{item.unidade}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={badgeCurva(item.curva)}>{item.curva}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatarNumero(item.quantidadeVendida, 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatarNumero(item.quantidadeDevolvida, 0)}
                          <span className="block text-[10px] text-muted-foreground">
                            {formatarPercentual(item.taxaDevolucao, 1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatarNumero(item.demandaLiquida, 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {item.estoqueAtual === null ? "-" : formatarNumero(item.estoqueAtual, 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.coberturaDias === null
                            ? "-"
                            : `${formatarNumero(item.coberturaDias, 1)} dias`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t p-3">
                <TablePagination
                  paginaAtual={paginaAtual}
                  totalItens={itensFiltrados.length}
                  itensPorPagina={porPagina}
                  labelItens="produtos"
                  onPaginaChange={setPagina}
                  onItensPorPaginaChange={(valor) => {
                    setPorPagina(valor);
                    setPagina(1);
                  }}
                />
              </div>
            </>
          ) : periodoConsultado ? (
            <FeedbackState
              variant="empty"
              title="Nenhum produto encontrado"
              description="Não há vendas para os filtros aplicados neste período."
            />
          ) : (
            <FeedbackState
              variant="empty"
              title="Defina o período da análise"
              description="Use Consultar para combinar vendas e movimentações do Kardex."
            />
          )}
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <RotateCcw className="size-3.5" aria-hidden="true" />
        Devoluções consideram exclusivamente o grupo EDC e não estornam receita sem valor fiscal.
        Produtos são relacionados pelo código do item.
      </p>
    </div>
  );
}
