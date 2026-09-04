import { useMemo, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarMoeda, formatarNumero } from "@/lib/formatters";
import { exportarParaCSV } from "@/lib/exportar-csv";
import { TablePagination } from "@/components/table-pagination";
import { toast } from "sonner";
import { SeletorMultiplo } from "./seletor-multiplo";
import type { VendaAgrupada } from "@/lib/vendas";
import { paraNumero } from "@/lib/vendas";

type DimensaoNota = "vendedor" | "cliente" | "cidade";

interface VisaoAnaliticaNotasProps {
  /** Notas do período agrupadas por NF. */
  notas: VendaAgrupada[];
  /** Campo da nota usado como dimensão de filtro (ex.: vendedor). */
  dimensaoChave: DimensaoNota;
  /** Rótulo da dimensão para a interface. */
  dimensaoRotulo: string;
  /** Valores selecionados (array vazio = todos). Controlado pela aba. */
  selecionados: string[];
  onSelecionadosChange: (selecionados: string[]) => void;
  /** Se a dimensão tem coluna própria fixa na grade (cliente) — evita nome duplicado. */
  dimensaoTemColunaPropria?: boolean;
  /** Nome do arquivo CSV gerado. */
  nomeCsvBase?: string;
  onVoltar: () => void;
}

interface ValoresNota {
  bruto: number;
  desconto: number;
  liquido: number;
}

function valoresDaNota(nota: VendaAgrupada): ValoresNota {
  let bruto = 0;
  let desconto = 0;
  for (const item of nota.itens) {
    bruto += paraNumero(item.produto_vlr_total_item);
    desconto += paraNumero(item.produto_vlr_desconto);
  }
  return { bruto, desconto, liquido: nota.total };
}

/**
 * Visão analítica: os mesmos dados do ranking, porém no nível da nota/NF,
 * com filtro múltiplo por uma dimensão (vendedor, cliente, cidade...) e
 * os valores bruto, desconto e líquido de cada documento.
 */
export function VisaoAnaliticaNotas({
  notas,
  dimensaoChave,
  dimensaoRotulo,
  selecionados,
  onSelecionadosChange,
  dimensaoTemColunaPropria = false,
  nomeCsvBase = "notas-analitico",
  onVoltar,
}: VisaoAnaliticaNotasProps) {
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
    if (selecionados.length === 0) return notas;
    const conjunto = new Set(selecionados);
    return notas.filter((nota) => conjunto.has(String(nota[dimensaoChave]).trim()));
  }, [notas, selecionados, dimensaoChave]);

  const totais = useMemo(() => {
    let bruto = 0;
    let liquido = 0;
    let desconto = 0;
    for (const nota of notasFiltradas) {
      const valores = valoresDaNota(nota);
      bruto += valores.bruto;
      desconto += valores.desconto;
      liquido += valores.liquido;
    }
    return { bruto, desconto, liquido };
  }, [notasFiltradas]);

  const totalPaginas = Math.max(1, Math.ceil(notasFiltradas.length / itensPorPagina));
  const paginaAtualSegura = Math.min(paginaAtual, totalPaginas);
  const notasPaginadas = notasFiltradas.slice(
    (paginaAtualSegura - 1) * itensPorPagina,
    paginaAtualSegura * itensPorPagina,
  );

  function exportarCsv() {
    const colunas = [
      "NF",
      "Emissão",
      dimensaoRotulo,
      "Cliente",
      "Cidade",
      "Qtd Itens",
      "Valor Bruto",
      "Desconto",
      "Valor Líquido",
    ];
    const linhas = notasFiltradas.map((nota) => {
      const valores = valoresDaNota(nota);
      return [
        nota.numero,
        nota.emissao,
        String(nota[dimensaoChave]),
        nota.cliente,
        nota.cidade,
        formatarNumero(nota.quantidadeItens, 2),
        formatarMoeda(valores.bruto),
        formatarMoeda(valores.desconto),
        formatarMoeda(valores.liquido),
      ];
    });
    const sufixo = selecionados.length === 0 || selecionados.length > 3 ? "selecionados" : selecionados.join("-");
    exportarParaCSV(`${nomeCsvBase}-${sufixo}-${new Date().toISOString().slice(0, 10)}`, colunas, linhas);
    toast.success("CSV analítico gerado com sucesso!");
  }

  const exibirColunaDimensao = !dimensaoTemColunaPropria && selecionados.length !== 1;
  const colSpan = 8 + (exibirColunaDimensao ? 1 : 0);

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

          <SeletorMultiplo
            valores={valoresDisponiveis}
            selecionados={selecionados}
            onChange={(proximos) => {
              onSelecionadosChange(proximos);
              setPaginaAtual(1);
            }}
            rotulo={dimensaoRotulo}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5 px-2.5 py-1 font-mono text-[11px]">
            <span className="text-muted-foreground">Bruto</span> {formatarMoeda(totais.bruto)}
            <span className="text-rose-500">· Desc. {formatarMoeda(totais.desconto)}</span>
            <span className="font-bold text-foreground">· Líq. {formatarMoeda(totais.liquido)}</span>
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
        <table className="w-full min-w-[820px] text-xs">
          <thead>
            <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
              <th className="p-3">NF</th>
              <th className="p-3">Emissão</th>
              {exibirColunaDimensao && <th className="p-3">{dimensaoRotulo}</th>}
              <th className="p-3">Cliente</th>
              <th className="p-3">Cidade</th>
              <th className="p-3 text-right">Qtd Itens</th>
              <th className="p-3 text-right">Valor Bruto</th>
              <th className="p-3 text-right">Desconto</th>
              <th className="p-3 text-right">Valor Líquido</th>
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
              notasPaginadas.map((nota) => {
                const valores = valoresDaNota(nota);
                return (
                  <tr key={nota.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 font-mono font-semibold text-foreground">{nota.numero}</td>
                    <td className="whitespace-nowrap p-3 text-muted-foreground">{nota.emissao}</td>
                    {exibirColunaDimensao && (
                      <td className="p-3 font-medium">{String(nota[dimensaoChave])}</td>
                    )}
                    <td className="max-w-52 truncate p-3 font-medium" title={nota.cliente}>
                      {nota.cliente}
                    </td>
                    <td className="p-3 text-muted-foreground">{nota.cidade || "—"}</td>
                    <td className="p-3 text-right font-mono">{formatarNumero(nota.quantidadeItens, 2)}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{formatarMoeda(valores.bruto)}</td>
                    <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400">
                      {formatarMoeda(valores.desconto)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold">{formatarMoeda(valores.liquido)}</td>
                  </tr>
                );
              })
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
