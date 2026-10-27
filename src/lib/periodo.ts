export interface Periodo {
  inicial: string;
  final: string;
}

/** Aceita AAAA-MM-DD ou DD/MM/AAAA e devolve sempre AAAA-MM-DD. */
export function normalizarDataIso(valor: string): string {
  const texto = String(valor ?? "").trim();
  const brasileira = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  return brasileira ? `${brasileira[3]}-${brasileira[2]}-${brasileira[1]}` : texto.slice(0, 10);
}

/** Converte uma data de input válida sem aceitar normalizações automáticas do Date. */
function parseDataInput(valor: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia ? data : null;
}

/** Valida datas reais e ordem crescente, sem impor quantidade máxima de dias. */
export function erroPeriodoSemLimite(periodo: Periodo): string | null {
  const inicio = parseDataInput(periodo.inicial);
  const fim = parseDataInput(periodo.final);
  if (!inicio || !fim) return "Informe as duas datas válidas.";
  if (inicio > fim) return "A data inicial deve ser anterior à final.";
  return null;
}

/** Validação padrão das consultas gerais, limitada a 366 dias. */
export function erroPeriodo(periodo: Periodo): string | null {
  const erroBase = erroPeriodoSemLimite(periodo);
  if (erroBase) return erroBase;
  const inicio = parseDataInput(periodo.inicial)!;
  const fim = parseDataInput(periodo.final)!;
  if (fim.getTime() - inicio.getTime() > 366 * 86_400_000) return "O período máximo é de 366 dias.";
  return null;
}
