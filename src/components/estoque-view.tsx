"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, PackageSearch, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import type { MovimentoKardex } from "@/lib/kardex";
import { dataInputParaSyspro } from "@/lib/vendas";
import { formatarNumero } from "@/lib/formatters";
import { DateRangeFilter, periodoMesAtual, type Periodo } from "@/components/date-range-filter";
import { TablePagination } from "@/components/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface EmpresaOption { id: string; cnpj: string; razaoSocial: string }
interface RespostaEstoque { movimentos: MovimentoKardex[]; resumo: { entradas: number; saidas: number; devolucoesVenda: number } }

export function EstoqueView({ empresas, empresaInicial }: { empresas: EmpresaOption[]; empresaInicial?: string }) {
  const [empresaId, setEmpresaId] = useState(empresaInicial && empresas.some((e) => e.id === empresaInicial) ? empresaInicial : (empresas[0]?.id ?? ""));
  const [periodo, setPeriodo] = useState<Periodo>(periodoMesAtual());
  const [movimentos, setMovimentos] = useState<MovimentoKardex[]>([]);
  const [resumo, setResumo] = useState<RespostaEstoque["resumo"]>({ entradas: 0, saidas: 0, devolucoesVenda: 0 });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(25);

  useEffect(() => { if (empresaInicial) setEmpresaId(empresaInicial); }, [empresaInicial]);

  async function consultar() {
    if (!empresaId) return toast.error("Selecione uma empresa.");
    setLoading(true); setErro(null);
    try {
      const resposta = await fetch("/api/estoque", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId, dtInicial: dataInputParaSyspro(periodo.inicial), dtFinal: dataInputParaSyspro(periodo.final) }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados.error || "Erro ao consultar o Kardex.");
      setMovimentos(dados.movimentos ?? []); setResumo(dados.resumo ?? { entradas: 0, saidas: 0, devolucoesVenda: 0 }); setPagina(1);
      toast.success(`${dados.movimentos?.length ?? 0} movimentações carregadas.`);
    } catch (causa) {
      const mensagem = causa instanceof Error ? causa.message : "Erro ao consultar o Kardex.";
      setErro(mensagem); setMovimentos([]); setResumo({ entradas: 0, saidas: 0, devolucoesVenda: 0 }); toast.error(mensagem);
    } finally { setLoading(false); }
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return movimentos;
    return movimentos.filter((m) => [m.produtoCodigoAuxiliar, m.produtoDescricao, m.documento, m.participante, m.grupoDocumento, m.descricaoGrupoDocumento].some((campo) => campo.toLowerCase().includes(termo)));
  }, [busca, movimentos]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const paginaMovimentos = filtrados.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina);

  return <div className="flex flex-col gap-6">
    <Card className="border-border/60 shadow-sm">
      <CardHeader><CardTitle className="flex items-center gap-2 text-xl"><PackageSearch className="size-5 text-primary" /> Movimentações de Estoque</CardTitle><CardDescription>Kardex por empresa e período. Consultas limitadas a 31 dias para preservar a API do Syspro.</CardDescription></CardHeader>
      <CardContent><DateRangeFilter value={periodo} onChange={setPeriodo} onConsultar={consultar} loading={loading} /></CardContent>
    </Card>
    {erro && <Card className="border-destructive/50 bg-destructive/5"><CardContent className="pt-6 text-sm font-medium text-destructive">{erro}</CardContent></Card>}
    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardContent className="flex items-center gap-3 pt-5"><ArrowDownToLine className="size-8 text-emerald-600" /><div><p className="text-xs text-muted-foreground">Entradas</p><p className="text-2xl font-bold">{formatarNumero(resumo.entradas)}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 pt-5"><ArrowUpFromLine className="size-8 text-rose-600" /><div><p className="text-xs text-muted-foreground">Saídas</p><p className="text-2xl font-bold">{formatarNumero(resumo.saidas)}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 pt-5"><RotateCcw className="size-8 text-amber-600" /><div><p className="text-xs text-muted-foreground">Devoluções de venda</p><p className="text-2xl font-bold">{formatarNumero(resumo.devolucoesVenda)}</p></div></CardContent></Card>
    </div>
    <Card className="border-border/60 shadow-sm"><CardHeader className="pb-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-base">Kardex detalhado</CardTitle><CardDescription>{filtrados.length} movimento(s) no período.</CardDescription></div><div className="relative w-full sm:w-80"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} className="pl-8" placeholder="Produto, documento, participante..." /></div></div></CardHeader>
      <CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Produto</TableHead><TableHead>Documento</TableHead><TableHead>Grupo</TableHead><TableHead>Participante</TableHead><TableHead className="text-right">Movimento</TableHead><TableHead className="text-right">Saldo</TableHead></TableRow></TableHeader><TableBody>{paginaMovimentos.length ? paginaMovimentos.map((m, i) => <TableRow key={`${m.documento}-${m.produtoCodigoAuxiliar}-${m.dataMovimento}-${i}`}><TableCell className="whitespace-nowrap text-xs">{m.dataMovimento}</TableCell><TableCell><p className="font-medium text-xs">{m.produtoDescricao}</p><p className="font-mono text-[10px] text-muted-foreground">{m.produtoCodigoAuxiliar}</p></TableCell><TableCell className="font-mono text-xs">{m.documento || "—"}</TableCell><TableCell><Badge variant="outline" className={m.direcao === "entrada" ? "border-emerald-500/40 text-emerald-700" : "border-rose-500/40 text-rose-700"}>{m.grupoDocumento || "—"} · {m.classificacao.rotulo}</Badge></TableCell><TableCell className="max-w-44 truncate text-xs">{m.participante || "—"}</TableCell><TableCell className={`text-right font-semibold ${m.direcao === "entrada" ? "text-emerald-600" : "text-rose-600"}`}>{m.direcao === "entrada" ? "+" : "−"}{formatarNumero(Math.abs(m.quantidadeMovimentada))}</TableCell><TableCell className="text-right font-medium">{formatarNumero(m.saldo)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={7} className="h-28 text-center text-sm text-muted-foreground">{loading ? "Consultando o Kardex..." : "Nenhuma movimentação encontrada."}</TableCell></TableRow>}</TableBody></Table></div>{filtrados.length > 0 && <div className="border-t p-3"><TablePagination paginaAtual={paginaAtual} totalItens={filtrados.length} itensPorPagina={porPagina} onPaginaChange={setPagina} onItensPorPaginaChange={(valor) => { setPorPagina(valor); setPagina(1); }} /></div>}</CardContent></Card>
  </div>;
}
