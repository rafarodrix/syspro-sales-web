import Link from "next/link";
import { Building2, ExternalLink, Layers } from "lucide-react";
import type { ItemEmpresaAnalise } from "@/lib/vendas";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import { DataBarPercent } from "./data-bar-percent";

interface ConsolidacaoEmpresasProps {
  empresas: ItemEmpresaAnalise[];
  abaAtiva: string;
}

/** Comparação transversal exibida somente quando há duas ou mais empresas selecionadas. */
export function ConsolidacaoEmpresas({ empresas, abaAtiva }: ConsolidacaoEmpresasProps) {
  return (
    <section className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary"><Layers className="size-4" /></div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Consolidação por empresa</h2>
            <p className="text-xs text-muted-foreground">Compare a participação de cada empresa antes de interpretar os rankings consolidados abaixo.</p>
          </div>
        </div>
        <span className="rounded-full border bg-background px-2 py-1 text-[10px] font-bold text-muted-foreground">{empresas.length} empresas</span>
      </div>

      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full min-w-[800px] text-xs">
          <thead><tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground"><th className="p-3">Empresa</th><th className="p-3 text-right">Pedidos / NF</th><th className="p-3 text-right">Itens</th><th className="p-3 text-right">Descontos</th><th className="p-3 text-right">Ticket médio</th><th className="p-3 text-right">Faturamento</th><th className="p-3 text-right">Participação</th><th className="w-10 p-3" aria-label="Ação" /></tr></thead>
          <tbody>{empresas.map((empresa) => (
            <tr key={empresa.id} className="border-b last:border-0 hover:bg-muted/20">
              <td className="p-3"><div className="flex items-center gap-2"><Building2 className="size-3.5 shrink-0 text-primary" /><div><p className="font-semibold text-foreground">{empresa.nome}</p>{empresa.cnpj ? <p className="font-mono text-[10px] text-muted-foreground">{empresa.cnpj}</p> : null}</div></div></td>
              <td className="p-3 text-right font-mono">{formatarNumero(empresa.pedidos, 0)}</td>
              <td className="p-3 text-right font-mono">{formatarNumero(empresa.quantidadeItens, 2)}</td>
              <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400">{formatarMoeda(empresa.descontos)}</td>
              <td className="p-3 text-right font-mono">{formatarMoeda(empresa.ticketMedio)}</td>
              <td className="p-3 text-right font-mono font-bold">{formatarMoeda(empresa.faturamento)}</td>
              <td className="p-3 text-right"><DataBarPercent valor={formatarPercentual(empresa.percentual, 1)} percentual={empresa.percentual} cor="bg-primary/20" /></td>
              <td className="p-3 text-right"><Link href={`/relatorios?aba=${encodeURIComponent(abaAtiva)}&empresa=${encodeURIComponent(empresa.id)}`} title={`Analisar somente ${empresa.nome}`} className="inline-flex rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary"><ExternalLink className="size-3.5" /></Link></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
