/**
 * Utilitários centralizados de formatação para toda a aplicação.
 * Garante formatação consistente e reutilização de instâncias Intl.
 */

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatadorNumeroInteiro = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

const formatadorNumeroDecimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatarMoeda(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return "R$ 0,00";
  return formatadorMoeda.format(valor);
}

export function formatarNumero(
  valor: number | null | undefined,
  decimais: 0 | 1 | 2 = 0,
): string {
  if (valor == null || Number.isNaN(valor)) return "0";
  if (decimais === 0) return formatadorNumeroInteiro.format(valor);
  if (decimais === 2) return formatadorNumeroDecimal.format(valor);
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  }).format(valor);
}

export function formatarPercentual(
  valor: number | null | undefined,
  decimais = 1,
): string {
  if (valor == null || Number.isNaN(valor)) return "0,0%";
  return `${valor.toFixed(decimais).replace(".", ",")}%`;
}

export function formatarK(valor: number): string {
  if (valor === 0) return "0";
  if (valor >= 1000000) return `${(valor / 1000000).toFixed(1)}M`;
  if (valor >= 1000) return `${Math.round(valor / 1000)}k`;
  return String(valor);
}

export function formatarCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) return "";
  const v = cnpj.replace(/\D/g, "").slice(0, 14);
  if (v.length <= 2) return v;
  if (v.length <= 5) return `${v.slice(0, 2)}.${v.slice(2)}`;
  if (v.length <= 8) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`;
  if (v.length <= 12)
    return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8)}`;
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12, 14)}`;
}

export function formatarDataVisual(dataStr: string | null | undefined): string {
  if (!dataStr) return "";
  if (dataStr.includes("/")) {
    const parts = dataStr.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : dataStr;
  }
  return dataStr;
}
