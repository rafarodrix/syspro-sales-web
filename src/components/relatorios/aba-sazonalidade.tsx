import type { Periodo } from "@/lib/periodo";
import { ReportChart } from "./report-chart";
import { ReportTable } from "./report-table";
import { useState } from "react";
import { CalendarDays, CalendarRange, ChartLine } from "lucide-react";
import {
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
} from "@/lib/formatters";
import { DataBarPercent } from "./data-bar-percent";
import { ReportViewSelector } from "./report-view-toggle";

type VisaoSazonalidade = "dia-semana" | "quinzena" | "diario" | "mensal";

interface ItemSazonalidadeBase {
  pedidos: number;
  ticketMedio: number;
  faturamento: number;
  percentual: number;
}

interface AbaSazonalidadeProps {
  periodo: Periodo;
  relatorioSazonalidade: {
    porDiaSemana: Array<ItemSazonalidadeBase & { dia: string }>;
    porQuinzena: Array<ItemSazonalidadeBase & { quinzena: string }>;
  };
  relatorioEvolucao: {
    diario: ItemEvolucao[];
    mensal: ItemEvolucao[];
  };
}

interface ItemEvolucao extends ItemSazonalidadeBase {
  periodo: string;
  descontos: number;
}

function TabelaSazonalidade({
  itens,
  rotulo,
}: {
  itens: Array<ItemSazonalidadeBase & { rotulo: string }>;
  rotulo: string;
}) {
  return (
    <ReportTable
      data={itens}
      rowKey={(item) => item.rotulo}
      columns={[
        {
          id: "rotulo",
          header: <>{rotulo}</>,
          kind: "name",
          value: (item) => item.rotulo,
          cell: (item) => <>{item.rotulo}</>,
        },
        {
          id: "pedidos",
          header: <>Pedidos / NF</>,
          kind: "number",
          value: (item) => item.pedidos,
          cell: (item) => <>{formatarNumero(item.pedidos, 0)}</>,
        },
        {
          id: "ticketMedio",
          header: <>Ticket médio</>,
          kind: "currency",
          value: (item) => item.ticketMedio,
          cell: (item) => <>{formatarMoeda(item.ticketMedio)}</>,
        },
        {
          id: "faturamento",
          header: <>Faturamento</>,
          kind: "currency",
          value: (item) => item.faturamento,
          cell: (item) => <>{formatarMoeda(item.faturamento)}</>,
        },
        {
          id: "percentual",
          header: <>Participação</>,
          kind: "number",
          value: (item) => item.percentual,
          cell: (item) => (
            <>
              <DataBarPercent
                valor={formatarPercentual(item.percentual, 1)}
                percentual={item.percentual}
                cor="bg-indigo-500/20"
              />
            </>
          ),
        },
      ]}
    />
  );
}

function TabelaEvolucao({
  itens,
  rotulo,
  mensal,
}: {
  itens: ItemEvolucao[];
  rotulo: string;
  mensal: boolean;
}) {
  return (
    <ReportTable
      data={itens}
      rowKey={(item) => item.periodo}
      columns={[
        {
          id: "periodo",
          header: <>{rotulo}</>,
          kind: "name",
          value: (item) => item.periodo,
          cell: (item) => (
            <>
              {mensal
                ? `${item.periodo.slice(5, 7)}/${item.periodo.slice(0, 4)}`
                : item.periodo.split("-").reverse().join("/")}
            </>
          ),
        },
        {
          id: "pedidos",
          header: <>Pedidos / NF</>,
          kind: "number",
          value: (item) => item.pedidos,
          cell: (item) => <>{formatarNumero(item.pedidos, 0)}</>,
        },
        {
          id: "ticketMedio",
          header: <>Ticket médio</>,
          kind: "currency",
          value: (item) => item.ticketMedio,
          cell: (item) => <>{formatarMoeda(item.ticketMedio)}</>,
        },
        {
          id: "descontos",
          header: <>Descontos</>,
          kind: "number",
          value: (item) => item.descontos,
          cell: (item) => <>{formatarMoeda(item.descontos)}</>,
        },
        {
          id: "faturamento",
          header: <>Faturamento</>,
          kind: "currency",
          value: (item) => item.faturamento,
          cell: (item) => <>{formatarMoeda(item.faturamento)}</>,
        },
        {
          id: "percentual",
          header: <>Participação</>,
          kind: "number",
          value: (item) => item.percentual,
          cell: (item) => (
            <>
              <DataBarPercent
                valor={formatarPercentual(item.percentual, 1)}
                percentual={item.percentual}
                cor="bg-indigo-500/20"
              />
            </>
          ),
        },
      ]}
    />
  );
}

export function AbaSazonalidade({
  relatorioSazonalidade,
  relatorioEvolucao,
  periodo,
}: AbaSazonalidadeProps) {
  const [visao, setVisao] = useState<VisaoSazonalidade>("diario");
  const porDiaSemana = relatorioSazonalidade.porDiaSemana.map(
    ({ dia, ...item }) => ({ ...item, rotulo: dia }),
  );
  const porQuinzena = relatorioSazonalidade.porQuinzena.map(
    ({ quinzena, ...item }) => ({ ...item, rotulo: quinzena }),
  );
  const exibeDiaSemana = visao === "dia-semana";
  const exibeEvolucao = visao === "diario" || visao === "mensal";

  const serie = [];
  const mensal = visao === "mensal";
  const valores = new Map(
    (mensal ? relatorioEvolucao.mensal : relatorioEvolucao.diario).map(
      (item) => [item.periodo, item.faturamento],
    ),
  );
  const cursor = new Date(`${periodo.inicial}T00:00:00Z`);
  if (mensal) cursor.setUTCDate(1);
  while (cursor.toISOString().slice(0, 10) <= periodo.final) {
    const iso = cursor.toISOString().slice(0, mensal ? 7 : 10);
    serie.push({
      label: mensal
        ? `${iso.slice(5)}/${iso.slice(0, 4)}`
        : iso.split("-").reverse().join("/"),
      value: valores.get(iso) ?? 0,
    });
    if (mensal) cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return (
    <div className="space-y-4">
      <ReportViewSelector
        view={visao}
        onViewChange={setVisao}
        options={[
          { value: "diario", label: "Diário", icon: ChartLine },
          { value: "mensal", label: "Mensal", icon: CalendarRange },
          { value: "dia-semana", label: "Dia da semana", icon: CalendarDays },
          { value: "quinzena", label: "Quinzena", icon: CalendarRange },
        ]}
      />
      <ReportChart
        key={visao}
        temporal={exibeEvolucao}
        points={
          exibeEvolucao
            ? serie
            : (exibeDiaSemana ? porDiaSemana : porQuinzena).map((item) => ({
                label: item.rotulo,
                value: item.faturamento,
                percentual: item.percentual,
              }))
        }
      />
      {exibeEvolucao ? (
        <TabelaEvolucao
          itens={
            visao === "diario"
              ? relatorioEvolucao.diario
              : relatorioEvolucao.mensal
          }
          rotulo={visao === "diario" ? "Emissão" : "Mês"}
          mensal={visao === "mensal"}
        />
      ) : (
        <TabelaSazonalidade
          itens={exibeDiaSemana ? porDiaSemana : porQuinzena}
          rotulo={exibeDiaSemana ? "Dia da semana" : "Quinzena"}
        />
      )}
    </div>
  );
}
