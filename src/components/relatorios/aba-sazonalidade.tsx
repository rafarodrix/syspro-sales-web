import { useState } from "react";
import { CalendarDays, CalendarRange } from "lucide-react";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import { DataBarPercent } from "./data-bar-percent";
import { ReportViewSelector } from "./report-view-toggle";

type VisaoSazonalidade = "dia-semana" | "quinzena";

interface ItemSazonalidadeBase {
  pedidos: number;
  ticketMedio: number;
  faturamento: number;
  percentual: number;
}

interface AbaSazonalidadeProps {
  relatorioSazonalidade: {
    porDiaSemana: Array<ItemSazonalidadeBase & { dia: string }>;
    porQuinzena: Array<ItemSazonalidadeBase & { quinzena: string }>;
  };
}

function TabelaSazonalidade({ itens, rotulo }: { itens: Array<ItemSazonalidadeBase & { rotulo: string }>; rotulo: string }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[640px] text-xs">
        <thead>
          <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
            <th className="p-3">{rotulo}</th>
            <th className="p-3 text-right">Pedidos / NF</th>
            <th className="p-3 text-right">Ticket médio</th>
            <th className="p-3 text-right">Faturamento</th>
            <th className="p-3 text-right">Participação</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.rotulo} className="border-b last:border-0 hover:bg-muted/20">
              <td className="p-3 font-semibold">{item.rotulo}</td>
              <td className="p-3 text-right font-mono">{formatarNumero(item.pedidos, 0)}</td>
              <td className="p-3 text-right font-mono text-muted-foreground">{formatarMoeda(item.ticketMedio)}</td>
              <td className="p-3 text-right font-mono font-bold">{formatarMoeda(item.faturamento)}</td>
              <td className="p-3 text-right"><DataBarPercent valor={formatarPercentual(item.percentual, 1)} percentual={item.percentual} cor="bg-indigo-500/20" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AbaSazonalidade({ relatorioSazonalidade }: AbaSazonalidadeProps) {
  const [visao, setVisao] = useState<VisaoSazonalidade>("dia-semana");
  const porDiaSemana = relatorioSazonalidade.porDiaSemana.map(({ dia, ...item }) => ({ ...item, rotulo: dia }));
  const porQuinzena = relatorioSazonalidade.porQuinzena.map(({ quinzena, ...item }) => ({ ...item, rotulo: quinzena }));
  const exibeDiaSemana = visao === "dia-semana";

  return (
    <div className="space-y-4">
      <ReportViewSelector
        view={visao}
        onViewChange={setVisao}
        description="Dia da semana mostra a distribuição operacional; quinzena mostra a composição do mês por metade do período."
        options={[
          { value: "dia-semana", label: "Dia da semana", icon: CalendarDays },
          { value: "quinzena", label: "Quinzena", icon: CalendarRange },
        ]}
      />
      <TabelaSazonalidade itens={exibeDiaSemana ? porDiaSemana : porQuinzena} rotulo={exibeDiaSemana ? "Dia da semana" : "Quinzena"} />
    </div>
  );
}
