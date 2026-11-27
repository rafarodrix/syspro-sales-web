import { ResumoVendas } from "@/lib/vendas";
import type { Periodo } from "@/components/date-range-filter";
import type { VendaProduto } from "@/lib/syspro-api";
import {
  chaveConsulta,
  executarDeduplicado,
  gravarCache,
  invalidarCache,
  lerCache,
} from "@/lib/cache-consulta";

export interface RespostaVendasApi {
  vendas: VendaProduto[];
  resumo: ResumoVendas;
  cached?: boolean;
}

/** TTL do cache compartilhado entre telas (vendas, relatórios, fornecedores). */
const TTL_VENDAS_MS = 5 * 60_000;

export function chaveVendas(empresaId: string, periodo: Periodo): string {
  return chaveConsulta({
    recurso: "vendas",
    empresa: empresaId,
    inicial: periodo.inicial,
    final: periodo.final,
  });
}

async function requisitarVendas(
  empresaId: string,
  periodo: Periodo,
  opcoes?: { forcarAtualizacao?: boolean; signal?: AbortSignal }
): Promise<VendaProduto[]> {
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

/**
 * Consulta de vendas com cache compartilhado por empresa + período.
 *
 * Navegar entre telas (Vendas, Relatórios, Fornecedores) com o mesmo recorte
 * reaproveita o resultado em vez de bater no Syspro de novo. "Forçar
 * atualização" invalida só essa chave.
 */
export async function buscarVendasApi(
  empresaId: string,
  periodo: Periodo,
  opcoes?: { forcarAtualizacao?: boolean; signal?: AbortSignal }
): Promise<VendaProduto[]> {
  if (!empresaId || !periodo.inicial || !periodo.final) {
    throw new Error("Empresa e período são obrigatórios para a consulta.");
  }

  const chave = chaveVendas(empresaId, periodo);
  if (opcoes?.forcarAtualizacao) invalidarCache(chave);

  const emCache = lerCache<VendaProduto[]>(chave, TTL_VENDAS_MS);
  if (emCache) return emCache.dados;

  // Com sinal de cancelamento não entra no dedupe: um abort de uma tela não
  // pode derrubar a consulta de outra.
  if (opcoes?.signal) {
    const dados = await requisitarVendas(empresaId, periodo, opcoes);
    gravarCache(chave, dados);
    return dados;
  }

  return executarDeduplicado(chave, () => requisitarVendas(empresaId, periodo, opcoes));
}
