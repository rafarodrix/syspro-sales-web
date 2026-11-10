/**
 * Cache de consulta para telas que chamam a API do Syspro de forma pesada
 * (ex.: Vendas & Margem, que roda vendas + Kardex).
 *
 * Resolve três problemas que se somavam na tela:
 * 1. remontagem da aba disparava a consulta inteira de novo;
 * 2. duas montagens simultâneas abriam duas requisições iguais (sem dedupe);
 * 3. dado de um usuário/escopo podia ser reaproveitado por outro.
 */

export const TTL_CONSULTA_PADRAO = 5 * 60 * 1000;

interface EntradaCache {
  dados: unknown;
  em: number;
}

const cache = new Map<string, EntradaCache>();
const emVoo = new Map<string, Promise<unknown>>();
let usuarioAtual: string | null = null;

/**
 * Chave estável: a ordem das partes não importa, então a mesma consulta sempre
 * cai na mesma entrada. Campos `undefined`/`null`/`""` são ignorados.
 */
export function chaveConsulta(partes: Record<string, string | number | boolean | null | undefined>): string {
  return Object.entries(partes)
    .filter(([, valor]) => valor !== undefined && valor !== null && valor !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([campo, valor]) => `${campo}=${String(valor)}`)
    .join("&");
}

/**
 * Amarra o cache ao usuário logado: ao trocar de usuário (ou de escopo de
 * acesso) tudo é descartado, para nunca servir dado de outra pessoa.
 */
export function definirUsuarioDoCache(usuarioId: string | null | undefined): void {
  const alvo = usuarioId ?? null;
  if (usuarioAtual === null) {
    usuarioAtual = alvo;
    return;
  }
  if (usuarioAtual !== alvo) {
    cache.clear();
    emVoo.clear();
    usuarioAtual = alvo;
  }
}

export function lerCache<T>(chave: string, ttlMs = TTL_CONSULTA_PADRAO, agora = Date.now()): EntradaCache & { dados: T } | null {
  const entrada = cache.get(chave);
  if (!entrada) return null;
  if (agora - entrada.em > ttlMs) {
    cache.delete(chave);
    return null;
  }
  return { dados: entrada.dados as T, em: entrada.em };
}

export function gravarCache<T>(chave: string, dados: T, agora = Date.now()): void {
  cache.set(chave, { dados, em: agora });
}

/** Requisição em andamento para a mesma chave (dedupe de chamadas simultâneas). */
export function vooAtual<T>(chave: string): Promise<T> | undefined {
  return emVoo.get(chave) as Promise<T> | undefined;
}

/**
 * Executa a consulta uma única vez por chave e grava o resultado no cache.
 * Quem chamar enquanto a requisição está em andamento recebe a MESMA promessa.
 */
export function executarDeduplicado<T>(chave: string, buscar: () => Promise<T>): Promise<T> {
  const existente = vooAtual<T>(chave);
  if (existente) return existente;

  const promessa = buscar()
    .then((dados) => {
      gravarCache(chave, dados);
      return dados;
    })
    .finally(() => {
      emVoo.delete(chave);
    });

  emVoo.set(chave, promessa);
  return promessa;
}

/** Invalida uma entrada específica ou tudo que começa com o prefixo informado. */
export function invalidarCache(prefixo?: string): void {
  if (!prefixo) {
    cache.clear();
    emVoo.clear();
    return;
  }
  for (const chave of [...cache.keys()]) {
    if (chave.startsWith(prefixo)) cache.delete(chave);
  }
  for (const chave of [...emVoo.keys()]) {
    if (chave.startsWith(prefixo)) emVoo.delete(chave);
  }
}

/** Diagnóstico (testes e painel de depuração). */
export function tamanhoCache(): number {
  return cache.size;
}
