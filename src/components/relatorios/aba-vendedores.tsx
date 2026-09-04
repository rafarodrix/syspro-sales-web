import { useState } from "react";
import { FileText, LayoutList, MousePointerClick } from "lucide-react";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import { DataBarPercent } from "./data-bar-percent";
import { VisaoAnaliticaNotas } from "./visao-analitica-notas";
import { ReportViewSelector } from "./report-view-toggle";
import type { ItemVendedorAnalise, VendaAgrupada } from "@/lib/vendas";

type VisaoVendedores = "sintetico" | "analitico";

interface AbaVendedoresProps {
  vendedoresFiltrados: ItemVendedorAnalise[];
  /** Notas do período (agrupadas por NF), usadas na visão analítica. */
  notasAgrupadas: VendaAgrupada[];
}

export function AbaVendedores({ vendedoresFiltrados, notasAgrupadas }: AbaVendedoresProps) {
  const [visao, setVisao] = useState<VisaoVendedores>("sintetico");
  const [vendedoresSelecionados, setVendedoresSelecionados] = useState<string[]>([]);

  function abrirAnaliticoDoVendedor(nome: string) {
    setVendedoresSelecionados([nome]);
    setVisao("analitico");
  }

  return (
    <div className="space-y-4">
      <ReportViewSelector
        view={visao}
        description="Síntese compara a equipe; notas detalhadas explicam os resultados de cada vendedor."
        options={[
          { value: "sintetico", label: "Síntese", icon: LayoutList },
          { value: "analitico", label: "Notas detalhadas", icon: FileText },
        ]}
        onViewChange={(proximaVisao) => {
          setVendedoresSelecionados([]);
          setVisao(proximaVisao);
        }}
      />

      {visao === "sintetico" ? (
        <>
          {/* Tabela de Ranking Sintético */}
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[720px] text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
                  <th className="p-3">Vendedor</th>
                  <th className="p-3 text-right">Pedidos / NF</th>
                  <th className="p-3 text-right">Clientes Únicos</th>
                  <th className="p-3 text-right">Qtd Itens</th>
                  <th className="p-3 text-right">Ticket Médio</th>
                  <th className="p-3 text-right">Desconto (R$)</th>
                  <th className="p-3 text-right">% Desconto</th>
                  <th className="p-3 text-right">Faturamento Total</th>
                  <th className="p-3 text-right">% Participação</th>
                  <th className="p-3">Principal Produto</th>
                </tr>
              </thead>
              <tbody>
                {vendedoresFiltrados.map((vendedor) => (
                  <tr
                    key={vendedor.nome}
                    onClick={() => abrirAnaliticoDoVendedor(vendedor.nome)}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                    title="Clique para ver o analítico (notas) deste vendedor"
                  >
                    <td className="p-3 text-sm font-bold text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {vendedor.nome}
                        <MousePointerClick className="size-3 text-muted-foreground/60" />
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono">{formatarNumero(vendedor.pedidos, 0)}</td>
                    <td className="p-3 text-right font-mono">{formatarNumero(vendedor.clientes, 0)}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {formatarNumero(vendedor.quantidadeItens, 2)}
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {formatarMoeda(vendedor.ticketMedio)}
                    </td>
                    <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400">
                      {formatarMoeda(vendedor.descontoConcedido)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {formatarPercentual(vendedor.taxaDesconto, 1)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-foreground">
                      {formatarMoeda(vendedor.faturamento)}
                    </td>
                    <td className="p-3 text-right">
                      <DataBarPercent
                        valor={formatarPercentual(vendedor.percentual, 1)}
                        percentual={vendedor.percentual}
                        cor="bg-violet-500/20"
                      />
                    </td>
                    <td className="max-w-[180px] truncate p-3 text-muted-foreground" title={vendedor.principalProduto}>
                      {vendedor.principalProduto ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground">
            💡 Clique em um vendedor para alternar para a visão analítica com as notas dele.
          </p>
        </>
      ) : (
        <VisaoAnaliticaNotas
          notas={notasAgrupadas}
          dimensaoChave="vendedor"
          dimensaoRotulo="Vendedor"
          selecionados={vendedoresSelecionados}
          onSelecionadosChange={setVendedoresSelecionados}
          nomeCsvBase="vendas-analitico-vendedor"
          onVoltar={() => setVisao("sintetico")}
        />
      )}
    </div>
  );
}
