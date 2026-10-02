import { toast } from "sonner";
import { ExportDropdown } from "@/components/export-dropdown";
import { exportarParaCSV } from "@/lib/exportar-csv";
import { exportarPdfAnalitico } from "@/lib/pdf-export";

export type ContextoExportacao = Parameters<
  typeof exportarPdfAnalitico
>[0]["contexto"];

interface Props {
  titulo: string;
  contexto: ContextoExportacao;
  colunas: string[];
  linhas: (string | number)[][];
  observacoes?: string;
}

/** Recebe a coleção filtrada completa, independentemente da página da tabela. */
export function ExportarVisao({
  titulo,
  contexto,
  colunas,
  linhas,
  observacoes,
}: Props) {
  async function pdf(modo: "download" | "imprimir") {
    try {
      await exportarPdfAnalitico({
        titulo,
        contexto,
        colunas,
        linhas,
        observacoes,
        modo,
        orientacao: colunas.length > 6 ? "landscape" : "portrait",
      });
    } catch {
      toast.error("Não foi possível gerar o PDF. Tente novamente.");
    }
  }
  return (
    <ExportDropdown
      label="Exportar esta visão"
      disabled={linhas.length === 0}
      onExportarCsv={() => {
        exportarParaCSV(
          `${titulo}-${contexto.periodo.inicial}-a-${contexto.periodo.final}`,
          [...colunas, "Empresa / escopo", "Período inicial", "Período final"],
          linhas.map((linha) => [
            ...linha,
            contexto.empresaNome,
            contexto.periodo.inicial,
            contexto.periodo.final,
          ]),
        );
        toast.success("CSV da visão filtrada gerado.");
      }}
      onExportarPdf={() => pdf("download")}
      onImprimir={() => pdf("imprimir")}
    />
  );
}
