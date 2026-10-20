import { SysproApiError } from "@/lib/syspro-api";

export interface JanelaConsulta {
  inicial: string;
  final: string;
}

function normalizarDataIso(valor: string): string {
  const texto = String(valor ?? "").trim();
  const brasileira = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  return brasileira ? `${brasileira[3]}-${brasileira[2]}-${brasileira[1]}` : texto;
}

export function excedeuLimiteRespostaSyspro(error: unknown): boolean {
  let atual: unknown = error;
  for (let profundidade = 0; profundidade < 5 && atual; profundidade += 1) {
    if (atual instanceof SysproApiError
      && atual.status === 502
      && atual.message.includes("excede o limite")) {
      return true;
    }
    atual = (atual as { cause?: unknown }).cause;
  }
  return false;
}

export function dividirJanelaAoMeio(janela: JanelaConsulta): [JanelaConsulta, JanelaConsulta] | null {
  const inicial = normalizarDataIso(janela.inicial);
  const final = normalizarDataIso(janela.final);
  const inicio = Date.parse(`${inicial}T00:00:00Z`);
  const fim = Date.parse(`${final}T00:00:00Z`);
  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || inicio >= fim) return null;

  const umDia = 86_400_000;
  const meio = inicio + Math.floor((fim - inicio) / umDia / 2) * umDia;
  const paraIso = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 10);
  return [
    { inicial, final: paraIso(meio) },
    { inicial: paraIso(meio + umDia), final },
  ];
}

/** Divide respostas grandes em janelas sequenciais para não sobrecarregar o Syspro local. */
export async function consultarSysproAdaptativamente<T>(
  janela: JanelaConsulta,
  consultar: (parte: JanelaConsulta) => Promise<T[]>,
): Promise<T[]> {
  try {
    return await consultar(janela);
  } catch (error) {
    if (!excedeuLimiteRespostaSyspro(error)) throw error;
    const partes = dividirJanelaAoMeio(janela);
    if (!partes) throw error;

    const resultado: T[] = [];
    for (const parte of partes) {
      resultado.push(...await consultarSysproAdaptativamente(parte, consultar));
    }
    return resultado;
  }
}
