import { ResumoVendas } from "@/lib/vendas";
import type { Periodo } from "@/components/date-range-filter";
import type { VendaProduto } from "@/lib/syspro-api";

export interface RespostaVendasApi {
  vendas: VendaProduto[];
  resumo: ResumoVendas;
  cached?: boolean;
}

export async function buscarVendasApi(
  empresaId: string,
  periodo: Periodo,
  opcoes?: { forcarAtualizacao?: boolean; signal?: AbortSignal }
): Promise<VendaProduto[]> {
  if (!empresaId || !periodo.inicial || !periodo.final) {
    throw new Error("Empresa e período são obrigatórios para a consulta.");
  }

  const res = await fetch("/api/vendas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      empresaId,
      dtInicial: periodo.inicial,
      dtFinal: periodo.final,
      forcarAtualizacao: opcoes?.forcarAtualizacao,
    }),
    signal: opcoes?.signal,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao consultar vendas no servidor.");
  }

  const json: RespostaVendasApi = await res.json();
  return json.vendas ?? [];
}
