import { useMemo, useState } from "react";
import { FileText, LayoutList, Map, MousePointerClick } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import type { ItemGeograficoAnalise, ItemUFVendas, VendaAgrupada } from "@/lib/vendas";
import { TablePagination } from "@/components/table-pagination";
import { TermoExplicado } from "@/components/relatorio-guia";
import { VisaoAnaliticaNotas } from "./visao-analitica-notas";

interface AbaGeograficoProps {
  cidadesFiltradas: ItemGeograficoAnalise[];
  ufsFiltradas: ItemUFVendas[];
  notasAgrupadas: VendaAgrupada[];
}

const estiloBotaoVisao = (ativo: boolean) =>
  `flex h-7 items-center gap-1 px-2 text-[11px] font-semibold transition-colors ${
    ativo ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
  }`;

/** Relatório geográfico com duas perspectivas dos mesmos dados: UF e cidade. */
export function AbaGeografico({ cidadesFiltradas, ufsFiltradas, notasAgrupadas }: AbaGeograficoProps) {
  const [visao, setVisao] = useState<"uf" | "cidade" | "analitico">("uf");
  const [ufSelecionada, setUfSelecionada] = useState<string | null>(null);
  const [cidadesSelecionadas, setCidadesSelecionadas] = useState<string[]>([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);

  const cidadesDaUf = useMemo(
    () => (ufSelecionada ? cidadesFiltradas.filter((cidade) => cidade.uf === ufSelecionada) : cidadesFiltradas),
    [cidadesFiltradas, ufSelecionada],
  );
  const cidadesPaginadas = cidadesDaUf.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  function abrirCidadesDaUf(uf: string) {
    setUfSelecionada(uf);
    setVisao("cidade");
    setPaginaAtual(1);
  }

  function abrirAnaliticoDaCidade(cidade: string) {
    setCidadesSelecionadas([cidade]);
    setVisao("analitico");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TermoExplicado
          termo="Visões geográficas"
          definicao="UF consolida o faturamento por estado. Cidade detalha as cidades dentro do estado selecionado. Analítico lista as notas fiscais e permite filtrar várias cidades."
        />
        <div className="flex items-center gap-0.5 rounded-lg border bg-muted/20 p-0.5">
          <Button type="button" variant="ghost" className={estiloBotaoVisao(visao === "uf")} onClick={() => { setVisao("uf"); setUfSelecionada(null); }}>
            <Map className="size-3.5" /> UF
          </Button>
          <Button type="button" variant="ghost" className={estiloBotaoVisao(visao === "cidade")} onClick={() => setVisao("cidade")}>
            <LayoutList className="size-3.5" /> Cidade
          </Button>
          <Button type="button" variant="ghost" className={estiloBotaoVisao(visao === "analitico")} onClick={() => { setVisao("analitico"); setCidadesSelecionadas([]); }}>
            <FileText className="size-3.5" /> Analítico
          </Button>
        </div>
      </div>

      {visao === "analitico" ? (
        <VisaoAnaliticaNotas
          notas={notasAgrupadas}
          dimensaoChave="cidade"
          dimensaoRotulo="Cidade"
          selecionados={cidadesSelecionadas}
          onSelecionadosChange={setCidadesSelecionadas}
          nomeCsvBase="vendas-analitico-cidade"
          onVoltar={() => setVisao(ufSelecionada ? "cidade" : "uf")}
        />
      ) : visao === "uf" ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[760px] text-xs">
            <thead><tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
              <th className="p-3">UF</th><th className="p-3 text-right">Cidades</th><th className="p-3 text-right">Pedidos / NF</th><th className="p-3 text-right">Clientes</th><th className="p-3 text-right">Ticket Médio</th><th className="p-3 text-right">Frete</th><th className="p-3 text-right">Faturamento</th><th className="p-3 text-right">Participação</th>
            </tr></thead>
            <tbody>{ufsFiltradas.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Nenhum UF encontrado.</td></tr> : ufsFiltradas.map((item) => (
              <tr key={item.uf} onClick={() => abrirCidadesDaUf(item.uf)} className="cursor-pointer border-b last:border-0 hover:bg-muted/30" title="Clique para detalhar as cidades deste estado">
                <td className="p-3 font-mono text-sm font-bold"><span className="inline-flex items-center gap-1.5"><Badge variant="outline">{item.uf}</Badge><MousePointerClick className="size-3 text-muted-foreground/60" /></span></td>
                <td className="p-3 text-right font-mono">{formatarNumero(item.cidades, 0)}</td><td className="p-3 text-right font-mono">{formatarNumero(item.pedidos, 0)}</td><td className="p-3 text-right font-mono">{formatarNumero(item.clientes, 0)}</td><td className="p-3 text-right font-mono">{formatarMoeda(item.ticketMedio)}</td><td className="p-3 text-right font-mono text-muted-foreground">{formatarMoeda(item.frete)}</td><td className="p-3 text-right font-mono font-bold">{formatarMoeda(item.faturamento)}</td><td className="p-3 text-right font-mono font-bold text-primary">{formatarPercentual(item.percentual, 1)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2">
            <div className="text-xs text-muted-foreground">{ufSelecionada ? <>Cidades do estado <Badge variant="outline">{ufSelecionada}</Badge></> : "Todas as cidades"}</div>
            {ufSelecionada && <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setUfSelecionada(null); setVisao("uf"); }}>Voltar para UF</Button>}
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[680px] text-xs"><thead><tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground"><th className="p-3">Cidade</th><th className="p-3">UF</th><th className="p-3 text-right">Pedidos</th><th className="p-3 text-right">Clientes</th><th className="p-3 text-right">Ticket Médio</th><th className="p-3 text-right">Frete</th><th className="p-3 text-right">Faturamento</th><th className="p-3 text-right">Participação</th></tr></thead>
              <tbody>{cidadesPaginadas.map((cidade) => <tr key={`${cidade.cidade}-${cidade.uf}`} onClick={() => abrirAnaliticoDaCidade(cidade.cidade)} className="cursor-pointer border-b last:border-0 hover:bg-muted/30"><td className="p-3 font-semibold">{cidade.cidade}</td><td className="p-3"><Badge variant="outline">{cidade.uf}</Badge></td><td className="p-3 text-right font-mono">{formatarNumero(cidade.pedidos, 0)}</td><td className="p-3 text-right font-mono">{formatarNumero(cidade.clientes, 0)}</td><td className="p-3 text-right font-mono">{formatarMoeda(cidade.ticketMedio)}</td><td className="p-3 text-right font-mono">{formatarMoeda(cidade.frete)}</td><td className="p-3 text-right font-mono font-bold">{formatarMoeda(cidade.faturamento)}</td><td className="p-3 text-right font-mono font-bold text-primary">{formatarPercentual(cidade.percentual, 1)}</td></tr>)}</tbody></table>
          </div>
          <TablePagination paginaAtual={paginaAtual} totalItens={cidadesDaUf.length} itensPorPagina={itensPorPagina} onPaginaChange={setPaginaAtual} onItensPorPaginaChange={(valor) => { setItensPorPagina(valor); setPaginaAtual(1); }} labelItens="cidades" />
          <p className="text-[11px] text-muted-foreground">💡 Clique em uma cidade para abrir as notas fiscais. Clique em UF para retornar ao consolidado por estado.</p>
        </>
      )}
    </div>
  );
}
