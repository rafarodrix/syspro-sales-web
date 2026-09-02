"use client";

import type { ItemRankeado } from "@/lib/vendas";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function RankingCard({
  titulo,
  descricao,
  itens,
}: {
  titulo: string;
  descricao: string;
  itens: ItemRankeado[];
}) {
  const principais = itens.slice(0, 5);

  return (
    <Card className="border-border/60 shadow-xs transition-all hover:shadow-md dark:border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold">{titulo}</CardTitle>
        <CardDescription className="text-xs">{descricao}</CardDescription>
      </CardHeader>
      <CardContent>
        {principais.length ? (
          <ol className="flex flex-col gap-3.5">
            {principais.map((item, index) => (
              <li key={item.nome} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[10px] font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <span
                      className="truncate font-semibold text-foreground"
                      title={item.nome}
                    >
                      {item.nome}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                    <span className="font-semibold text-foreground">
                      {moeda.format(item.total)}
                    </span>
                    <span className="text-muted-foreground">
                      ({item.percentual.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500 hover:bg-blue-500"
                    style={{ width: `${Math.min(item.percentual, 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Sem dados para o período.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
