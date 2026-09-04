import { useState } from "react";
import { FileText, LayoutList, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import { DataBarPercent } from "./data-bar-percent";
import { TermoExplicado } from "@/components/relatorio-guia";
import { VisaoAnaliticaNotas } from "./visao-analitica-notas";
import type { ItemVendedorAnalise, VendaAgrupada } from "@/lib/vendas";

type VisaoVendedores = "sintetico" | "analitico";

interface AbaVendedoresProps {
  vendedoresFiltrados: ItemVendedorAnalise[];
  /** Notas do período (agrupadas por NF), usadas na visão analítica. */
  notasAgrupadas: VendaAgrupada[];
}

const estiloBotaoVisao = (ativo: boolean) =>
  `flex h-7 items-center gap-1 px-2 text-[11px] font-semibold transition-colors ${
    ativo ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
  }`;

export function AbaVendedores({ vendedoresFiltrados, notasAgrupadas }: AbaVendedoresProps) {
  const [visao, setVisao] = useState<VisaoVendedores>("sintetico");
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string>("todos");

  function abrirAnaliticoDoVendedor(nome: string) {
    setVendedorSelecionado(nome);
    setVisao("analitico");
  }

  return (
    <div className="space-y-4">
      {/* Alternador de visão: Sintético (ranking) vs. Analítico (notas) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TermoExplicado
          termo="Visões do relatório"
          definicao="Sintético: ranking consolidado por vendedor. Analítico: as notas/NF que compõem os números, filtráveis por vendedor. Clique em um vendedor do ranking para abrir o analítico dele."
        />
        <div className="flex items-center gap-0.5 rounded-lg border bg-muted/20 p-0.5">
          <Button
            type="button"
            variant="ghost"
            className={estiloBotaoVisao(visao === "sintetico")}
            onClick={() => setVisao("sintetico")}
            title="Ranking consolidado por vendedor"
          >
            <LayoutList className="size-3.5" />
            Sintético
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={estiloBotaoVisao(visao === "analitico")}
            onClick={() => {
              setVendedorSelecionado("todos");
              setVisao("analitico");
            }}
            title="Notas/NF detalhadas, filtráveis por vendedor"
          >
            <FileText className="size-3.5" />
            Analítico
          </Button>
        </div>
      </div>

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
          dimensaoInicial={vendedorSelecionado}
          nomeCsvBase="vendas-analitico-vendedor"
          onVoltar={() => setVisao("sintetico")}
        />
      )}
    </div>
  );
}
