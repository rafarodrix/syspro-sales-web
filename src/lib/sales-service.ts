import { consultarVendas, type VendaComEmpresa } from "@/lib/syspro-api";
import { dataInputParaSyspro } from "@/lib/vendas";

export interface EmpresaInfo {
  id: string;
  cnpj: string;
  razaoSocial: string;
  empresaCodigo: string;
  sysproBaseUrl?: string | null;
  sysproUseIis?: boolean | string | null;
}

interface CacheEntry {
  timestamp: number;
  data: VendaComEmpresa[];
}

const MAX_CACHE_ENTRIES = 100;
const vendasCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 45 * 1000; // 45 segundos

function limparCacheExpirado() {
  const agora = Date.now();
  for (const [chave, entrada] of vendasCache.entries()) {
    if (agora - entrada.timestamp > CACHE_TTL_MS) {
      vendasCache.delete(chave);
    }
  }

  // Se ainda ultrapassar o limite, remove as entradas mais antigas (LRU simples)
  if (vendasCache.size > MAX_CACHE_ENTRIES) {
    const chaves = Array.from(vendasCache.keys());
    const excesso = chaves.slice(0, vendasCache.size - MAX_CACHE_ENTRIES);
    for (const k of excesso) {
      vendasCache.delete(k);
    }
  }
}

/**
 * Utilitário para executar promessas em paralelo com limite de concorrência
 */
async function executarComPool<T, R>(
  itens: T[],
  limiteConcorrencia: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const resultados: R[] = new Array(itens.length);
  let indiceAtual = 0;

  async function trabalhador() {
    while (indiceAtual < itens.length) {
      const idx = indiceAtual++;
      resultados[idx] = await fn(itens[idx]);
    }
  }

  const trabalhadores = Array.from(
    { length: Math.min(limiteConcorrencia, itens.length) },
    () => trabalhador(),
  );

  await Promise.all(trabalhadores);
  return resultados;
}

export interface ObterVendasParametros {
  empresasLiberadas: EmpresaInfo[];
  empresaSelecionadaId: string;
  dtInicial: string; // formato DD/MM/AAAA ou YYYY-MM-DD
  dtFinal: string;   // formato DD/MM/AAAA ou YYYY-MM-DD
  forcarAtualizacao?: boolean;
  signal?: AbortSignal;
}

export async function obterVendas({
  empresasLiberadas,
  empresaSelecionadaId,
  dtInicial,
  dtFinal,
  forcarAtualizacao = false,
  signal,
}: ObterVendasParametros): Promise<VendaComEmpresa[]> {
  limparCacheExpirado();

  const dtIniNormalizada = dtInicial.includes("-") ? dataInputParaSyspro(dtInicial) : dtInicial;
  const dtFimNormalizada = dtFinal.includes("-") ? dataInputParaSyspro(dtFinal) : dtFinal;
  const agora = Date.now();

  const consultarEmpresa = async (emp: EmpresaInfo): Promise<VendaComEmpresa[]> => {
    if (!emp.sysproBaseUrl) return [];

    const cacheKey = `${emp.id}_${dtIniNormalizada}_${dtFimNormalizada}`;
    const emCache = vendasCache.get(cacheKey);

    if (!forcarAtualizacao && emCache && agora - emCache.timestamp < CACHE_TTL_MS) {
      return emCache.data;
    }

    try {
      const config = {
        baseUrl: emp.sysproBaseUrl || "http://localhost:8080",
        useIis: emp.sysproUseIis === true || emp.sysproUseIis === "true",
      };

      const dados = await consultarVendas(config, {
        dtInicial: dtIniNormalizada,
        dtFinal: dtFimNormalizada,
      }, signal);

      const filtradas: VendaComEmpresa[] = dados
        .filter((v) => v.empresa_codigo === emp.empresaCodigo)
        .map((v) => ({
          ...v,
          empresa_id: emp.id,
          empresa_nome: emp.razaoSocial,
          empresa_cnpj: emp.cnpj,
        }));

      vendasCache.set(cacheKey, { timestamp: agora, data: filtradas });
      return filtradas;
    } catch (err) {
      console.error(`[sales-service] Erro ao consultar vendas da empresa ${emp.razaoSocial} (${emp.cnpj}):`, err);
      return [];
    }
  };

  if (empresaSelecionadaId === "todas") {
    // Modo consolidado com todas as filiais
    const resultadosPorEmpresa = await executarComPool(empresasLiberadas, 4, consultarEmpresa);
    return resultadosPorEmpresa.flat();
  }

  // Modo consolidado customizado (seleção de múltiplas filiais por vírgula: "id1,id2,id3")
  if (empresaSelecionadaId.includes(",")) {
    const idsAlvo = empresaSelecionadaId.split(",").map((id) => id.trim()).filter(Boolean);
    const empresasFiltradas = empresasLiberadas.filter((e) => idsAlvo.includes(e.id));
    if (empresasFiltradas.length > 0) {
      const resultadosPorEmpresa = await executarComPool(empresasFiltradas, 4, consultarEmpresa);
      return resultadosPorEmpresa.flat();
    }
  }

  const empresaAlvo = empresasLiberadas.find((e) => e.id === empresaSelecionadaId) ?? empresasLiberadas[0];
  if (!empresaAlvo) return [];

  return consultarEmpresa(empresaAlvo);
}
