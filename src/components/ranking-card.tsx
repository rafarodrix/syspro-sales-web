"use client";

import Link from "next/link";
import { ChevronRight, Layers, Users, MapPin, Tag } from "lucide-react";
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

function extrairIniciais(nome: string): string {
  if (!nome) return "??";
  const partes = nome.trim().split(" ").filter(Boolean);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

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
  const isVendedor = drilldownParam === "vendedor";
  const isDepto = drilldownParam === "departamento";

  return (
    <Card className="border-border/60 shadow-xs transition-all hover:shadow-md dark:border-border/40 flex flex-col justify-between h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isVendedor ? (
              <Users className="size-4 text-violet-500" />
            ) : isDepto ? (
              <Layers className="size-4 text-blue-500" />
            ) : (
              <Tag className="size-4 text-primary" />
            )}
            <CardTitle className="text-base font-bold text-foreground">
              {titulo}
            </CardTitle>
          </div>
          {drilldownParam && empresaId && (
            <Badge variant="secondary" className="text-[10px] font-semibold">
              Top 5
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">{descricao}</CardDescription>
      </CardHeader>
      <CardContent>
        {principais.length ? (
          <ol className="flex flex-col gap-3">
            {principais.map((item, index) => {
              const href =
                drilldownParam && empresaId
                  ? `/vendas?empresa=${empresaId}&${drilldownParam}=${encodeURIComponent(item.nome)}`
                  : undefined;

              const content = (
                <div className="flex flex-col gap-1.5 p-1.5 rounded-lg transition-all hover:bg-muted/40 group/item">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {isVendedor ? (
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-500 border border-violet-500/30 font-mono text-[10px] font-bold">
                          {extrairIniciais(item.nome)}
                        </span>
                      ) : (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[10px] font-bold text-muted-foreground">
                          {index + 1}
                        </span>
                      )}
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
                      <span className="font-extrabold text-foreground">
                        {formatarMoeda(item.total)}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        ({formatarPercentual(item.percentual, 1)})
                      </span>
                    </div>
                  </div>

                  {/* Barra Progressiva Bklit UI */}
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className={`h-full rounded-full transition-all duration-500 group-hover/item:brightness-115 ${
                        isVendedor
                          ? "bg-gradient-to-r from-violet-500 to-indigo-500"
                          : isDepto
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500"
                          : "bg-primary"
                      }`}
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
