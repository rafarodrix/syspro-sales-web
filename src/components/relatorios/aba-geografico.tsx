import { useMemo, useState } from "react";
import { FileText, LayoutList, Map, MousePointerClick } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import type { ItemGeograficoAnalise, ItemUFVendas, VendaAgrupada } from "@/lib/vendas";
import { TablePagination } from "@/components/table-pagination";
import { VisaoAnaliticaNotas } from "./visao-analitica-notas";
import { ReportViewSelector } from "./report-view-toggle";

export function AbaGeografico({ cidadesFiltradas, ufsFiltradas, notasAgrupadas }: { cidadesFiltradas: ItemGeograficoAnalise[]; ufsFiltradas: ItemUFVendas[]; notasAgrupadas: VendaAgrupada[] }) {
  const [visao, setVisao] = useState<"uf" | "cidade" | "analitico">("uf");
  const [uf, setUf] = useState<string | null>(null); const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [pagina, setPagina] = useState(1); const [porPagina, setPorPagina] = useState(25);
  const cidades = useMemo(() => uf ? cidadesFiltradas.filter((cidade) => cidade.uf === uf) : cidadesFiltradas, [cidadesFiltradas, uf]);
  const paginadas = cidades.slice((pagina - 1) * porPagina, pagina * porPagina);
  const abrirCidade = (cidade: string) => { setSelecionadas([cidade]); setVisao("analitico"); };
  return <div className="space-y-4">
    <ReportViewSelector
      view={visao}
      description="UF consolida estados, Cidade detalha praças e Notas detalhadas permite investigar documentos fiscais."
      options={[
        { value: "uf", label: "UF", icon: Map },
        { value: "cidade", label: "Cidade", icon: LayoutList },
        { value: "analitico", label: "Notas", icon: FileText },
      ]}
      onViewChange={(proximaVisao) => {
        if (proximaVisao === "uf") setUf(null);
        if (proximaVisao === "analitico") setSelecionadas([]);
        setVisao(proximaVisao);
      }}
    />
    {visao === "analitico" ? <VisaoAnaliticaNotas notas={notasAgrupadas} dimensaoChave="cidade" dimensaoRotulo="Cidade" selecionados={selecionadas} onSelecionadosChange={setSelecionadas} nomeCsvBase="vendas-analitico-cidade" onVoltar={() => setVisao(uf ? "cidade" : "uf")} /> : visao === "uf" ? <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[760px] text-xs"><thead><tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground"><th className="p-3">UF</th><th className="p-3 text-right">Cidades</th><th className="p-3 text-right">Pedidos</th><th className="p-3 text-right">Clientes</th><th className="p-3 text-right">Ticket médio</th><th className="p-3 text-right">Frete</th><th className="p-3 text-right">Faturamento</th><th className="p-3 text-right">Participação</th></tr></thead><tbody>{ufsFiltradas.map((item) => <tr key={item.uf} onClick={() => { setUf(item.uf); setPagina(1); setVisao("cidade"); }} className="cursor-pointer border-b hover:bg-muted/30"><td className="p-3 font-bold"><Badge variant="outline">{item.uf}</Badge> <MousePointerClick className="ml-1 inline size-3" /></td><td className="p-3 text-right font-mono">{item.cidades}</td><td className="p-3 text-right font-mono">{item.pedidos}</td><td className="p-3 text-right font-mono">{item.clientes}</td><td className="p-3 text-right font-mono">{formatarMoeda(item.ticketMedio)}</td><td className="p-3 text-right font-mono">{formatarMoeda(item.frete)}</td><td className="p-3 text-right font-mono font-bold">{formatarMoeda(item.faturamento)}</td><td className="p-3 text-right font-mono text-primary">{formatarPercentual(item.percentual, 1)}</td></tr>)}</tbody></table></div> : <><div className="flex justify-between rounded-lg border bg-muted/20 p-2 text-xs">{uf ? <>Cidades de <Badge variant="outline">{uf}</Badge></> : "Todas as cidades"}{uf ? <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setUf(null); setVisao("uf"); }}>Voltar para UF</Button> : null}</div><div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[680px] text-xs"><thead><tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground"><th className="p-3">Cidade</th><th className="p-3">UF</th><th className="p-3 text-right">Pedidos</th><th className="p-3 text-right">Clientes</th><th className="p-3 text-right">Ticket médio</th><th className="p-3 text-right">Frete</th><th className="p-3 text-right">Faturamento</th><th className="p-3 text-right">Participação</th></tr></thead><tbody>{paginadas.map((cidade) => <tr key={`${cidade.cidade}-${cidade.uf}`} onClick={() => abrirCidade(cidade.cidade)} className="cursor-pointer border-b hover:bg-muted/30"><td className="p-3 font-semibold">{cidade.cidade} <MousePointerClick className="ml-1 inline size-3" /></td><td className="p-3"><Badge variant="outline">{cidade.uf}</Badge></td><td className="p-3 text-right font-mono">{formatarNumero(cidade.pedidos, 0)}</td><td className="p-3 text-right font-mono">{formatarNumero(cidade.clientes, 0)}</td><td className="p-3 text-right font-mono">{formatarMoeda(cidade.ticketMedio)}</td><td className="p-3 text-right font-mono">{formatarMoeda(cidade.frete)}</td><td className="p-3 text-right font-mono font-bold">{formatarMoeda(cidade.faturamento)}</td><td className="p-3 text-right font-mono text-primary">{formatarPercentual(cidade.percentual, 1)}</td></tr>)}</tbody></table></div><TablePagination paginaAtual={pagina} totalItens={cidades.length} itensPorPagina={porPagina} onPaginaChange={setPagina} onItensPorPaginaChange={(valor) => { setPorPagina(valor); setPagina(1); }} labelItens="cidades" /></>}
  </div>;
}
