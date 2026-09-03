"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CreditCard, ArrowRight } from "lucide-react";
import type { ItemRankeado } from "@/lib/vendas";
import { formatarMoeda, formatarPercentual } from "@/lib/formatters";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CORES_PALETA = [
  "oklch(0.488 0.243 264.376)", // Indigo / Primary
  "oklch(0.6 0.18 145)",       // Emerald
  "oklch(0.7 0.16 70)",        // Amber
  "oklch(0.55 0.2 300)",       // Violet
  "oklch(0.65 0.15 220)",      // Cyan
  "oklch(0.65 0.22 25)",       // Rose
  "oklch(0.55 0.05 260)",      // Slate
];

interface PieChartCardProps {
  titulo: string;
  descricao: string;
  itens: ItemRankeado[];
  empresaId?: string;
  drilldownParam?: string;
}

export function PieChartCard({
  titulo,
  descricao,
  itens,
  empresaId,
  drilldownParam = "formaPagamento",
}: PieChartCardProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const totalFaturamento = useMemo(
    () => itens.reduce((acc, item) => acc + item.total, 0),
    [itens],
  );

  // Top 5 + Outros
  const { fatias, dadosFiltrados } = useMemo(() => {
    if (!itens.length || totalFaturamento === 0) {
      return { fatias: [], dadosFiltrados: [] };
    }

    const principais = itens.slice(0, 5);
    const outrosTotal = itens.slice(5).reduce((acc, item) => acc + item.total, 0);

    const dados = [...principais];
    if (outrosTotal > 0) {
      dados.push({
        nome: "Outros",
        total: outrosTotal,
        percentual: (outrosTotal / totalFaturamento) * 100,
      });
    }

    let anguloAcumulado = -90; // Começar no topo (12 horas)
    const fatiasCalc = dados.map((item, index) => {
      const anguloFatia = (item.total / totalFaturamento) * 360;
      const startAngle = anguloAcumulado;
      const endAngle = anguloAcumulado + anguloFatia;
      anguloAcumulado += anguloFatia;

      return {
        ...item,
        startAngle,
        endAngle,
        cor: CORES_PALETA[index % CORES_PALETA.length],
      };
    });

    return { fatias: fatiasCalc, dadosFiltrados: dados };
  }, [itens, totalFaturamento]);

  // Função auxiliar para converter polar em cartesiano
  function polarToCartesian(
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number,
  ) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  }

  // Gera path SVG de um arco donut
  function createDonutArc(
    x: number,
    y: number,
    innerRadius: number,
    outerRadius: number,
    startAngle: number,
    endAngle: number,
  ) {
    // Se a fatia for 360 graus inteiros
    if (endAngle - startAngle >= 359.99) {
      endAngle = startAngle + 359.99;
    }

    const startOuter = polarToCartesian(x, y, outerRadius, endAngle);
    const endOuter = polarToCartesian(x, y, outerRadius, startAngle);
    const startInner = polarToCartesian(x, y, innerRadius, startAngle);
    const endInner = polarToCartesian(x, y, innerRadius, endAngle);

    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      "M", startOuter.x, startOuter.y,
      "A", outerRadius, outerRadius, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
      "L", startInner.x, startInner.y,
      "A", innerRadius, innerRadius, 0, largeArcFlag, 1, endInner.x, endInner.y,
      "Z",
    ].join(" ");
  }

  const activeItem =
    hoveredIndex !== null && fatias[hoveredIndex]
      ? fatias[hoveredIndex]
      : null;

  return (
    <Card className="border-border/60 shadow-xs transition-all hover:shadow-md dark:border-border/40 flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-primary" />
            <CardTitle className="text-base font-bold text-foreground">
              {titulo}
            </CardTitle>
          </div>
          <Badge variant="secondary" className="text-[10px] font-semibold">
            Mix de Pagamento
          </Badge>
        </div>
        <CardDescription className="text-xs">{descricao}</CardDescription>
      </CardHeader>

      <CardContent>
        {fatias.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Sem dados de pagamento no período.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-12 sm:items-center">
            {/* Gráfico Donut Interativo (Bklit Style) */}
            <div className="relative flex items-center justify-center sm:col-span-6">
              <svg
                viewBox="0 0 200 200"
                className="size-48 sm:size-52 overflow-visible select-none transition-transform"
              >
                {fatias.map((fatia, index) => {
                  const isHovered = hoveredIndex === index;
                  const innerR = 52;
                  const outerR = isHovered ? 82 : 76;
                  const path = createDonutArc(
                    100,
                    100,
                    innerR,
                    outerR,
                    fatia.startAngle,
                    fatia.endAngle,
                  );

                  return (
                    <path
                      key={`${fatia.nome}-${index}`}
                      d={path}
                      fill={fatia.cor}
                      className="cursor-pointer transition-all duration-300 hover:opacity-95"
                      style={{
                        transformOrigin: "100px 100px",
                        filter: isHovered
                          ? "drop-shadow(0 4px 12px rgba(0,0,0,0.25))"
                          : "none",
                      }}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  );
                })}
              </svg>

              {/* Informação Central no Donut */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate max-w-[110px]">
                  {activeItem ? activeItem.nome : "Total Declarado"}
                </span>
                <span className="font-mono text-xs sm:text-sm font-extrabold text-foreground truncate max-w-[120px]">
                  {activeItem
                    ? formatarMoeda(activeItem.total)
                    : formatarMoeda(totalFaturamento)}
                </span>
                <span className="font-mono text-[10px] font-bold text-primary">
                  {activeItem
                    ? formatarPercentual(activeItem.percentual, 1)
                    : "100%"}
                </span>
              </div>
            </div>

            {/* Legenda Lateral Interativa com Links */}
            <div className="flex flex-col gap-2 sm:col-span-6">
              {fatias.map((item, index) => {
                const isHovered = hoveredIndex === index;
                const href =
                  item.nome !== "Outros" && empresaId
                    ? `/vendas?empresa=${empresaId}&${drilldownParam}=${encodeURIComponent(item.nome)}`
                    : undefined;

                const content = (
                  <div
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={`flex items-center justify-between rounded-lg p-2 text-xs transition-all cursor-pointer ${
                      isHovered
                        ? "bg-muted shadow-xs translate-x-1"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.cor }}
                      />
                      <span
                        className="truncate font-semibold text-foreground"
                        title={item.nome}
                      >
                        {item.nome}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                      <span className="font-bold text-foreground">
                        {formatarMoeda(item.total)}
                      </span>
                      <span className="text-muted-foreground text-[10.5px]">
                        ({formatarPercentual(item.percentual, 1)})
                      </span>
                    </div>
                  </div>
                );

                return href ? (
                  <Link key={item.nome} href={href}>
                    {content}
                  </Link>
                ) : (
                  <div key={item.nome}>{content}</div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
