export interface Periodo {
  inicial: string;
  final: string;
}

/** Mesmo limite aceito pela API: datas reais, ordem crescente e até 366 dias. */
export function erroPeriodo(periodo: Periodo): string | null {
  const parse = (valor: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
    const [ano, mes, dia] = valor.split("-").map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia ? data : null;
  };
  const inicio = parse(periodo.inicial);
  const fim = parse(periodo.final);
  if (!inicio || !fim) return "Informe as duas datas válidas.";
  if (inicio > fim) return "A data inicial deve ser anterior à final.";
  if (fim.getTime() - inicio.getTime() > 366 * 86_400_000) return "O período máximo é de 366 dias.";
  return null;
}
