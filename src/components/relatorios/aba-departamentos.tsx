import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import type { ItemDepartamentoAnalise } from "@/lib/vendas";
import { DataBarPercent } from "./data-bar-percent";

interface AbaDepartamentosProps {
  deptosFiltrados: ItemDepartamentoAnalise[];
}

export function AbaDepartamentos({ deptosFiltrados }: AbaDepartamentosProps) {
  const [departamentoAberto, setDepartamentoAberto] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[640px] text-xs">
          <thead>
            <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
              <th className="p-3 w-10" />
              <th className="p-3">Departamento</th>
              <th className="p-3 text-right">Produtos Distintos</th>
              <th className="p-3 text-right">Qtd Total Itens</th>
              <th className="p-3 text-right">Preço Médio / Item</th>
              <th className="p-3 text-right">Faturamento Total</th>
              <th className="p-3 text-right">% Participação</th>
            </tr>
          </thead>
          <tbody>
            {deptosFiltrados.map((dep) => {
              const aberto = departamentoAberto === dep.nome;
              return (
                <div key={dep.nome} className="contents">
                  <tr
                    className={`border-b hover:bg-muted/20 ${aberto ? "bg-muted/30" : ""}`}
                  >
                    <td className="p-3">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() =>
                          setDepartamentoAberto(aberto ? null : dep.nome)
                        }
                      >
                        {aberto ? <ChevronDown /> : <ChevronRight />}
                      </Button>
                    </td>
                    <td className="p-3 font-bold text-sm text-foreground">
                      {dep.nome}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {dep.quantidadeProdutosDistintos}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {formatarNumero(dep.quantidadeItens, 2)}
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {formatarMoeda(dep.ticketMedioPorItem)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-foreground">
                      {formatarMoeda(dep.faturamento)}
                    </td>
                    <td className="p-3 text-right">
                      <DataBarPercent
                        valor={formatarPercentual(dep.percentual, 1)}
                        percentual={dep.percentual}
                        cor="bg-blue-500/20"
                      />
                    </td>
                  </tr>

                  {aberto && (
                    <tr>
                      <td colSpan={7} className="bg-muted/20 p-4">
                        <div className="rounded-md border bg-background overflow-hidden">
                          <div className="bg-muted/40 p-2.5 font-bold text-xs text-foreground border-b">
                            Produtos no Departamento: {dep.nome} ({dep.produtos.length} itens)
                          </div>
                          <table className="w-full min-w-[640px] text-xs">
                            <thead>
                              <tr className="border-b text-left text-muted-foreground font-semibold">
                                <th className="p-2.5">Código</th>
                                <th className="p-2.5">Descrição</th>
                                <th className="p-2.5 text-right">Qtd</th>
                                <th className="p-2.5 text-right">Preço Médio</th>
                                <th className="p-2.5 text-right">Faturamento</th>
                                <th className="p-2.5 text-right">% do Depto</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dep.produtos.map((prod) => (
                                <tr key={prod.id} className="border-b last:border-0 hover:bg-muted/10">
                                  <td className="p-2.5 font-mono text-muted-foreground">{prod.id}</td>
                                  <td className="p-2.5 font-medium text-foreground">{prod.produto}</td>
                                  <td className="p-2.5 text-right font-mono">{formatarNumero(prod.quantidade, 2)} {prod.un}</td>
                                  <td className="p-2.5 text-right font-mono text-muted-foreground">{formatarMoeda(prod.precoMedio)}</td>
                                  <td className="p-2.5 text-right font-mono font-bold text-foreground">{formatarMoeda(prod.total)}</td>
                                  <td className="p-2.5 text-right font-mono text-primary font-semibold">{formatarPercentual(prod.percentual, 1)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </div>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
