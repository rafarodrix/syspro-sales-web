import { erroPeriodo, type Periodo } from "./periodo";

export type ModoComparacao =
  | "automatico"
  | "dias-anteriores"
  | "mes-anterior"
  | "ano-anterior"
  | "personalizado";
const DIA = 86_400_000;
const iso = (data: Date) => data.toISOString().slice(0, 10);
const dataUtc = (valor: string) => new Date(`${valor}T00:00:00Z`);

export function mesesCompletos(periodo: Periodo): boolean {
  const fim = dataUtc(periodo.final);
  return (
    periodo.inicial.endsWith("-01") &&
    fim.getUTCDate() ===
      new Date(
        Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth() + 1, 0),
      ).getUTCDate()
  );
}

function deslocarMes(
  valor: string,
  meses: number,
  preservarFim: boolean,
): string {
  const origem = dataUtc(valor);
  const alvo = new Date(
    Date.UTC(origem.getUTCFullYear(), origem.getUTCMonth() + meses, 1),
  );
  const ultimo = new Date(
    Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0),
  ).getUTCDate();
  alvo.setUTCDate(
    preservarFim ? ultimo : Math.min(origem.getUTCDate(), ultimo),
  );
  return iso(alvo);
}

/** Calendário civil em UTC: limites de mês/ano sem efeitos de horário de verão. */
export function resolverComparacao(
  atual: Periodo,
  modo: ModoComparacao = "automatico",
  personalizado?: Periodo,
): Periodo {
  const erro = erroPeriodo(atual);
  if (erro) throw new Error(erro);
  const inicio = dataUtc(atual.inicial);
  const fim = dataUtc(atual.final);
  let anterior: Periodo;
  if (modo === "personalizado") {
    if (!personalizado || erroPeriodo(personalizado))
      throw new Error(
        "Informe um período de comparação válido, de até 366 dias.",
      );
    anterior = { ...personalizado };
  } else if (
    modo === "ano-anterior" ||
    modo === "mes-anterior" ||
    (modo === "automatico" && mesesCompletos(atual))
  ) {
    const meses =
      modo === "ano-anterior"
        ? 12
        : modo === "mes-anterior"
          ? 1
          : (fim.getUTCFullYear() - inicio.getUTCFullYear()) * 12 +
            fim.getUTCMonth() -
            inicio.getUTCMonth() +
            1;
    anterior = {
      inicial: deslocarMes(atual.inicial, -meses, false),
      final: deslocarMes(atual.final, -meses, mesesCompletos(atual)),
    };
  } else {
    const duracao = fim.getTime() - inicio.getTime() + DIA;
    anterior = {
      inicial: iso(new Date(inicio.getTime() - duracao)),
      final: iso(new Date(inicio.getTime() - DIA)),
    };
  }
  if (anterior.final >= atual.inicial)
    throw new Error(
      "A comparação deve terminar antes do período atual. Para intervalos longos, use Automático, Ano anterior ou Personalizado.",
    );
  return anterior;
}
