/**
 * O token da API pertence ao SysproServer, não à filial: uma instalação atende
 * várias empresas (empresa_codigo) do mesmo cliente. Por isso a configuração é
 * agrupada pela origem do servidor (baseUrl + modo IIS), e não por Empresa.
 */

export interface ServidorSyspro {
  baseUrl?: string | null;
  useIis?: boolean | null;
}

/** Normaliza a origem para comparar duas empresas que usam o mesmo servidor. */
export function normalizarOrigemServidor(baseUrl?: string | null): string {
  return String(baseUrl ?? "")
    .trim()
    .replace(/\/+$/, "")
    .toLowerCase();
}

/** Duas empresas usam o mesmo SysproServer quando a origem e o modo de rota batem. */
export function mesmoServidor(a: ServidorSyspro, b: ServidorSyspro): boolean {
  const origemA = normalizarOrigemServidor(a.baseUrl);
  const origemB = normalizarOrigemServidor(b.baseUrl);
  if (!origemA || !origemB) return false;
  return origemA === origemB && Boolean(a.useIis) === Boolean(b.useIis);
}

/**
 * Token que deve valer para a empresa: o informado na hora, senão o já cadastrado
 * por outra filial do mesmo servidor.
 */
export function tokenDoServidor(
  atual: string | null | undefined,
  irmaos: Array<{ sysproToken: string | null }>,
): string | null {
  const informado = String(atual ?? "").trim();
  if (informado) return informado;
  const herdado = irmaos.find((item) => String(item.sysproToken ?? "").trim())?.sysproToken;
  return herdado ? String(herdado).trim() : null;
}
