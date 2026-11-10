"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatarMoeda } from "@/lib/formatters";

export type TomGrafico = "neutro" | "positivo" | "negativo";

/** A cor vem do texto do contêiner (`currentColor`), então segue o tema claro/escuro. */
function classeTom(tom: TomGrafico): string {
  if (tom === "positivo") return "text-positivo";
  if (tom === "negativo") return "text-negativo";
  return "text-muted-foreground";
}

/**
 * Tendência compacta para faixa de indicadores: sem eixos, sem grade, sem
 * legenda. Só a forma importa — o valor exato está escrito ao lado.
 */
export function Sparkline({
  dados,
  tom = "neutro",
  altura = 28,
}: {
  dados: number[];
  tom?: TomGrafico;
  altura?: number;
}) {
  if (dados.length < 2) return null;
  const serie = dados.map((valor, indice) => ({ indice, valor }));

  return (
    <div className={`h-7 w-16 shrink-0 ${classeTom(tom)}`} style={{ height: altura }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={serie} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <Area
            type="monotone"
            dataKey="valor"
            stroke="currentColor"
            strokeWidth={1.5}
            fill="currentColor"
            fillOpacity={0.1}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface PontoGrafico {
  rotulo: string;
  valor: number;
}

/**
 * Gráfico de linha para leitura de tendência, com ponto clicável para
 * drill-down (o chamador filtra a tabela/visão pelo rótulo selecionado).
 */
export function GraficoLinha({
  dados,
  rotulo = "Valor",
  formato = "moeda",
  onPontoSelecionado,
  tom = "neutro",
  altura = 240,
}: {
  dados: PontoGrafico[];
  rotulo?: string;
  formato?: "moeda" | "numero";
  onPontoSelecionado?: (ponto: PontoGrafico) => void;
  tom?: TomGrafico;
  altura?: number;
}) {
  if (dados.length === 0) return null;
  const formatar = (valor: number) =>
    formato === "moeda" ? formatarMoeda(valor) : new Intl.NumberFormat("pt-BR").format(valor);

  return (
    <div className={`w-full ${classeTom(tom)}`} style={{ height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={dados}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          onClick={(estado) => {
            // Recharts v3 não expõe `activePayload` no tipo do evento, mas ele vem no runtime.
            const payload = (estado as unknown as { activePayload?: Array<{ payload: PontoGrafico }> })
              .activePayload;
            const ponto = payload?.[0]?.payload;
            if (ponto) onPontoSelecionado?.(ponto);
          }}
        >
          <CartesianGrid vertical={false} stroke="var(--linha)" strokeDasharray="0" />
          <XAxis
            dataKey="rotulo"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(valor: number) => formatar(valor)}
          />
          <Tooltip
            cursor={{ stroke: "var(--linha)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--linha)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
              boxShadow: "none",
            }}
            labelStyle={{ color: "var(--muted-foreground)", fontSize: 11 }}
            formatter={(valor) => [formatar(Number(valor)), rotulo]}
          />
          <Line
            type="monotone"
            dataKey="valor"
            stroke="currentColor"
            strokeWidth={1.75}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
