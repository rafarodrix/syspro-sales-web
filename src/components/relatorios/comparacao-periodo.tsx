import { Input } from "@/components/ui/input";
import type { Periodo } from "@/lib/periodo";
import {
  resolverComparacao,
  type ModoComparacao,
} from "@/lib/periodo-comparacao";
import { formatarDataInputParaBR } from "@/lib/vendas";
import { FiltroRelatorio } from "./filtro-relatorio";

export function ComparacaoPeriodo({
  periodo,
  modo,
  personalizado,
  onModo,
  onPersonalizado,
  loading,
}: {
  periodo: Periodo;
  modo: ModoComparacao;
  personalizado: Periodo;
  onModo: (modo: ModoComparacao) => void;
  onPersonalizado: (periodo: Periodo) => void;
  loading: boolean;
}) {
  let descricao: string;
  let invalido = false;
  try {
    const anterior = resolverComparacao(periodo, modo, personalizado);
    descricao = `${formatarDataInputParaBR(anterior.inicial)} a ${formatarDataInputParaBR(anterior.final)}`;
  } catch (erro) {
    descricao = erro instanceof Error ? erro.message : "Comparação inválida.";
    invalido = true;
  }
  return (
    <fieldset disabled={loading} className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">Período de comparação</legend>
      <span className="text-xs text-muted-foreground">Comparar com</span>
      <FiltroRelatorio
        rotulo="Comparar com"
        valor={modo}
        onChange={(valor) => onModo(valor as ModoComparacao)}
        opcoes={[
          { valor: "automatico", rotulo: "Automático" },
          { valor: "dias-anteriores", rotulo: "Dias anteriores" },
          { valor: "mes-anterior", rotulo: "Mesmo intervalo do mês anterior" },
          { valor: "ano-anterior", rotulo: "Mesmo período do ano anterior" },
          { valor: "personalizado", rotulo: "Personalizado" },
        ]}
      />
      {modo === "personalizado" ? (
        <>
          <Input
            type="date"
            aria-label="Início da comparação"
            className="w-40"
            value={personalizado.inicial}
            onChange={(e) =>
              onPersonalizado({ ...personalizado, inicial: e.target.value })
            }
          />
          <Input
            type="date"
            aria-label="Fim da comparação"
            className="w-40"
            value={personalizado.final}
            onChange={(e) =>
              onPersonalizado({ ...personalizado, final: e.target.value })
            }
          />
        </>
      ) : null}
      <span
        className={
          invalido
            ? "text-xs text-destructive"
            : "text-xs text-muted-foreground"
        }
        role={invalido ? "alert" : undefined}
      >
        {descricao}
      </span>
    </fieldset>
  );
}
