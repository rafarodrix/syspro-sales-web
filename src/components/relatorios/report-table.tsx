"use client";

import { Fragment, isValidElement, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Columns3, Rows3 } from "lucide-react";
import {
  TableBody,
  TableFooter,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/table-pagination";
import { TableEmptyState } from "@/components/table-empty-state";
import { cn } from "@/lib/utils";
import { Drawer } from "@/components/ui/drawer";
import { ExportarVisao } from "./exportar-visao";
import { useReportContext } from "./report-context";
import { ReportToolbar } from "./report-toolbar";
import { useBarraRelatorio } from "./report-barra";
import { formatarMoeda, formatarPercentual } from "@/lib/formatters";
import { formatarDataInputParaBR } from "@/lib/vendas";
import { Button } from "@/components/ui/button";

function headerText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(headerText).join("");
  if (isValidElement<{ children?: ReactNode }>(node))
    return headerText(node.props.children);
  return "";
}

export function ReportTableFrame({
  children,
  label = "Tabela do relatório",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={label}
      className="overflow-x-auto rounded-md border focus-visible:outline-2 focus-visible:outline-primary print:overflow-visible"
    >
      <table className="w-full border-separate border-spacing-0 text-xs">
        {children}
      </table>
    </div>
  );
}

export interface ReportColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  value?: (row: T) => string | number | null | undefined;
  exportValue?: (row: T) => string | number;
  kind?: "name" | "number" | "currency" | "percent" | "date" | "month";
  className?: string;
}

/** Sorting uses source values, never formatted currency or rendered markup. */
export function ReportTable<T>({
  data,
  columns,
  rowKey,
  label = "registros",
  caption,
  stickyFirst = false,
  pagination = true,
  showExport = true,
  exportObservacoes,
  exportExtras,
  acoes,
  acoesExtras,
  resumo,
  renderDetalhe,
  modoDetalhe = "fechado",
  detalhePrimeiraColuna = false,
  detalheEm = "linha",
  tituloDetalhe,
  metaDetalhe,
}: {
  data: T[];
  columns: ReportColumn<T>[];
  rowKey: (row: T, index: number) => string;
  label?: string;
  caption?: string;
  stickyFirst?: boolean;
  pagination?: boolean;
  showExport?: boolean;
  exportObservacoes?: string;
  /** Saídas extras no mesmo dropdown de exportação da tabela. */
  exportExtras?: import("@/components/export-dropdown").ExportExtra[];
  /** Controles renderizados à esquerda da barra da tabela (ex.: seletor de visão). */
  acoes?: ReactNode;
  /** Ações extras à direita (ex.: exportação com formato próprio). */
  acoesExtras?: ReactNode;
  /**
   * Rodapé padrão da tabela: contagem do recorte e totais, sempre no mesmo
   * formato em todas as telas (Total · N registros · somas).
   */
  resumo?: (linhas: T[]) => { label: string; itens?: { rotulo: string; valor: string }[] };
  /** Conteúdo de detalhe exibido ao expandir a linha. */
  renderDetalhe?: (row: T) => ReactNode;
  /** Estado inicial de todas as linhas de detalhe (use junto de `key` para alternar). */
  modoDetalhe?: "aberto" | "fechado";
  /** Coloca o botão de detalhe na primeira coluna (sempre visível) em vez da última. */
  detalhePrimeiraColuna?: boolean;
  /** Onde o detalhe aparece: expandindo a linha (padrão) ou em drawer lateral. */
  detalheEm?: "linha" | "drawer";
  /** Título do drawer de detalhe. */
  tituloDetalhe?: (row: T) => React.ReactNode;
  /** Linha de contexto sob o título do drawer. */
  metaDetalhe?: (row: T) => React.ReactNode;
}) {
  const report = useReportContext();
  const barra = useBarraRelatorio();
  const [detalhesAbertos, setDetalhesAbertos] = useState<Record<string, boolean>>({});
  const [linhaDrawer, setLinhaDrawer] = useState<{ chave: string; row: T } | null>(null);
  const [sort, setSort] = useState<{ id: string; descending: boolean } | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [density, setDensity] = useState<"compacta" | "confortavel">("confortavel");
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>([]);
  const [chaveCarregada, setChaveCarregada] = useState<string | null>(null);
  const preferenceKey = report
    ? `syspro:report-table:v3:${report.preferenceScope}:${caption ?? label}`
    : null;
  const columnIdsKey = columns.map((column) => column.id).join("|");

  useEffect(() => {
    if (!preferenceKey) return;
    let ativo = true;
    queueMicrotask(() => {
      if (!ativo) return;
      try {
        const saved = JSON.parse(localStorage.getItem(preferenceKey) ?? "null") as {
          sort?: { id: string; descending: boolean } | null;
          size?: number;
          density?: "compacta" | "confortavel";
          /** Colunas que o usuário escondeu — novas colunas aparecem por padrão. */
          hiddenColumnIds?: string[];
        } | null;
        if (saved?.sort && columns.some((column) => column.id === saved.sort?.id)) setSort(saved.sort);
        if ([10, 25, 50, 100].includes(saved?.size ?? 0)) setSize(saved!.size!);
        if (saved?.density === "compacta" || saved?.density === "confortavel") setDensity(saved.density);
        const escondidas = saved?.hiddenColumnIds?.filter((id) =>
          columns.some((column) => column.id === id),
        );
        setVisibleColumnIds(columns.filter((column) => !escondidas?.includes(column.id)).map((column) => column.id));
      } catch {
        setVisibleColumnIds(columns.map((column) => column.id));
      } finally {
        // Só libera a gravação depois de ler a preferência DESTA tabela; senão o
        // efeito de salvar grava a visibilidade antiga (de outra visão) e esconde
        // colunas que a tabela nova acabou de ganhar.
        setChaveCarregada(preferenceKey);
      }
    });
    return () => { ativo = false; };
  // A identidade das colunas, e não o array recriado pelo React, controla a leitura.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferenceKey, columnIdsKey]);

  useEffect(() => {
    if (!preferenceKey || chaveCarregada !== preferenceKey) return;
    localStorage.setItem(
      preferenceKey,
      JSON.stringify({
        sort,
        size,
        density,
        hiddenColumnIds: columns
          .filter((column) => !visibleColumnIds.includes(column.id))
          .map((column) => column.id),
      }),
    );
  }, [chaveCarregada, density, preferenceKey, size, sort, visibleColumnIds]);

  const visibleColumns = visibleColumnIds.length
    ? columns.filter((column) => visibleColumnIds.includes(column.id))
    : columns;
  const sorted = useMemo(() => {
    const value = columns.find((column) => column.id === sort?.id)?.value;
    if (!value || !sort) return data;
    return [...data].sort((a, b) => {
      const av = value(a),
        bv = value(b);
      if (av == null) return bv == null ? 0 : 1;
      if (bv == null) return -1;
      const result =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), "pt-BR", { numeric: true });
      return sort.descending ? -result : result;
    });
  }, [data, columns, sort]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(data.length / size)));
  const rows = pagination
    ? sorted.slice((safePage - 1) * size, safePage * size)
    : sorted;
  function classes(
    column: ReportColumn<T>,
    index: number,
    header = false,
  ) {
    return cn(
      "px-3 py-2 tabular-nums",
      column.kind === "name"
        ? "min-w-56 max-w-72 whitespace-normal text-left"
        : column.kind === "month"
          ? "min-w-14 text-center"
          : column.kind === "currency"
            ? "min-w-36 text-right whitespace-nowrap"
            : column.kind === "percent"
              ? "min-w-28 text-right whitespace-nowrap"
              : column.kind === "date"
              ? "min-w-28 whitespace-nowrap"
              : "min-w-24 text-right",
      column.className,
      stickyFirst &&
        index === 0 &&
        (header
          ? `sticky ${detalhePrimeiraColuna ? "left-8" : "left-0"} z-20 bg-background shadow-sm`
          : `sticky ${detalhePrimeiraColuna ? "left-8" : "left-0"} z-10 bg-background shadow-sm`),
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {(() => { const conteudo = (
        <ReportToolbar acoes={acoes}>
          {showExport && report && visibleColumns.every((column) => column.value) ? <ExportarVisao
              extras={exportExtras}
            titulo={`${report.titulo} - ${caption ?? headerText(columns[0]?.header)}`}
            rotulo="Exportar"
            contexto={report.contexto}
            colunas={visibleColumns.map((column) => headerText(column.header))}
            observacoes={exportObservacoes}
            linhas={sorted.map((row) =>
              visibleColumns.map((column) => {
                if (column.exportValue) return column.exportValue(row);
                const value = column.value!(row);
                return value == null
                  ? "—"
                  : column.kind === "currency" && typeof value === "number"
                    ? formatarMoeda(value)
                    : column.kind === "percent" && typeof value === "number"
                      ? formatarPercentual(value, 2)
                      : column.kind === "date" &&
                          typeof value === "string" &&
                          /^\d{4}-\d{2}-\d{2}$/.test(value)
                        ? formatarDataInputParaBR(value)
                        : value;
              }),
            )}
          /> : null}
          {report ? <>
            <details className="relative">
              <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-border/60 px-3 text-xs font-medium hover:bg-muted">
                <Columns3 className="size-3.5" /> <span className="hidden lg:inline">Colunas</span>
              </summary>
              <div className="absolute right-0 z-30 mt-1 min-w-56 space-y-1 rounded-md border bg-popover p-2 shadow-md">
                {columns.map((column) => {
                  const checked = visibleColumns.some((item) => item.id === column.id);
                  return <label key={column.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setVisibleColumnIds((current) => {
                        const base = current.length ? current : columns.map((item) => item.id);
                        if (base.includes(column.id)) return base.length === 1 ? base : base.filter((id) => id !== column.id);
                        return [...base, column.id];
                      })}
                    />
                    {headerText(column.header)}
                  </label>;
                })}
              </div>
            </details>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => setDensity((atual) => atual === "compacta" ? "confortavel" : "compacta")}
              title="Alternar densidade da tabela"
            >
              <Rows3 className="size-3.5" /> <span className="hidden xl:inline">{density === "compacta" ? "Compacta" : "Confortável"}</span>
            </Button>
          </> : null}
          {acoesExtras}
        </ReportToolbar>
        ); return barra?.slot ? createPortal(conteudo, barra.slot) : conteudo; })()}
      <ReportTableFrame label={caption ?? `Tabela de ${label}`}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <TableHeader className="bg-[var(--superficie-baixa)]">
          <TableRow>
            {renderDetalhe && detalhePrimeiraColuna ? (
              <TableHead
                scope="col"
                className={cn("w-8 px-1", stickyFirst && "sticky left-0 z-20 bg-background")}
                aria-label="Detalhe"
              />
            ) : null}
            {visibleColumns.map((column, index) => (
              <TableHead
                key={column.id}
                scope="col"
                className={classes(column, index, true)}
                aria-sort={
                  sort?.id === column.id
                    ? sort.descending
                      ? "descending"
                      : "ascending"
                    : column.value
                      ? "none"
                      : undefined
                }
              >
                {column.value ? (
                  <button
                    type="button"
                    className="w-full cursor-pointer text-inherit [text-align:inherit] focus-visible:outline-2 focus-visible:outline-primary"
                    onClick={() => {
                      setSort({
                        id: column.id,
                        descending:
                          sort?.id === column.id ? !sort.descending : false,
                      });
                      setPage(1);
                    }}
                  >
                    {column.header}
                    <span
                      aria-hidden="true"
                      className="ml-1 text-muted-foreground"
                    >
                      {sort?.id === column.id
                        ? sort.descending
                          ? "↓"
                          : "↑"
                        : "↕"}
                    </span>
                  </button>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row, rowIndex) => {
              const chave = rowKey(row, rowIndex);
              const aberta = detalhesAbertos[chave] ?? (modoDetalhe === "aberto");
              const emDrawer = detalheEm === "drawer";
              const abrir = () => (emDrawer ? setLinhaDrawer({ chave, row }) : setDetalhesAbertos((atual) => ({ ...atual, [chave]: !atual[chave] })));
              return (
              <Fragment key={chave}>
              <TableRow
                className={emDrawer && renderDetalhe ? "cursor-pointer transition-colors duration-150" : undefined}
                onClick={emDrawer && renderDetalhe ? abrir : undefined}
                tabIndex={emDrawer && renderDetalhe ? 0 : undefined}
                onKeyDown={
                  emDrawer && renderDetalhe
                    ? (evento) => {
                        if (evento.key === "Enter" || evento.key === " ") {
                          evento.preventDefault();
                          abrir();
                        }
                      }
                    : undefined
                }
              >
                {renderDetalhe && detalhePrimeiraColuna ? (
                  <TableCell className={cn("w-8 px-1", stickyFirst && "sticky left-0 z-10 bg-background")}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      aria-expanded={emDrawer ? undefined : aberta}
                      title={emDrawer ? "Abrir detalhe" : aberta ? "Recolher itens" : "Ver itens"}
                      onClick={(evento) => {
                        evento.stopPropagation();
                        abrir();
                      }}
                    >
                      <ChevronDown className={cn("size-3.5 transition-transform", aberta && "rotate-180")} />
                    </Button>
                  </TableCell>
                ) : null}
                {visibleColumns.map((column, index) => (
                  <TableCell key={column.id} className={cn(classes(column, index), density === "compacta" && "py-1")}>
                    {column.cell(row, rowIndex)}
                  </TableCell>
                ))}
                {renderDetalhe && !detalhePrimeiraColuna ? (
                  <TableCell className="w-8 px-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      aria-expanded={emDrawer ? undefined : aberta}
                      title={emDrawer ? "Abrir detalhe" : aberta ? "Recolher detalhe" : "Expandir detalhe"}
                      onClick={(evento) => {
                        evento.stopPropagation();
                        abrir();
                      }}
                    >
                      <ChevronDown className={cn("size-3.5 transition-transform", aberta && "rotate-180")} />
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
              {renderDetalhe && !emDrawer && aberta ? (
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableCell colSpan={visibleColumns.length + 1} className="p-0">
                    {renderDetalhe(row)}
                  </TableCell>
                </TableRow>
              ) : null}
              </Fragment>
              );
            })
          ) : <TableEmptyState
            colSpan={visibleColumns.length + (renderDetalhe ? 1 : 0)}
            title="Nenhum registro neste recorte"
            description="Ajuste a busca ou os filtros aplicados nesta visão."
          />}
        </TableBody>
      </ReportTableFrame>
      {data.length > 0 && resumo ? (
        (() => {
          const r = resumo(sorted);
          return (
            <div className="no-print flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 bg-[var(--superficie-baixa)] px-3 py-2 text-[11px]">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Total
              </span>
              <span className="num font-semibold text-foreground">
                {r.label}
              </span>
              {(r.itens ?? []).map((item) => (
                <span key={item.rotulo} className="flex items-baseline gap-1">
                  <span className="text-muted-foreground">{item.rotulo}</span>
                  <strong className="num font-semibold text-foreground">{item.valor}</strong>
                </span>
              ))}
            </div>
          );
        })()
      ) : null}
      {renderDetalhe && detalheEm === "drawer" ? (
        <Drawer
          aberto={Boolean(linhaDrawer)}
          onOpenChange={(aberto) => {
            if (!aberto) setLinhaDrawer(null);
          }}
          titulo={linhaDrawer ? (tituloDetalhe?.(linhaDrawer.row) ?? "Detalhe") : "Detalhe"}
          meta={linhaDrawer ? metaDetalhe?.(linhaDrawer.row) : null}
        >
          <div className="p-3">{linhaDrawer ? renderDetalhe(linhaDrawer.row) : null}</div>
        </Drawer>
      ) : null}
      {pagination ? (
        <TablePagination
          paginaAtual={safePage}
          totalItens={data.length}
          itensPorPagina={size}
          onPaginaChange={setPage}
          onItensPorPaginaChange={(value) => {
            setSize(value);
            setPage(1);
          }}
          labelItens={label}
        />
      ) : null}
    </div>
  );
}
