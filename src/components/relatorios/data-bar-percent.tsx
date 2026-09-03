export function DataBarPercent({
  valor,
  percentual,
  cor = "bg-primary/15",
}: {
  valor: string;
  percentual: number;
  cor?: string;
}) {
  const largura = Math.min(Math.max(percentual, 0), 100);
  return (
    <div className="relative flex items-center justify-end overflow-hidden rounded px-2 py-0.5 font-mono text-xs">
      <div
        className={`absolute inset-y-0 right-0 ${cor} rounded-sm transition-all duration-300`}
        style={{ width: `${largura}%` }}
      />
      <span className="relative z-10 font-bold text-foreground tabular-nums">
        {valor}
      </span>
    </div>
  );
}
