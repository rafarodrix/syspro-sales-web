import { obterRelatorioCompras } from "@/lib/compras-service";
import { montarAnaliseMargens } from "@/lib/analise-margens";
import type { EmpresaInfo } from "@/lib/sales-service";

export async function obterAnaliseMargens({
  actorId,
  empresas,
  dtInicial,
  dtFinal,
  forcarAtualizacao = false,
  signal,
}: {
  actorId: string;
  empresas: EmpresaInfo[];
  dtInicial: string;
  dtFinal: string;
  forcarAtualizacao?: boolean;
  signal?: AbortSignal;
}) {
  // Poucas empresas são esperadas por instalação. O paralelismo evita uma
  // cascata entre filiais; cada consulta interna já divide períodos grandes.
  const resultados = await Promise.all(
    empresas.map(async (empresa) => ({
      empresaId: empresa.id,
      empresaNome: empresa.razaoSocial,
      relatorio: await obterRelatorioCompras({
        actorId,
        empresa,
        dtInicial,
        dtFinal,
        forcarAtualizacao,
        consultarSaldoAtual: false,
        signal,
      }),
    })),
  );
  return montarAnaliseMargens(resultados);
}
