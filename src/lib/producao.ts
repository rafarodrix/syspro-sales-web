/**
 * Produção — rota `producao` da API de exportação do Syspro.
 *
 * A rota ainda NÃO está autorizada nas bases atuais (HTTP 401 "Authorization not
 * found"). Por isso o normalizador é tolerante: mapeia os campos conhecidos
 * quando existirem e mantém todos os demais, para que a tela funcione no dia em
 * que o SysproServer liberar a rota — sem precisar reescrever código.
 */

export interface ProducaoNormalizada {
  empresaCodigo: string;
  empresaNome: string;
  produto: string;
  codigo: string;
  data: string | null;
  quantidade: number;
  produzido: number;
  operador: string;
  observacao: string;
  /** Registro original, preservado para exibir campos não mapeados. */
  extras: Record<string, string | number | null>;
}

const CAMPOS_CONHECIDOS = new Set([
  "empresa_codigo",
  "empresa_razao",
  "empresa_nome",
  "produto_descricao",
  "produto_codigo_auxiliar",
  "produto",
  "data",
  "producao_data",
  "quantidade",
  "producao_quantidade",
  "produzido",
  "producao_produzido",
  "operador",
  "producao_operador",
  "observacao",
  "producao_observacao",
]);

function texto(valor: unknown): string {
  return String(valor ?? "").trim();
}

function numero(valor: unknown): number {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  const bruto = texto(valor);
  if (!bruto) return 0;
  const normalizado = bruto.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const convertido = Number(normalizado);
  if (Number.isFinite(convertido)) return convertido;
  const alternativo = Number(bruto);
  return Number.isFinite(alternativo) ? alternativo : 0;
}

function primeiro(registro: Record<string, unknown>, chaves: string[]): unknown {
  for (const chave of chaves) {
    if (registro[chave] !== undefined && registro[chave] !== null && texto(registro[chave]) !== "") {
      return registro[chave];
    }
  }
  return undefined;
}

function dataIso(valor: unknown): string | null {
  const bruto = texto(valor);
  if (!bruto) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(bruto);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(bruto);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}

export function normalizarProducao(bruto: unknown): ProducaoNormalizada {
  if (!bruto || typeof bruto !== "object") throw new Error("Resposta de produção inválida.");
  const registro = bruto as Record<string, unknown>;

  const extras: Record<string, string | number | null> = {};
  for (const [chave, valor] of Object.entries(registro)) {
    if (CAMPOS_CONHECIDOS.has(chave)) continue;
    extras[chave] =
      typeof valor === "number" || typeof valor === "string"
        ? valor
        : valor === null || valor === undefined
          ? null
          : JSON.stringify(valor);
  }

  return {
    empresaCodigo: texto(registro.empresa_codigo),
    empresaNome: texto(registro.empresa_razao ?? registro.empresa_nome),
    produto: texto(primeiro(registro, ["produto_descricao", "produto"])),
    codigo: texto(primeiro(registro, ["produto_codigo_auxiliar", "produto_codigo"])),
    data: dataIso(primeiro(registro, ["data", "producao_data"])),
    quantidade: numero(primeiro(registro, ["quantidade", "producao_quantidade"])),
    produzido: numero(primeiro(registro, ["produzido", "producao_produzido"])),
    operador: texto(primeiro(registro, ["operador", "producao_operador"])),
    observacao: texto(primeiro(registro, ["observacao", "producao_observacao"])),
    extras,
  };
}

export interface ResumoProducao {
  registros: number;
  quantidade: number;
  produzido: number;
  produtosDistintos: number;
  operadores: number;
  /** Diferença entre o produzido e o previsto (positivo = excedeu). */
  diferenca: number;
}

export function resumirProducao(registros: ProducaoNormalizada[]): ResumoProducao {
  let quantidade = 0;
  let produzido = 0;
  const produtos = new Set<string>();
  const operadores = new Set<string>();

  for (const registro of registros) {
    quantidade += registro.quantidade;
    produzido += registro.produzido;
    if (registro.produto) produtos.add(registro.produto);
    if (registro.operador) operadores.add(registro.operador);
  }

  return {
    registros: registros.length,
    quantidade,
    produzido,
    produtosDistintos: produtos.size,
    operadores: operadores.size,
    diferenca: produzido - quantidade,
  };
}
