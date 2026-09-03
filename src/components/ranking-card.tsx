"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
  empresaId,
  drilldownParam,
}: {
  titulo: string;
  descricao: string;
  itens: ItemRankeado[];
  empresaId?: string;
  drilldownParam?: "departamento" | "vendedor" | "formaPagamento" | "cidade";
}) {
  const principais = itens.slice(0, 5);

  return (
    <Card className="border-border/60 shadow-xs transition-all hover:shadow-md dark:border-border/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-foreground">
            {titulo}
          </CardTitle>
          {drilldownParam && empresaId && (
            <span className="text-[11px] font-medium text-muted-foreground">
              Clique para filtrar
            </span>
          )}
        </div>
        <CardDescription className="text-xs">{descricao}</CardDescription>
      </CardHeader>
      <CardContent>
        {principais.length ? (
          <ol className="flex flex-col gap-3.5">
            {principais.map((item, index) => {
              const href =
                drilldownParam && empresaId
                  ? `/vendas?empresa=${empresaId}&${drilldownParam}=${encodeURIComponent(item.nome)}`
                  : undefined;

              const content = (
                <div className="flex flex-col gap-1.5 group/item">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[10px] font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      <span
                        className={`truncate font-semibold ${
                          href
                            ? "text-foreground group-hover/item:text-primary transition-colors"
                            : "text-foreground"
                        }`}
                        title={item.nome}
                      >
                        {item.nome}
                      </span>
                      {href && (
                        <ChevronRight className="size-3 text-muted-foreground/50 opacity-0 transition-opacity group-hover/item:opacity-100" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                      <span className="font-bold text-foreground">
                        {moeda.format(item.total)}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        ({item.percentual.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500 group-hover/item:brightness-110"
                      style={{ width: `${Math.min(item.percentual, 100)}%` }}
                    />
                  </div>
                </div>
              );

              return (
                <li key={item.nome}>
                  {href ? (
                    <Link href={href} className="block transition-transform active:scale-[0.99]">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
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
