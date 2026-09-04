"use client";

import { useEffect, useMemo, useState } from "react";
import { PackageSearch, Search } from "lucide-react";
import { toast } from "sonner";
import { resumirProdutosKardex, type MovimentoKardex } from "@/lib/kardex";
import { dataInputParaSyspro } from "@/lib/vendas";
import { formatarNumero } from "@/lib/formatters";
import { DateRangeFilter, periodoMesAtual, type Periodo } from "@/components/date-range-filter";
import { TablePagination } from "@/components/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface EmpresaOption {
  id: string;
  cnpj: string;
  razaoSocial: string;
}

export function EstoqueView({ empresas, empresaInicial }: { empresas: EmpresaOption[]; empresaInicial?: string }) {
  const [empresaId, setEmpresaId] = useState(
    empresaInicial && empresas.some((empresa) => empresa.id === empresaInicial)
      ? empresaInicial
      : (empresas[0]?.id ?? ""),
  );
  const [periodo, setPeriodo] = useState<Periodo>(periodoMesAtual());
  const [movimentos, setMovimentos] = useState<MovimentoKardex[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroDirecao, setFiltroDirecao] = useState("todas");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroGrupo, setFiltroGrupo] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(25);

  useEffect(() => {
    if (empresaInicial) setEmpresaId(empresaInicial);
  }, [empresaInicial]);

  async function consultar() {
    if (!empresaId) {
      toast.error("Selecione uma empresa.");
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
          dtInicial: dataInputParaSyspro(periodo.inicial),
          dtFinal: dataInputParaSyspro(periodo.final),
        }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados.error || "Erro ao consultar o Kardex.");

      setMovimentos(dados.movimentos ?? []);
      setPagina(1);
      toast.success(`${dados.movimentos?.length ?? 0} movimentações carregadas.`);
    } catch (causa) {
      const mensagem = causa instanceof Error ? causa.message : "Erro ao consultar o Kardex.";
      setErro(mensagem);
      setMovimentos([]);
      toast.error(mensagem);
    } finally {
      setLoading(false);
    }
  }

  const gruposDisponiveis = useMemo(
    () => Array.from(new Set(movimentos.map((movimento) => movimento.grupoDocumento).filter(Boolean))).sort(),
    [movimentos],
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return movimentos.filter((movimento) => {
      const textoBate = !termo || [
        movimento.produtoCodigoAuxiliar,
        movimento.produtoDescricao,
        movimento.documento,
        movimento.participante,
        movimento.grupoDocumento,
        movimento.descricaoGrupoDocumento,
      ].some((campo) => campo.toLowerCase().includes(termo));

      return textoBate
        && (filtroDirecao === "todas" || movimento.direcao === filtroDirecao)
        && (filtroCategoria === "todas" || movimento.classificacao.categoria === filtroCategoria)
        && (filtroGrupo === "todos" || movimento.grupoDocumento === filtroGrupo);
    });
  }, [busca, filtroDirecao, filtroCategoria, filtroGrupo, movimentos]);

  const relatoriosProdutos = useMemo(() => resumirProdutosKardex(filtrados), [filtrados]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const paginaMovimentos = filtrados.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina);

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <PackageSearch className="size-5 text-primary" />
            Movimentações de Estoque
          </CardTitle>
          <CardDescription>
            Kardex por empresa e período. Consultas limitadas a 31 dias para preservar a API do Syspro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DateRangeFilter value={periodo} onChange={setPeriodo} onConsultar={consultar} loading={loading} />
        </CardContent>
      </Card>

      {erro && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 text-sm font-medium text-destructive">{erro}</CardContent>
        </Card>
      )}

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="gap-3 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Kardex detalhado</CardTitle>
              <CardDescription>{filtrados.length} movimento(s) no período.</CardDescription>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(evento) => {
                  setBusca(evento.target.value);
                  setPagina(1);
                }}
                className="pl-8"
                placeholder="Pesquisar produto, documento, participante..."
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Select value={filtroDirecao} onValueChange={(valor) => { setFiltroDirecao(valor); setPagina(1); }}>
              <SelectTrigger><SelectValue placeholder="Entrada / saída" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Entradas e saídas</SelectItem>
                <SelectItem value="entrada">Somente entradas</SelectItem>
                <SelectItem value="saida">Somente saídas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroCategoria} onValueChange={(valor) => { setFiltroCategoria(valor); setPagina(1); }}>
              <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                <SelectItem value="venda">Vendas</SelectItem>
                <SelectItem value="devolucao_venda">Devoluções de venda</SelectItem>
                <SelectItem value="compra">Compras</SelectItem>
                <SelectItem value="devolucao_compra">Devoluções de compra</SelectItem>
                <SelectItem value="transferencia">Transferências</SelectItem>
                <SelectItem value="bonificacao">Bonificações</SelectItem>
                <SelectItem value="outros">Outros movimentos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroGrupo} onValueChange={(valor) => { setFiltroGrupo(valor); setPagina(1); }}>
              <SelectTrigger><SelectValue placeholder="Grupo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os grupos</SelectItem>
                {gruposDisponiveis.map((grupo) => <SelectItem key={grupo} value={grupo}>{grupo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead><TableHead>Produto</TableHead><TableHead>Documento</TableHead>
                  <TableHead>Grupo</TableHead><TableHead>Participante</TableHead>
                  <TableHead className="text-right">Movimento</TableHead><TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginaMovimentos.length ? paginaMovimentos.map((movimento, indice) => (
                  <TableRow key={`${movimento.documento}-${movimento.produtoCodigoAuxiliar}-${movimento.dataMovimento}-${indice}`}>
                    <TableCell className="whitespace-nowrap text-xs">{movimento.dataMovimento}</TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">{movimento.produtoDescricao}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{movimento.produtoCodigoAuxiliar}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{movimento.documento || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={movimento.direcao === "entrada" ? "border-emerald-500/40 text-emerald-700" : "border-rose-500/40 text-rose-700"}>
                        {movimento.grupoDocumento || "—"} · {movimento.classificacao.rotulo}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-44 truncate text-xs">{movimento.participante || "—"}</TableCell>
                    <TableCell className={`text-right font-semibold ${movimento.direcao === "entrada" ? "text-emerald-600" : "text-rose-600"}`}>
                      {movimento.direcao === "entrada" ? "+" : "−"}{formatarNumero(Math.abs(movimento.quantidadeMovimentada))}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatarNumero(movimento.saldo)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={7} className="h-28 text-center text-sm text-muted-foreground">{loading ? "Consultando o Kardex..." : "Nenhuma movimentação encontrada."}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {filtrados.length > 0 && (
            <div className="border-t p-3">
              <TablePagination paginaAtual={paginaAtual} totalItens={filtrados.length} itensPorPagina={porPagina} onPaginaChange={setPagina} onItensPorPaginaChange={(valor) => { setPorPagina(valor); setPagina(1); }} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Saídas e devoluções por produto</CardTitle><CardDescription>Produtos com vendas e respectivas devoluções no período filtrado.</CardDescription></CardHeader>
          <CardContent className="p-0"><div className="max-h-96 overflow-auto"><Table><TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="text-right">Saídas</TableHead><TableHead className="text-right">Devoluções</TableHead></TableRow></TableHeader><TableBody>{relatoriosProdutos.saidasEDevolucoes.slice(0, 20).map((produto) => <TableRow key={produto.codigo}><TableCell><p className="text-xs font-medium">{produto.produto}</p><p className="font-mono text-[10px] text-muted-foreground">{produto.codigo}</p></TableCell><TableCell className="text-right text-rose-600">{formatarNumero(produto.saidasVenda)}</TableCell><TableCell className="text-right text-amber-600">{formatarNumero(produto.devolucoesVenda)}</TableCell></TableRow>)}</TableBody></Table></div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Entradas e transferências por produto</CardTitle><CardDescription>Compras recebidas e transferências no período filtrado.</CardDescription></CardHeader>
          <CardContent className="p-0"><div className="max-h-96 overflow-auto"><Table><TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="text-right">Compras</TableHead><TableHead className="text-right">Transf. E/S</TableHead></TableRow></TableHeader><TableBody>{relatoriosProdutos.entradasETransferencias.slice(0, 20).map((produto) => <TableRow key={produto.codigo}><TableCell><p className="text-xs font-medium">{produto.produto}</p><p className="font-mono text-[10px] text-muted-foreground">{produto.codigo}</p></TableCell><TableCell className="text-right text-emerald-600">{formatarNumero(produto.entradasCompra)}</TableCell><TableCell className="text-right">{formatarNumero(produto.transferenciasEntrada)} / {formatarNumero(produto.transferenciasSaida)}</TableCell></TableRow>)}</TableBody></Table></div></CardContent>
        </Card>
      </div>
    </div>
  );
}
