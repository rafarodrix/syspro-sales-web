import type { MovimentoKardex } from "@/lib/kardex";
import type { VendaProduto } from "@/lib/syspro-api";
import { paraNumero } from "@/lib/vendas";

export type ClasseCurvaCompras = "A" | "B" | "C";

export interface ItemRelatorioCompras {
  codigo: string;
  produto: string;
  unidade: string;
  curva: ClasseCurvaCompras;
  quantidadeVendida: number;
  quantidadeDevolvida: number;
  estoqueAtual: number | null;
  dataUltimoMovimento: string | null;
}

export interface ResumoRelatorioCompras {
  totalProdutos: number;
  quantidadeVendida: number;
  quantidadeDevolvida: number;
  produtosSemSaldo: number;
}

export interface RelatorioCompras {
  itens: ItemRelatorioCompras[];
  resumo: ResumoRelatorioCompras;
}

function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase();
}

function estaNoPeriodo(data: string, inicial: string, final: string): boolean {
  const dataIso = data.slice(0, 10);
  return dataIso >= inicial && dataIso <= final;
}

export function montarRelatorioCompras(
  vendas: VendaProduto[],
  movimentos: MovimentoKardex[],
  periodo: { inicial: string; final: string },
): RelatorioCompras {
  const porProduto = new Map<
    string,
    Omit<ItemRelatorioCompras, "curva"> & { ordemUltimoMovimento: number }
  >();

  for (const venda of vendas) {
    const codigoOriginal = String(venda.produto_id ?? "").trim();
    const codigo = normalizarCodigo(codigoOriginal);
    if (!codigo) continue;

    const atual = porProduto.get(codigo) ?? {
      codigo: codigoOriginal,
      produto: venda.produto_descricao?.trim() || "Produto sem descrição",
      unidade: venda.produto_un?.trim() || "-",
      quantidadeVendida: 0,
      quantidadeDevolvida: 0,
      estoqueAtual: null,
      dataUltimoMovimento: null,
      ordemUltimoMovimento: -1,
    };
    atual.quantidadeVendida += paraNumero(venda.produto_qtde);
    porProduto.set(codigo, atual);
  }

  movimentos.forEach((movimento, indice) => {
    const codigo = normalizarCodigo(movimento.produtoCodigoAuxiliar);
    const atual = porProduto.get(codigo);
    if (!atual) return;

    if (
      movimento.grupoDocumento.trim().toUpperCase() === "EDC" &&
      estaNoPeriodo(movimento.dataMovimento, periodo.inicial, periodo.final)
    ) {
      atual.quantidadeDevolvida += Math.abs(movimento.quantidadeMovimentada);
    }

    const dataAtual = movimento.dataMovimento.slice(0, 10);
    const dataAnterior = atual.dataUltimoMovimento?.slice(0, 10) ?? "";
    if (dataAtual > dataAnterior || (dataAtual === dataAnterior && indice > atual.ordemUltimoMovimento)) {
      atual.estoqueAtual = movimento.saldo;
      atual.dataUltimoMovimento = movimento.dataMovimento;
      atual.ordemUltimoMovimento = indice;
    }
  });

  const ordenados = [...porProduto.values()].sort(
    (a, b) => b.quantidadeVendida - a.quantidadeVendida || a.codigo.localeCompare(b.codigo),
  );
  const totalVendido = ordenados.reduce((total, item) => total + item.quantidadeVendida, 0);
  let acumulado = 0;

  const itens = ordenados.map((item) => {
    const percentualAntes = totalVendido > 0 ? (acumulado / totalVendido) * 100 : 100;
    acumulado += item.quantidadeVendida;
    const curva: ClasseCurvaCompras = percentualAntes < 80 ? "A" : percentualAntes < 95 ? "B" : "C";
    return {
      codigo: item.codigo,
      produto: item.produto,
      unidade: item.unidade,
      quantidadeVendida: item.quantidadeVendida,
      quantidadeDevolvida: item.quantidadeDevolvida,
      estoqueAtual: item.estoqueAtual,
      dataUltimoMovimento: item.dataUltimoMovimento,
      curva,
    };
  });

  return {
    itens,
    resumo: {
      totalProdutos: itens.length,
      quantidadeVendida: totalVendido,
      quantidadeDevolvida: itens.reduce((total, item) => total + item.quantidadeDevolvida, 0),
      produtosSemSaldo: itens.filter((item) => item.estoqueAtual === null).length,
    },
  };
}

export function dividirPeriodoKardex(inicial: string, final: string) {
  const paraData = (valor: string) => {
    const [ano, mes, dia] = valor.split("-").map(Number);
    return new Date(Date.UTC(ano, mes - 1, dia));
  };
  const paraIso = (data: Date) => data.toISOString().slice(0, 10);
  const periodos: Array<{ inicial: string; final: string }> = [];
  let cursor = paraData(inicial);
  const limite = paraData(final);

  while (cursor <= limite) {
    const fim = new Date(cursor);
    fim.setUTCDate(fim.getUTCDate() + 30);
    if (fim > limite) fim.setTime(limite.getTime());
    periodos.push({ inicial: paraIso(cursor), final: paraIso(fim) });
    cursor = new Date(fim);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return periodos;
}
