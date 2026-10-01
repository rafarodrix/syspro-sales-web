import { useState } from "react";
import { formatarMoeda, formatarPercentual } from "@/lib/formatters";

export interface ReportChartPoint {
  label: string;
  value: number;
  percentual?: number;
}

/** Exact linear segments: smoothing could suggest values that never occurred. */
export function ReportChart({
  points,
  temporal = false,
}: {
  points: ReportChartPoint[];
  temporal?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  if (!points.length) return null;
  const max = Math.max(1, ...points.map((point) => point.value));
  const min = Math.min(0, ...points.map((point) => point.value));
  const y = (value: number) => 210 - ((value - min) / (max - min)) * 180;
  const x = (index: number) =>
    110 + (index / Math.max(points.length - 1, 1)) * 760;
  const active =
    points[selected ?? points.length - 1] ?? points[points.length - 1];
  return (
    <figure
      className="min-w-0 rounded-md border p-4"
      aria-label="Gráfico de faturamento"
    >
      <figcaption className="mb-3 flex flex-wrap justify-between gap-2 text-xs">
        <strong>Faturamento</strong>
        <span aria-live="polite">
          {active.label}: {formatarMoeda(active.value)}
        </span>
      </figcaption>
      {temporal ? (
        <>
          <svg
            viewBox="0 0 900 245"
            className="h-64 w-full"
            role="group"
            aria-label="Evolução do faturamento; detalhes na tabela abaixo"
          >
            {[min, (min + max) / 2, max].map((value) => (
              <g key={value}>
                <line
                  x1="105"
                  x2="880"
                  y1={y(value)}
                  y2={y(value)}
                  stroke="currentColor"
                  className="text-border"
                />
                <text
                  x="98"
                  y={y(value) + 4}
                  textAnchor="end"
                  fill="currentColor"
                  className="text-muted-foreground"
                  fontSize="11"
                >
                  {formatarMoeda(value)}
                </text>
              </g>
            ))}
            <polyline
              points={points
                .map((point, index) => `${x(index)},${y(point.value)}`)
                .join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary"
            />
            {points.map((point, index) => (
              <circle
                key={`${point.label}-${index}`}
                cx={x(index)}
                cy={y(point.value)}
                r={selected === index ? 5 : 3}
                fill="currentColor"
                className="text-primary focus:outline-primary"
                tabIndex={0}
                role="button"
                aria-label={`${point.label}: ${formatarMoeda(point.value)}`}
                onFocus={() => setSelected(index)}
                onMouseEnter={() => setSelected(index)}
                onClick={() => setSelected(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelected(index);
                  }
                }}
              >
                <title>
                  {point.label}: {formatarMoeda(point.value)}
                </title>
              </circle>
            ))}
            {points
              .filter(
                (_, i) =>
                  i % Math.max(1, Math.ceil(points.length / 6)) === 0 ||
                  i === points.length - 1,
              )
              .map((point) => (
                <text
                  key={point.label}
                  x={x(points.indexOf(point))}
                  y="238"
                  textAnchor="middle"
                  fontSize="11"
                  fill="currentColor"
                  className="text-muted-foreground"
                >
                  {point.label}
                </text>
              ))}
          </svg>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          {points.map((point, index) => (
            <button
              type="button"
              key={point.label}
              onClick={() => setSelected(index)}
              onFocus={() => setSelected(index)}
              onMouseEnter={() => setSelected(index)}
              className="grid grid-cols-[6rem_1fr] items-center gap-3 text-left text-xs sm:grid-cols-[8rem_1fr_10rem]"
              aria-label={`${point.label}: ${formatarMoeda(point.value)}`}
            >
              <span>{point.label}</span>
              <span className="h-6 overflow-hidden rounded bg-muted">
                <span
                  className="block h-full rounded bg-primary/60"
                  style={{
                    width: `${(Math.abs(point.value) / Math.max(max, Math.abs(min))) * 100}%`,
                  }}
                />
              </span>
              <span className="col-span-2 text-right tabular-nums sm:col-span-1">
                {formatarMoeda(point.value)}
                {point.percentual !== undefined
                  ? ` · ${formatarPercentual(point.percentual, 1)}`
                  : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}
