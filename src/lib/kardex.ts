export type DirecaoKardex = "entrada" | "saida" | "indefinida";

export type CategoriaKardex =
  | "venda"
  | "devolucao_venda"
  | "compra"
  | "devolucao_compra"
  | "transferencia"
  | "bonificacao"
  | "outros";

export interface ClassificacaoKardex {
  categoria: CategoriaKardex;
  direcao: DirecaoKardex;
  rotulo: string;
}

export interface MovimentoKardex {
  empresaCodigo: string;
  empresaNome: string;
  participante: string;
  produtoCodigoAuxiliar: string;
  produtoDescricao: string;
  valorTotal: number;
  dataMovimento: string;
  quantidadeAnterior: number;
  quantidadeMovimentada: number;
  saldo: number;
  documento: string;
  grupoDocumento: string;
  descricaoGrupoDocumento: string;
  operacaoSyspro: string;
  modeloDocumento: string;
  direcao: DirecaoKardex;
  classificacao: ClassificacaoKardex;
  empresaId?: string;
  empresaCnpj?: string;
}

export function paraNumero(valor: unknown): number {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  if (typeof valor !== "string") return 0;
  const normalizado = valor.trim().replace(/\./g, "").replace(",", ".");
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

export function classificarMovimentoKardex(
  grupoDocumento: string,
  operacaoSyspro: string,
  descricaoGrupoDocumento = "",
): ClassificacaoKardex {
  const grupo = grupoDocumento.trim().toUpperCase();
  const descricao = descricaoGrupoDocumento.trim().toUpperCase();
  const operacao = operacaoSyspro.trim().toUpperCase();
  const direcao: DirecaoKardex = operacao === "E"
    ? "entrada"
    : operacao === "S"
      ? "saida"
      : "indefinida";

  const categorias: Record<string, Omit<ClassificacaoKardex, "direcao">> = {
    EA: { categoria: "outros", rotulo: "Ajuste de estoque" },
    EBC: { categoria: "bonificacao", rotulo: "Bonificação concedida" },
    EDV: { categoria: "devolucao_venda", rotulo: "Devolução de venda" },
    EDO: { categoria: "outros", rotulo: "Doação" },
    ENP: { categoria: "venda", rotulo: "Venda PDV" },
    ETM: { categoria: "transferencia", rotulo: "Transferência para produção" },
    EVP: { categoria: "venda", rotulo: "Venda PDV" },
    EVD: { categoria: "venda", rotulo: "Venda direta" },
    EDC: { categoria: "devolucao_compra", rotulo: "Devolução de compra" },
    EPE: { categoria: "outros", rotulo: "Perda ou furto" },
    ESS: { categoria: "outros", rotulo: "Simples remessa" },
    EST: { categoria: "transferencia", rotulo: "Transferência" },
    PCP: { categoria: "compra", rotulo: "Pedido de compra" },
    EBR: { categoria: "bonificacao", rotulo: "Bonificação" },
    EAQ: { categoria: "compra", rotulo: "Recebimento de mercadorias" },
    ECI: { categoria: "outros", rotulo: "Consumo interno" },
    EOE: { categoria: "outros", rotulo: "Outras entradas" },
    EPD: { categoria: "outros", rotulo: "Recebimento por produção" },
    EES: { categoria: "outros", rotulo: "Simples remessa" },
    EET: { categoria: "transferencia", rotulo: "Transferência" },
    ETE: { categoria: "outros", rotulo: "Troca de mercadoria" },
  };

  const classificacao = grupo === "EOS"
    ? descricao.includes("VENDA FUTURA")
      ? { categoria: "venda" as const, rotulo: "Venda futura" }
      : descricao.includes("PRODUCAO")
        ? { categoria: "outros" as const, rotulo: "Produção de mercadoria" }
        : { categoria: "outros" as const, rotulo: "Outras saídas" }
    : (categorias[grupo] ?? { categoria: "outros" as const, rotulo: grupo || "Outros" });

  return { ...classificacao, direcao };
}

export function normalizarMovimentoKardex(item: unknown): MovimentoKardex {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error("Resposta de Kardex inválida.");
  }
  const registro = item as Record<string, unknown>;
  const texto = (campo: string) => String(registro[campo] ?? "").trim();
  const grupoDocumento = texto("kardex_cd_grupo_documento");
  const descricaoGrupoDocumento = texto("kardex_ds_grupo_documento");
  const operacaoSyspro = texto("kardex_operacao");
  const classificacao = classificarMovimentoKardex(grupoDocumento, operacaoSyspro, descricaoGrupoDocumento);

  return {
    empresaCodigo: texto("empresa_codigo"),
    empresaNome: texto("empresa_nome"),
    participante: texto("participante_nome"),
    produtoCodigoAuxiliar: texto("produto_codigo_auxiliar"),
    produtoDescricao: texto("produto_descricao"),
    valorTotal: paraNumero(registro.produto_vlr_total),
    dataMovimento: texto("kardex_data_movimento"),
    quantidadeAnterior: paraNumero(registro.kardex_qtde_anterior),
    quantidadeMovimentada: paraNumero(registro.kardex_qtde_movimento),
    saldo: paraNumero(registro.kardex_qtde_saldo),
    documento: texto("kardex_nro_documento"),
    grupoDocumento,
    descricaoGrupoDocumento,
    operacaoSyspro,
    modeloDocumento: texto("kardex_modelo_documento"),
    direcao: classificacao.direcao,
    classificacao,
  };
}

export function validarPeriodoKardex(inicial: string, final: string): boolean {
  const converter = (valor: string) => {
    const resultado = /^(?:(\d{2})\/(\d{2})\/(\d{4})|(\d{4})-(\d{2})-(\d{2}))$/.exec(valor);
    if (!resultado) return null;
    const [, diaBr, mesBr, anoBr, anoIso, mesIso, diaIso] = resultado;
    const data = new Date(Date.UTC(Number(anoBr ?? anoIso), Number(mesBr ?? mesIso) - 1, Number(diaBr ?? diaIso)));
    return Number.isNaN(data.getTime()) ? null : data;
  };
  const inicio = converter(inicial);
  const fim = converter(final);
  // Janela inclusiva de no máximo 31 dias: diferença máxima de 30 dias.
  return Boolean(inicio && fim && inicio <= fim && fim.getTime() - inicio.getTime() <= 30 * 86_400_000);
}
