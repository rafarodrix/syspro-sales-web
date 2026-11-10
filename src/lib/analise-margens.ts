import type { ItemRelatorioCompras, RelatorioCompras } from "@/lib/relatorio-compras";
import { calcularPercentual } from "@/lib/metricas-negocio";

export interface ItemAnaliseMargem extends ItemRelatorioCompras {
  empresaId: string;
  empresaNome: string;
  custoAntesEdv: number | null;
  lucroAntesEdv: number | null;
  margemAntesEdv: number | null;
  custoDepoisEdv: number | null;
  lucroDepoisEdv: number | null;
  margemDepoisEdv: number | null;
  impactoLucroEdv: number | null;
}

export interface ResumoAnaliseMargens {
  faturamentoAntesEdv: number;
  devolucoesEdv: number;
  faturamentoDepoisEdv: number;
  faturamentoComCustoAntesEdv: number;
  faturamentoComCustoDepoisEdv: number;
  faturamentoSemCusto: number;
  custoAntesEdv: number;
  custoDepoisEdv: number;
  lucroAntesEdv: number;
  lucroDepoisEdv: number;
  margemAntesEdv: number;
  margemDepoisEdv: number;
  impactoLucroEdv: number;
  coberturaCusto: number;
  produtosMargemNegativa: number;
  produtosMargemBaixa: number;
}

export interface AnaliseMargens {
  itens: ItemAnaliseMargem[];
  resumo: ResumoAnaliseMargens;
  consultadoEm: string;
}

export type CriterioOrdenacaoMargem = "faturamento" | "impacto" | "margem" | "lucro";

export const CRITERIOS_ORDENACAO_MARGEM: Array<{
  valor: CriterioOrdenacaoMargem;
  rotulo: string;
  descricao: string;
}> = [
  {
    valor: "faturamento",
    rotulo: "Maior faturamento",
    descricao: "Ordena pelo valor vendido antes das devoluções",
  },
  {
    valor: "impacto",
    rotulo: "Maior impacto de EDV",
    descricao: "Ordena pela maior perda de lucro causada por devolução (mais negativo primeiro)",
  },
  {
    valor: "margem",
    rotulo: "Menor margem",
    descricao: "Ordena da margem mais baixa (ou negativa) para a mais alta entre os itens com custo",
  },
  {
    valor: "lucro",
    rotulo: "Maior lucro após EDV",
    descricao: "Ordena pelo lucro bruto depois das devoluções",
  },
];

/** Ordena a lista de margens; itens sem custo (valores nulos) ficam sempre no fim. */
export function ordenarItensMargem(
  itens: ItemAnaliseMargem[],
  criterio: CriterioOrdenacaoMargem,
): ItemAnaliseMargem[] {
  const nulosNoFim = (a: number | null, b: number | null, ordem: number) => {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return (a - b) * ordem;
  };

  return [...itens].sort((a, b) => {
    switch (criterio) {
      case "impacto":
        return nulosNoFim(a.impactoLucroEdv, b.impactoLucroEdv, 1)
          || b.valorVendido - a.valorVendido;
      case "margem":
        return nulosNoFim(a.margemDepoisEdv, b.margemDepoisEdv, 1)
          || b.valorVendido - a.valorVendido;
      case "lucro":
        return nulosNoFim(a.lucroDepoisEdv, b.lucroDepoisEdv, -1)
          || b.valorVendido - a.valorVendido;
      default:
        return b.valorVendido - a.valorVendido;
    }
  });
}

export function montarAnaliseMargens(
  relatorios: Array<{ empresaId: string; empresaNome: string; relatorio: RelatorioCompras }>,
  margemBaixaAbaixoDe = 20,
): AnaliseMargens {
  const itens = relatorios.flatMap(({ empresaId, empresaNome, relatorio }) =>
    relatorio.itens.map((item): ItemAnaliseMargem => {
      const custoUnitario = item.custoReposicaoMedio ?? null;
      const custoAntesEdv = custoUnitario === null
        ? null
        : custoUnitario * item.quantidadeVendida;
      const custoDepoisEdv = custoUnitario === null
        ? null
        : custoUnitario * item.quantidadeLiquidaReal;
      const lucroAntesEdv = custoAntesEdv === null
        ? null
        : item.valorVendido - custoAntesEdv;
      const lucroDepoisEdv = custoDepoisEdv === null
        ? null
        : item.valorVendaLiquida - custoDepoisEdv;
      const margemAntesEdv = lucroAntesEdv === null || item.valorVendido <= 0
        ? null
        : calcularPercentual(lucroAntesEdv, item.valorVendido);
      const margemDepoisEdv = lucroDepoisEdv === null || item.valorVendaLiquida <= 0
        ? null
        : calcularPercentual(lucroDepoisEdv, item.valorVendaLiquida);

      return {
        ...item,
        empresaId,
        empresaNome,
        custoAntesEdv,
        lucroAntesEdv,
        margemAntesEdv,
        custoDepoisEdv,
        lucroDepoisEdv,
        margemDepoisEdv,
        impactoLucroEdv:
          lucroAntesEdv === null || lucroDepoisEdv === null
            ? null
            : lucroDepoisEdv - lucroAntesEdv,
      };
    }),
  );

  let faturamentoAntesEdv = 0;
  let devolucoesEdv = 0;
  let faturamentoDepoisEdv = 0;
  let faturamentoComCustoAntesEdv = 0;
  let faturamentoComCustoDepoisEdv = 0;
  let faturamentoSemCusto = 0;
  let custoAntesEdv = 0;
  let custoDepoisEdv = 0;
  let lucroAntesEdv = 0;
  let lucroDepoisEdv = 0;

  for (const item of itens) {
    faturamentoAntesEdv += item.valorVendido;
    devolucoesEdv += item.valorDevolvido;
    faturamentoDepoisEdv += item.valorVendaLiquida;
    if (item.custoReposicaoMedio == null) {
      faturamentoSemCusto += item.valorVendaLiquida;
      continue;
    }
    faturamentoComCustoAntesEdv += item.valorVendido;
    faturamentoComCustoDepoisEdv += item.valorVendaLiquida;
    custoAntesEdv += item.custoAntesEdv ?? 0;
    custoDepoisEdv += item.custoDepoisEdv ?? 0;
    lucroAntesEdv += item.lucroAntesEdv ?? 0;
    lucroDepoisEdv += item.lucroDepoisEdv ?? 0;
  }

  return {
    itens: itens.sort((a, b) => b.valorVendido - a.valorVendido),
    resumo: {
      faturamentoAntesEdv,
      devolucoesEdv,
      faturamentoDepoisEdv,
      faturamentoComCustoAntesEdv,
      faturamentoComCustoDepoisEdv,
      faturamentoSemCusto,
      custoAntesEdv,
      custoDepoisEdv,
      lucroAntesEdv,
      lucroDepoisEdv,
      margemAntesEdv: calcularPercentual(lucroAntesEdv, faturamentoComCustoAntesEdv),
      margemDepoisEdv: calcularPercentual(lucroDepoisEdv, faturamentoComCustoDepoisEdv),
      impactoLucroEdv: lucroDepoisEdv - lucroAntesEdv,
      // Itens só com devolução têm venda líquida negativa e reduzem o denominador;
      // limitar a 100% evita cobertura acima do total quando isso acontece.
      coberturaCusto: Math.min(
        100,
        calcularPercentual(faturamentoComCustoDepoisEdv, faturamentoDepoisEdv),
      ),
      produtosMargemNegativa: itens.filter(
        (item) => item.margemDepoisEdv !== null && item.margemDepoisEdv < 0,
      ).length,
      produtosMargemBaixa: itens.filter(
        (item) =>
          item.margemDepoisEdv !== null &&
          item.margemDepoisEdv >= 0 &&
          item.margemDepoisEdv < margemBaixaAbaixoDe,
      ).length,
    },
    consultadoEm: new Date().toISOString(),
  };
}

/** Faixas de margem usadas na visão de distribuição. */
export const FAIXAS_MARGEM = [
  { id: "negativa", rotulo: "Margem negativa" },
  { id: "ate10", rotulo: "Até 10%" },
  { id: "10a20", rotulo: "10% a 20%" },
  { id: "20a30", rotulo: "20% a 30%" },
  { id: "acima30", rotulo: "Acima de 30%" },
  { id: "sem-custo", rotulo: "Sem custo informado" },
] as const;

export type FaixaMargem = (typeof FAIXAS_MARGEM)[number]["id"];

export function faixaDeMargem(margem: number | null): FaixaMargem {
  if (margem === null || !Number.isFinite(margem)) return "sem-custo";
  if (margem < 0) return "negativa";
  if (margem < 10) return "ate10";
  if (margem < 20) return "10a20";
  if (margem < 30) return "20a30";
  return "acima30";
}

export type DimensaoMargem = "curva" | "faixa";

export interface LinhaAgregadaMargem {
  chave: string;
  rotulo: string;
  produtos: number;
  vendaTotal: number;
  devolucoes: number;
  vendaLiquida: number;
  lucro: number;
  margem: number | null;
}

/**
 * Agrupa os produtos por curva ABC ou por faixa de margem. Serve para responder
 * "onde está o problema" sem obrigar a ler produto por produto.
 */
export function agregarMargens(
  itens: ItemAnaliseMargem[],
  dimensao: DimensaoMargem,
): LinhaAgregadaMargem[] {
  const grupos = new Map<string, LinhaAgregadaMargem>();

  const garantir = (chave: string, rotulo: string): LinhaAgregadaMargem => {
    const atual = grupos.get(chave);
    if (atual) return atual;
    const novo: LinhaAgregadaMargem = {
      chave,
      rotulo,
      produtos: 0,
      vendaTotal: 0,
      devolucoes: 0,
      vendaLiquida: 0,
      lucro: 0,
      margem: null,
    };
    grupos.set(chave, novo);
    return novo;
  };

  for (const item of itens) {
    const chave = dimensao === "curva" ? `curva-${item.curva}` : faixaDeMargem(item.margemDepoisEdv);
    const rotulo =
      dimensao === "curva"
        ? `Curva ${item.curva}`
        : (FAIXAS_MARGEM.find((faixa) => faixa.id === chave)?.rotulo ?? chave);

    const grupo = garantir(chave, rotulo);
    grupo.produtos += 1;
    grupo.vendaTotal += item.valorVendido;
    grupo.devolucoes += item.valorDevolvido;
    grupo.vendaLiquida += item.valorVendaLiquida;
    grupo.lucro += item.lucroDepoisEdv ?? 0;
  }

  const ordemCurva = ["curva-A", "curva-B", "curva-C"];
  const ordemFaixa = FAIXAS_MARGEM.map((faixa) => faixa.id as string);

  return [...grupos.values()]
    .map((grupo) => ({
      ...grupo,
      margem: grupo.vendaLiquida > 0 ? (grupo.lucro / grupo.vendaLiquida) * 100 : null,
    }))
    .sort((a, b) => {
      const ordem = dimensao === "curva" ? ordemCurva : ordemFaixa;
      const posicaoA = ordem.indexOf(a.chave);
      const posicaoB = ordem.indexOf(b.chave);
      if (posicaoA !== posicaoB) return posicaoA - posicaoB;
      return b.vendaLiquida - a.vendaLiquida;
    });
}
