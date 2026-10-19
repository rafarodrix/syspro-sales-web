import type { VendaProduto } from "@/lib/syspro-api";

export type ClasseCurvaABC = "A" | "B" | "C";

export interface VariacaoMetrica {
  atual: number;
  anterior: number;
  diferenca: number;
  percentual: number;
  texto: string;
  positivo: boolean;
  neutro: boolean;
  semBase: boolean;
}

export function paraNumero(valor: number | string | null | undefined): number {
  if (valor == null || valor === "") return 0;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  const texto = String(valor).trim().replace(/\s/g, "");
  const normalizado = texto.includes(",")
    ? texto.replace(/\./g, "").replace(",", ".")
    : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

export function valorBrutoItem(venda: VendaProduto): number {
  return paraNumero(venda.produto_vlr_total_item);
}

export function valorLiquidoItem(venda: VendaProduto): number {
  const liquidoInformado = venda.produto_vlr_total_liquido;
  if (liquidoInformado !== undefined && liquidoInformado !== null && liquidoInformado !== "") {
    return paraNumero(liquidoInformado);
  }

  return (
    valorBrutoItem(venda)
    - paraNumero(venda.produto_vlr_desconto)
    + paraNumero(venda.produto_vlr_frete)
    + paraNumero(venda.produto_vlr_seguro)
    + paraNumero(venda.produto_vlr_outros)
  );
}

export function calcularPercentual(parte: number, total: number): number {
  return total > 0 ? (parte / total) * 100 : 0;
}

export function normalizarCodigoProduto(
  codigo: string | number | null | undefined,
  fallback = "SEM-COD",
): string {
  return String(codigo ?? "").trim().toUpperCase() || fallback;
}

export function normalizarDescricaoProduto(descricao: string | null | undefined): string {
  return String(descricao ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function classificarCurvaABC(percentualAcumuladoAnterior: number): ClasseCurvaABC {
  if (percentualAcumuladoAnterior < 80) return "A";
  if (percentualAcumuladoAnterior < 95) return "B";
  return "C";
}

export function calcularVariacao(atual: number, anterior: number): VariacaoMetrica {
  const diferenca = atual - anterior;
  if (anterior === 0) {
    const semMovimento = atual === 0;
    return {
      atual,
      anterior,
      diferenca,
      percentual: 0,
      texto: semMovimento ? "Sem movimento" : "Novo",
      positivo: true,
      neutro: semMovimento,
      semBase: true,
    };
  }

  const percentual = (diferenca / Math.abs(anterior)) * 100;
  const sinal = percentual > 0 ? "+" : "";
  return {
    atual,
    anterior,
    diferenca,
    percentual,
    texto: `${sinal}${percentual.toFixed(1).replace(".", ",")}%`,
    positivo: percentual >= 0,
    neutro: Math.abs(percentual) < 0.01,
    semBase: false,
  };
}

export function calcularDiasInclusivos(inicial: string, final: string): number {
  const inicio = Date.parse(`${inicial.slice(0, 10)}T00:00:00Z`);
  const fim = Date.parse(`${final.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim < inicio) return 0;
  return Math.floor((fim - inicio) / 86_400_000) + 1;
}

export function calcularDemandaLiquida(vendida: number, devolvida: number): number {
  return Math.max(0, vendida - devolvida);
}

export function calcularCoberturaEstoque(
  estoqueAtual: number | null,
  demandaLiquida: number,
  diasPeriodo: number,
): number | null {
  if (estoqueAtual === null || demandaLiquida <= 0 || diasPeriodo <= 0) return null;
  const mediaDiaria = demandaLiquida / diasPeriodo;
  return Math.max(0, estoqueAtual) / mediaDiaria;
}
