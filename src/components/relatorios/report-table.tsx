"use client";

import { isValidElement, useMemo, useState, type ReactNode } from "react";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/table-pagination";
import { cn } from "@/lib/utils";
import { ExportarVisao } from "./exportar-visao";
import { useReportContext } from "./report-context";
import { ReportToolbar } from "./report-toolbar";
import { formatarMoeda, formatarPercentual } from "@/lib/formatters";
import { formatarDataInputParaBR } from "@/lib/vendas";

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
}) {
  const report = useReportContext();
  const [sort, setSort] = useState<{ id: string; descending: boolean } | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
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
          ? "sticky left-0 z-20 bg-background shadow-sm"
          : "sticky left-0 z-10 bg-background shadow-sm"),
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {showExport && report && columns.every((column) => column.value) ? (
        <ReportToolbar>
          <ExportarVisao
            titulo={`${report.titulo} - ${caption ?? headerText(columns[0]?.header)}`}
            contexto={report.contexto}
            colunas={columns.map((column) => headerText(column.header))}
            observacoes={exportObservacoes}
            linhas={sorted.map((row) =>
              columns.map((column) => {
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
          />
        </ReportToolbar>
      ) : null}
      <ReportTableFrame label={caption ?? `Tabela de ${label}`}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <TableHeader className="bg-background">
          <TableRow>
            {columns.map((column, index) => (
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
            rows.map((row, rowIndex) => (
              <TableRow key={rowKey(row, rowIndex)}>
                {columns.map((column, index) => (
                  <TableCell key={column.id} className={classes(column, index)}>
                    {column.cell(row, rowIndex)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="p-8 text-center text-muted-foreground"
              >
                Nenhum registro neste recorte.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </ReportTableFrame>
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
