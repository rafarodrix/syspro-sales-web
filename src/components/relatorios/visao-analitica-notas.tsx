import { useMemo, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarMoeda, formatarNumero } from "@/lib/formatters";
import { exportarParaCSV } from "@/lib/exportar-csv";
import { TablePagination } from "@/components/table-pagination";
import { toast } from "sonner";
import type { VendaAgrupada } from "@/lib/vendas";

type DimensaoNota = "vendedor" | "cliente" | "cidade";

interface VisaoAnaliticaNotasProps {
  /** Notas do período agrupadas por NF. */
  notas: VendaAgrupada[];
  /** Campo da nota usado como dimensão de filtro (ex.: vendedor). */
  dimensaoChave: DimensaoNota;
  /** Rótulo da dimensão para a interface. */
  dimensaoRotulo: string;
  /** Valor pré-selecionado (drill-down vindo do ranking). */
  dimensaoInicial?: string;
  /** Nome do arquivo CSV gerado. */
  nomeCsvBase?: string;
  onVoltar: () => void;
}

/**
 * Visão analítica: os mesmos dados do ranking, porém no nível da nota/NF,
 * filtráveis por uma dimensão (vendedor, cliente, cidade...).
 */
export function VisaoAnaliticaNotas({
  notas,
  dimensaoChave,
  dimensaoRotulo,
  dimensaoInicial = "todos",
  nomeCsvBase = "notas-analitico",
  onVoltar,
}: VisaoAnaliticaNotasProps) {
  const [valorSelecionado, setValorSelecionado] = useState<string>(dimensaoInicial);
  const [buscaNota, setBuscaNota] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);

  const valoresDisponiveis = useMemo(
    () =>
      Array.from(new Set(notas.map((nota) => String(nota[dimensaoChave]).trim()).filter(Boolean))).sort(
        new Intl.Collator("pt-BR").compare,
      ),
    [notas, dimensaoChave],
  );

  const notasFiltradas = useMemo(() => {
    const termo = buscaNota.trim().toLowerCase();
    return notas.filter((nota) => {
      const valor = String(nota[dimensaoChave]).trim();
      if (valorSelecionado !== "todos" && valor !== valorSelecionado) return false;
      if (!termo) return true;
      return (
        nota.numero.toLowerCase().includes(termo) ||
        nota.cliente.toLowerCase().includes(termo) ||
        nota.cidade?.toLowerCase().includes(termo)
      );
    });
  }, [notas, valorSelecionado, buscaNota, dimensaoChave]);

  const totalFiltrado = useMemo(
    () => notasFiltradas.reduce((soma, nota) => soma + nota.total, 0),
    [notasFiltradas],
  );

  const totalPaginas = Math.max(1, Math.ceil(notasFiltradas.length / itensPorPagina));
  const paginaAtualSegura = Math.min(paginaAtual, totalPaginas);
  const notasPaginadas = notasFiltradas.slice(
    (paginaAtualSegura - 1) * itensPorPagina,
    paginaAtualSegura * itensPorPagina,
  );

  function exportarCsv() {
    const colunas = ["NF", "Emissão", dimensaoRotulo, "Cliente", "Cidade", "Qtd Itens", "Total"];
    const linhas = notasFiltradas.map((nota) => [
      nota.numero,
      nota.emissao,
      String(nota[dimensaoChave]),
      nota.cliente,
      nota.cidade,
      formatarNumero(nota.quantidadeItens, 2),
      formatarMoeda(nota.total),
    ]);
    exportarParaCSV(
      `${nomeCsvBase}-${valorSelecionado === "todos" ? "todos" : valorSelecionado}-${new Date().toISOString().slice(0, 10)}`,
      colunas,
      linhas,
    );
    toast.success("CSV analítico gerado com sucesso!");
  }

  const colSpan = valorSelecionado === "todos" ? 7 : 6;

  return (
    <div className="space-y-4">
      {/* Cabeçalho da visão analítica */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 p-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs font-semibold"
            onClick={onVoltar}
          >
            <ArrowLeft className="size-3.5" />
            Voltar ao sintético
          </Button>

          <select
            value={valorSelecionado}
            onChange={(evento) => {
              setValorSelecionado(evento.target.value);
              setPaginaAtual(1);
              setBuscaNota("");
            }}
            className="h-8 max-w-56 rounded-md border bg-background px-2 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-primary"
            aria-label={`Filtrar por ${dimensaoRotulo}`}
          >
            <option value="todos">Todos os {dimensaoRotulo.toLowerCase()}s</option>
            {valoresDisponiveis.map((valor) => (
              <option key={valor} value={valor}>{valor}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[11px]">
            {formatarNumero(notasFiltradas.length, 0)} notas · {formatarMoeda(totalFiltrado)}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs font-semibold"
            onClick={exportarCsv}
            disabled={notasFiltradas.length === 0}
          >
            <Download className="size-3.5" />
            CSV
          </Button>
        </div>
      </div>

      {/* Grade analítica: uma linha por nota */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[680px] text-xs">
          <thead>
            <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
              <th className="p-3">NF</th>
              <th className="p-3">Emissão</th>
              {valorSelecionado === "todos" && <th className="p-3">{dimensaoRotulo}</th>}
              <th className="p-3">Cliente</th>
              <th className="p-3">Cidade</th>
              <th className="p-3 text-right">Qtd Itens</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {notasPaginadas.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="p-6 text-center text-muted-foreground">
                  Nenhuma nota encontrada para o filtro atual.
                </td>
              </tr>
            ) : (
              notasPaginadas.map((nota) => (
                <tr key={nota.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-3 font-mono font-semibold text-foreground">{nota.numero}</td>
                  <td className="whitespace-nowrap p-3 text-muted-foreground">{nota.emissao}</td>
                  {valorSelecionado === "todos" && (
                    <td className="p-3 font-medium">{String(nota[dimensaoChave])}</td>
                  )}
                  <td className="max-w-52 truncate p-3 font-medium" title={nota.cliente}>{nota.cliente}</td>
                  <td className="p-3 text-muted-foreground">{nota.cidade || "—"}</td>
                  <td className="p-3 text-right font-mono">{formatarNumero(nota.quantidadeItens, 2)}</td>
                  <td className="p-3 text-right font-mono font-bold">{formatarMoeda(nota.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        paginaAtual={paginaAtualSegura}
        totalItens={notasFiltradas.length}
        itensPorPagina={itensPorPagina}
        onPaginaChange={setPaginaAtual}
        onItensPorPaginaChange={(valor) => {
          setItensPorPagina(valor);
          setPaginaAtual(1);
        }}
        labelItens="notas"
      />
    </div>
  );
}
