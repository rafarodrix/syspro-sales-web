import { useMemo, useState } from "react";
import { FileText, LayoutList, MousePointerClick } from "lucide-react";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import type { ItemDepartamentoAnalise } from "@/lib/vendas";
import { DataBarPercent } from "./data-bar-percent";
import { ReportViewSelector } from "./report-view-toggle";

export function AbaDepartamentos({ deptosFiltrados }: { deptosFiltrados: ItemDepartamentoAnalise[] }) {
  const [visao, setVisao] = useState<"sintetico" | "analitico">("sintetico");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const itens = useMemo(() => deptosFiltrados.flatMap((dep) => dep.produtos.map((produto) => ({ ...produto, departamento: dep.nome }))), [deptosFiltrados]);
  const itensVisiveis = selecionado ? itens.filter((item) => item.departamento === selecionado) : itens;
  const abrir = (nome: string) => { setSelecionado(nome); setVisao("analitico"); };
  return <div className="space-y-4">
    <ReportViewSelector
      view={visao}
      description="Síntese compara departamentos; produtos detalhados mostra os itens que formam cada resultado."
      options={[
        { value: "sintetico", label: "Síntese", icon: LayoutList },
        { value: "analitico", label: "Produtos detalhados", icon: FileText },
      ]}
      onViewChange={(novaVisao) => {
        setSelecionado(null);
        setVisao(novaVisao);
      }}
    />
    {visao === "analitico" ? <><div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">{selecionado ? <>Produtos do departamento <strong className="text-foreground">{selecionado}</strong></> : "Todos os produtos dos departamentos"}</div><div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[760px] text-xs"><thead><tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground"><th className="p-3">Departamento</th><th className="p-3">Código</th><th className="p-3">Produto</th><th className="p-3 text-right">Quantidade</th><th className="p-3 text-right">Preço médio</th><th className="p-3 text-right">Faturamento</th></tr></thead><tbody>{itensVisiveis.map((item) => <tr key={`${item.departamento}-${item.id}`} className="border-b hover:bg-muted/20"><td className="p-3 font-semibold">{item.departamento}</td><td className="p-3 font-mono">{item.id}</td><td className="p-3">{item.produto}</td><td className="p-3 text-right font-mono">{formatarNumero(item.quantidade, 2)} {item.un}</td><td className="p-3 text-right font-mono">{formatarMoeda(item.precoMedio)}</td><td className="p-3 text-right font-mono font-bold">{formatarMoeda(item.total)}</td></tr>)}</tbody></table></div></> : <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[700px] text-xs"><thead><tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground"><th className="p-3">Departamento</th><th className="p-3 text-right">Produtos</th><th className="p-3 text-right">Itens</th><th className="p-3 text-right">Preço médio</th><th className="p-3 text-right">Faturamento</th><th className="p-3 text-right">Participação</th></tr></thead><tbody>{deptosFiltrados.map((dep) => <tr key={dep.nome} className="border-b hover:bg-muted/20"><td className="p-3 font-bold"><button type="button" onClick={() => abrir(dep.nome)} className="inline-flex items-center gap-1.5 hover:text-primary hover:underline">{dep.nome}<MousePointerClick className="size-3 text-muted-foreground/60" /></button></td><td className="p-3 text-right font-mono">{dep.quantidadeProdutosDistintos}</td><td className="p-3 text-right font-mono">{formatarNumero(dep.quantidadeItens, 2)}</td><td className="p-3 text-right font-mono">{formatarMoeda(dep.ticketMedioPorItem)}</td><td className="p-3 text-right font-mono font-bold">{formatarMoeda(dep.faturamento)}</td><td className="p-3 text-right"><DataBarPercent valor={formatarPercentual(dep.percentual, 1)} percentual={dep.percentual} cor="bg-blue-500/20" /></td></tr>)}</tbody></table></div>}
  </div>;
}
