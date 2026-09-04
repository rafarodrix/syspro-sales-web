import { useMemo, useState } from "react";
import { MousePointerClick } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import type { ItemGeograficoAnalise, VendaAgrupada } from "@/lib/vendas";
import { TablePagination } from "@/components/table-pagination";
import { VisaoAnaliticaNotas } from "./visao-analitica-notas";
import { ReportViewToggle } from "./report-view-toggle";

interface AbaGeograficoProps {
  cidadesFiltradas: ItemGeograficoAnalise[];
  /** Notas do período (agrupadas por NF), usadas na visão analítica. */
  notasAgrupadas: VendaAgrupada[];
}

export function AbaGeografico({ cidadesFiltradas, notasAgrupadas }: AbaGeograficoProps) {
  const [visao, setVisao] = useState<"sintetico" | "analitico">("sintetico");
  const [cidadesSelecionadas, setCidadesSelecionadas] = useState<string[]>([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);

  const cidadesPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return cidadesFiltradas.slice(inicio, inicio + itensPorPagina);
  }, [cidadesFiltradas, paginaAtual, itensPorPagina]);

  function abrirAnaliticoDaCidade(cidade: string) {
    setCidadesSelecionadas([cidade]);
    setVisao("analitico");
  }

  return (
    <div className="space-y-4">
      <ReportViewToggle visao={visao} descricao="Síntese mostra o resultado por praça; notas detalhadas permitem investigar cada cidade." onChange={(proximaVisao) => { setCidadesSelecionadas([]); setVisao(proximaVisao); }} />

      {visao === "sintetico" ? (
        <>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[680px] text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
                  <th className="p-3">Cidade</th>
                  <th className="p-3">UF</th>
                  <th className="p-3 text-right">Pedidos / NF</th>
                  <th className="p-3 text-right">Clientes Atendidos</th>
                  <th className="p-3 text-right">Ticket Médio</th>
                  <th className="p-3 text-right">Frete Rateado</th>
                  <th className="p-3 text-right">Faturamento Total</th>
                  <th className="p-3 text-right">% Participação</th>
                </tr>
              </thead>
              <tbody>
                {cidadesPaginadas.map((cidade) => (
                  <tr
                    key={`${cidade.cidade}-${cidade.uf}`}
                    onClick={() => abrirAnaliticoDaCidade(cidade.cidade)}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                    title="Clique para ver as notas (analítico) desta cidade"
                  >
                    <td className="p-3 text-sm font-semibold text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {cidade.cidade}
                        <MousePointerClick className="size-3 text-muted-foreground/60" />
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold">
                      <Badge variant="outline">{cidade.uf}</Badge>
                    </td>
                    <td className="p-3 text-right font-mono">{formatarNumero(cidade.pedidos, 0)}</td>
                    <td className="p-3 text-right font-mono">{formatarNumero(cidade.clientes, 0)}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {formatarMoeda(cidade.ticketMedio)}
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {formatarMoeda(cidade.frete)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-foreground">
                      {formatarMoeda(cidade.faturamento)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-primary">
                      {formatarPercentual(cidade.percentual, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TablePagination
            paginaAtual={paginaAtual}
            totalItens={cidadesFiltradas.length}
            itensPorPagina={itensPorPagina}
            onPaginaChange={setPaginaAtual}
            onItensPorPaginaChange={setItensPorPagina}
            labelItens="cidades"
          />
          <p className="text-[11px] text-muted-foreground">
            💡 Clique em uma cidade para abrir a visão analítica com as notas dela.
          </p>
        </>
      ) : (
        <VisaoAnaliticaNotas
          notas={notasAgrupadas}
          dimensaoChave="cidade"
          dimensaoRotulo="Cidade"
          selecionados={cidadesSelecionadas}
          onSelecionadosChange={setCidadesSelecionadas}
          nomeCsvBase="vendas-analitico-cidade"
          onVoltar={() => setVisao("sintetico")}
        />
      )}
    </div>
  );
}
