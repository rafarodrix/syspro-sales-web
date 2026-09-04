import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileText, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import type { ItemDepartamentoAnalise } from "@/lib/vendas";
import { DataBarPercent } from "./data-bar-percent";
import { MetricaCard } from "@/components/metrica-card";

interface AbaDepartamentosProps { deptosFiltrados: ItemDepartamentoAnalise[]; }
const estilo = (ativo: boolean) => `flex h-7 items-center gap-1 px-2 text-[11px] font-semibold ${ativo ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`;

/** Departamento com duas perspectivas: resumo por departamento ou itens detalhados. */
export function AbaDepartamentos({ deptosFiltrados }: AbaDepartamentosProps) {
  const [visao, setVisao] = useState<"sintetico" | "analitico">("sintetico");
  const [aberto, setAberto] = useState<string | null>(null);
  const total = useMemo(() => deptosFiltrados.reduce((soma, dep) => soma + dep.faturamento, 0), [deptosFiltrados]);
  const itens = useMemo(() => deptosFiltrados.flatMap((dep) => dep.produtos.map((produto) => ({ ...produto, departamento: dep.nome }))), [deptosFiltrados]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{visao === "sintetico" ? "Uma linha por departamento, com sua participação no faturamento." : "Produtos detalhados dentro dos departamentos filtrados."}</p>
        <div className="flex rounded-lg border bg-muted/20 p-0.5">
          <Button type="button" variant="ghost" className={estilo(visao === "sintetico")} onClick={() => setVisao("sintetico")}><LayoutList className="size-3.5" /> Sintético</Button>
          <Button type="button" variant="ghost" className={estilo(visao === "analitico")} onClick={() => setVisao("analitico")}><FileText className="size-3.5" /> Analítico</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricaCard rotulo="Departamentos" definicao="Quantidade de departamentos com venda no período atual." valor={formatarNumero(deptosFiltrados.length, 0)} />
        <MetricaCard rotulo="Produtos vendidos" definicao="Quantidade de produtos distintos vendidos nos departamentos filtrados." valor={formatarNumero(itens.length, 0)} destaque="primario" />
        <MetricaCard rotulo="Faturamento total" definicao="Soma do faturamento dos departamentos atualmente filtrados." valor={formatarMoeda(total)} destaque="primario" />
      </div>
      {visao === "analitico" ? (
        <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[760px] text-xs"><thead><tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground"><th className="p-3">Departamento</th><th className="p-3">Código</th><th className="p-3">Produto</th><th className="p-3 text-right">Quantidade</th><th className="p-3 text-right">Preço Médio</th><th className="p-3 text-right">Faturamento</th><th className="p-3 text-right">% do Departamento</th></tr></thead><tbody>{itens.map((item) => <tr key={`${item.departamento}-${item.id}`} className="border-b last:border-0 hover:bg-muted/20"><td className="p-3 font-semibold">{item.departamento}</td><td className="p-3 font-mono text-muted-foreground">{item.id}</td><td className="p-3">{item.produto}</td><td className="p-3 text-right font-mono">{formatarNumero(item.quantidade, 2)} {item.un}</td><td className="p-3 text-right font-mono">{formatarMoeda(item.precoMedio)}</td><td className="p-3 text-right font-mono font-bold">{formatarMoeda(item.total)}</td><td className="p-3 text-right font-mono text-muted-foreground">—</td></tr>)}</tbody></table></div>
      ) : (
        <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[700px] text-xs"><thead><tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground"><th className="w-10 p-3" /><th className="p-3">Departamento</th><th className="p-3 text-right">Produtos Distintos</th><th className="p-3 text-right">Qtd Total Itens</th><th className="p-3 text-right">Preço Médio / Item</th><th className="p-3 text-right">Faturamento</th><th className="p-3 text-right">Participação</th></tr></thead><tbody>{deptosFiltrados.map((dep) => { const isOpen = aberto === dep.nome; return <Fragment key={dep.nome}><tr className={`border-b hover:bg-muted/20 ${isOpen ? "bg-muted/30" : ""}`}><td className="p-3"><Button aria-label={`${isOpen ? "Fechar" : "Abrir"} ${dep.nome}`} size="icon-sm" variant="ghost" onClick={() => setAberto(isOpen ? null : dep.nome)}>{isOpen ? <ChevronDown /> : <ChevronRight />}</Button></td><td className="p-3 text-sm font-bold">{dep.nome}</td><td className="p-3 text-right font-mono">{dep.quantidadeProdutosDistintos}</td><td className="p-3 text-right font-mono">{formatarNumero(dep.quantidadeItens, 2)}</td><td className="p-3 text-right font-mono">{formatarMoeda(dep.ticketMedioPorItem)}</td><td className="p-3 text-right font-mono font-bold">{formatarMoeda(dep.faturamento)}</td><td className="p-3 text-right"><DataBarPercent valor={formatarPercentual(dep.percentual, 1)} percentual={dep.percentual} cor="bg-blue-500/20" /></td></tr>{isOpen && <tr><td colSpan={7} className="bg-muted/20 p-4"><div className="text-xs font-semibold text-muted-foreground">{dep.produtos.length} produtos no departamento — use a visão Analítico para comparar todos.</div></td></tr>}</Fragment>; })}</tbody></table></div>
      )}
    </div>
  );
}
