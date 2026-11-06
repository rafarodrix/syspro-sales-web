type CampoObservabilidade = string | number | boolean | null | undefined;

/** Log estruturado local, legível pelo PM2 e por coletores futuros. */
export function registrarEvento(
  event: string,
  campos: Record<string, CampoObservabilidade> = {},
) {
  if (process.env.NODE_ENV === "test") return;
  console.info(JSON.stringify({
    event,
    ...campos,
    timestamp: new Date().toISOString(),
  }));
}

export async function medirOperacao<T>(
  event: string,
  campos: Record<string, CampoObservabilidade>,
  operacao: () => Promise<T>,
): Promise<T> {
  const inicio = performance.now();
  try {
    const resultado = await operacao();
    registrarEvento(event, {
      ...campos,
      success: true,
      durationMs: Math.round(performance.now() - inicio),
    });
    return resultado;
  } catch (error) {
    registrarEvento(event, {
      ...campos,
      success: false,
      durationMs: Math.round(performance.now() - inicio),
      error: error instanceof Error ? error.name : "UnknownError",
    });
    throw error;
  }
}
