import type { VendaProduto } from "@/lib/syspro-api";
import { erroPeriodo, type Periodo } from "@/lib/periodo";
import {
  analiseClientes,
  isClienteConsumidorGenerico,
  valorItem,
} from "@/lib/vendas";

const DIA = 86_400_000;

export function normalizarNomeCliente(nome: string | null | undefined): string {
  return (
    nome?.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR") ||
    "CLIENTE NÃO IDENTIFICADO"
  );
}

export function normalizarClientes<T extends VendaProduto>(vendas: T[]): T[] {
  return vendas.map((venda) => ({
    ...venda,
    cliente_nome: normalizarNomeCliente(venda.cliente_nome),
  }));
}

/** Aceita a data civil ISO ou BR, sem conversão de fuso horário. */
export function dataCompraIso(valor: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(valor);
  const br = /^(\d{2})\/(\d{2})\/(\d{4})(?:$|[ T])/.exec(valor);
  const data = iso
    ? `${iso[1]}-${iso[2]}-${iso[3]}`
    : br
      ? `${br[3]}-${br[2]}-${br[1]}`
      : null;
  return data && !erroPeriodo({ inicial: data, final: data }) ? data : null;
}

function diasPeriodo(periodo: Periodo): number {
  return (Date.parse(periodo.final) - Date.parse(periodo.inicial)) / DIA + 1;
}

export interface FrequenciaCliente {
  nome: string;
  cidade: string;
  uf: string;
  classe: "A" | "B" | "C" | null;
  diasComCompra: number;
  porMes: number[];
  mesesComCompra: number;
  frequencia: number;
  intervaloMedio: number | null;
  ultimaCompra: string | null;
  diasSemCompra: number | null;
  faturamento: number;
  diasAnteriores: number | null;
  frequenciaAnterior30: number | null;
  frequenciaAtual30: number;
  variacaoFrequencia: number | null;
  faturamentoAnterior: number | null;
  variacaoFaturamento: number | null;
  situacao: "ambos" | "so-atual" | "sem-compra" | "sem-comparativo";
}

export type SegmentoFrequencia =
  "todos" | "regulares" | "unico-dia" | "sem-compra";

export function filtrarFrequencia(
  itens: FrequenciaCliente[],
  busca: string,
  classe: string,
  segmento: SegmentoFrequencia,
): FrequenciaCliente[] {
  const termo = busca.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
  return itens.filter(
    (item) =>
      (!termo ||
        `${item.nome} ${item.cidade} ${item.uf}`
          .toLocaleUpperCase("pt-BR")
          .includes(termo)) &&
      (classe === "todas" || item.classe === classe) &&
      (segmento !== "regulares" ||
        item.mesesComCompra === item.porMes.length) &&
      (segmento !== "unico-dia" || item.diasComCompra === 1) &&
      (segmento !== "sem-compra" || item.situacao === "sem-compra"),
  );
}

export function analisarFrequenciaClientes(
  vendas: VendaProduto[],
  anteriores: VendaProduto[],
  periodo: Periodo,
  periodoAnterior: Periodo | null,
  comparacaoDisponivel: boolean,
) {
  if (erroPeriodo(periodo))
    throw new Error("Período inválido para análise de frequência.");
  const comparar =
    comparacaoDisponivel &&
    periodoAnterior !== null &&
    !erroPeriodo(periodoAnterior);
  const meses: string[] = [];
  const cursor = new Date(`${periodo.inicial.slice(0, 7)}-01T00:00:00Z`);
  while (cursor.toISOString().slice(0, 7) <= periodo.final.slice(0, 7)) {
    meses.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  const fim = new Date(`${periodo.final}T00:00:00Z`);
  const ultimoDiaMes = new Date(
    Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const mesesCompletos =
    periodo.inicial.endsWith("-01") && fim.getUTCDate() === ultimoDiaMes;
  const divisor = mesesCompletos ? meses.length : diasPeriodo(periodo) / 30;
  const atuais = normalizarClientes(vendas);
  const passadas = comparar ? normalizarClientes(anteriores) : [];
  const classes = new Map(
    analiseClientes(atuais).itens.map((item) => [item.nome, item.classe]),
  );
  type Base = {
    nome: string;
    cidade: string;
    uf: string;
    datas: Set<string>;
    faturamento: number;
  };
  let registrosSemData = 0;
  let faturamentoNaoIdentificado = 0;
  function agrupar(lista: VendaProduto[], janela: Periodo, atual: boolean) {
    const mapa = new Map<string, Base>();
    for (const venda of lista) {
      if (isClienteConsumidorGenerico(venda.cliente_nome)) {
        if (atual) faturamentoNaoIdentificado += valorItem(venda);
        continue;
      }
      const data = dataCompraIso(venda.nf_dt_emissao);
      if (!data) registrosSemData++;
      if (data && (data < janela.inicial || data > janela.final)) continue;
      const item = mapa.get(venda.cliente_nome) ?? {
        nome: venda.cliente_nome,
        cidade: venda.cliente_cidade,
        uf: venda.cliente_uf,
        datas: new Set<string>(),
        faturamento: 0,
      };
      if (data) item.datas.add(data);
      item.faturamento += valorItem(venda);
      mapa.set(item.nome, item);
    }
    return mapa;
  }
  const atual = agrupar(atuais, periodo, true);
  const anterior = comparar
    ? agrupar(passadas, periodoAnterior!, false)
    : new Map<string, Base>();
  const diferenca = (a: number, b: number) =>
    b > 0 ? ((a - b) / b) * 100 : null;
  const itens: FrequenciaCliente[] = [
    ...new Set([...atual.keys(), ...anterior.keys()]),
  ].map((nome) => {
    const a = atual.get(nome);
    const b = anterior.get(nome);
    const base = a ?? b!;
    const datas = [...(a?.datas ?? [])].sort();
    const datasAnteriores = [...(b?.datas ?? [])].sort();
    const ultimaCompra = datas.at(-1) ?? datasAnteriores.at(-1) ?? null;
    const porMes = meses.map(
      (mes) => datas.filter((data) => data.startsWith(mes)).length,
    );
    const frequenciaAtual30 = (datas.length / diasPeriodo(periodo)) * 30;
    const frequenciaAnterior30 = comparar
      ? (datasAnteriores.length / diasPeriodo(periodoAnterior!)) * 30
      : null;
    return {
      nome,
      cidade: base.cidade,
      uf: base.uf,
      classe: classes.get(nome) ?? null,
      diasComCompra: datas.length,
      porMes,
      mesesComCompra: porMes.filter(Boolean).length,
      frequencia: datas.length / divisor,
      intervaloMedio:
        datas.length < 2
          ? null
          : (Date.parse(datas.at(-1)!) - Date.parse(datas[0])) /
            DIA /
            (datas.length - 1),
      ultimaCompra,
      diasSemCompra: ultimaCompra
        ? (Date.parse(periodo.final) - Date.parse(ultimaCompra)) / DIA
        : null,
      faturamento: a?.faturamento ?? 0,
      diasAnteriores: comparar ? datasAnteriores.length : null,
      frequenciaAnterior30,
      frequenciaAtual30,
      variacaoFrequencia:
        frequenciaAnterior30 === null
          ? null
          : diferenca(frequenciaAtual30, frequenciaAnterior30),
      faturamentoAnterior: comparar ? (b?.faturamento ?? 0) : null,
      variacaoFaturamento: comparar
        ? diferenca(a?.faturamento ?? 0, b?.faturamento ?? 0)
        : null,
      situacao: !comparar
        ? "sem-comparativo"
        : a && b
          ? "ambos"
          : a
            ? "so-atual"
            : "sem-compra",
    };
  });
  const frequencias = itens
    .filter((item) => item.diasComCompra > 0)
    .map((item) => item.frequencia)
    .sort((a, b) => a - b);
  const meio = Math.floor(frequencias.length / 2);
  return {
    itens,
    meses,
    mesesCompletos,
    comparar,
    registrosSemData,
    faturamentoNaoIdentificado,
    unidade: mesesCompletos ? "dias/mês" : "dias/30 dias",
    ativos: frequencias.length,
    media: frequencias.length
      ? frequencias.reduce((a, b) => a + b, 0) / frequencias.length
      : 0,
    mediana: frequencias.length
      ? (frequencias[meio] +
          frequencias[Math.floor((frequencias.length - 1) / 2)]) /
        2
      : 0,
  };
}

export type RelatorioFrequencia = ReturnType<typeof analisarFrequenciaClientes>;
