import { sanitizarSysproUrl } from "@/lib/validations";

/**
 * Cliente da API de exportação do Syspro ERP.
 * Rotas e campos conforme o manual oficial de Integração via API da Trilink.
 *
 * Duas formas de montar a URL:
 *  - Sem IIS: http://servidor:porta/api/exporta/<rota>?dt_inicial=..&dt_final=..
 *  - Com IIS: http://servidor:porta/syspro/exporta/api/<rota>?dt_inicial=..&dt_final=..
 * A forma exata depende do ambiente do cliente — configurado na tela Configurações.
 */

export interface SysproConfig {
  baseUrl: string; // ex.: http://api.minhaempresa.com:8080
  useIis: boolean; // true => prefixo /syspro/exporta/api ; false => /api/exporta
}

export interface SysproDateRange {
  dtInicial: string; // DD/MM/AAAA
  dtFinal: string; // DD/MM/AAAA
}

// ------------------------------------------------------------------
// Tipos por rota (conforme manual)
// ------------------------------------------------------------------

export interface VendaProduto {
  empresa_codigo: string;
  empresa_razao?: string;
  nf_cd_grupo_documento?: string;
  nf_ds_grupo_documento?: string;
  nf_numero: string;
  cliente_nome: string;
  cliente_cidade: string;
  cliente_uf: string;
  produto_id: string;
  produto_descricao: string;
  produto_departamento: string;
  produto_un: string;
  produto_qtde: number | string;
  produto_vlr_item: number | string;
  produto_vlr_icms_stb: number | string;
  produto_vlr_desconto: number | string;
  produto_vlr_frete: number | string;
  produto_vlr_total_item: number | string;
  produto_vlr_seguro?: number | string;
  produto_vlr_outros?: number | string;
  produto_vlr_total_liquido?: number | string;
  vendedor_nome: string;
  nf_dt_emissao: string; // DD/MM/AAAA
  nf_modelo: string; // ex.: 55, 65
  nf_forma_pagto: string;
}

export interface VendaComEmpresa extends VendaProduto {
  empresa_id?: string;
  empresa_nome?: string;
  empresa_cnpj?: string;
}

export interface MovimentacaoEstoque {
  codigo_auxiliar: string;
  produto_descricao: string;
  data_movimento: string;
  qtde_anterior: number | string;
  qtde_movimentada: number | string;
  saldo: number | string;
  documento: string;
  participante: string;
  operacao: string; // Entrada | Saída
}

export interface ProducaoProduto {
  data: string;
  observacao: string;
  produto: string;
  quantidade: number | string;
  produzido: number | string;
  operador: string;
}

export interface Titulo {
  empresa_codigo: string;
  numero_documento: string;
  cliente_nome?: string;
  fornecedor_nome?: string;
  tipo_documento?: string;
  data_emissao: string;
  data_vencimento: string;
  data_pagamento: string | null;
  valor: number | string;
  juros_multa: number | string;
  desconto: number | string;
  valor_total: number | string;
  forma_pagto_liquidacao?: string;
}

export interface TransporteRota {
  data: string;
  cliente: string;
  produto: string;
  quantidade: number | string;
  peso: number | string;
  veiculo: string;
  motorista: string;
  rotas: string;
  placa_veiculo: string;
}

// ------------------------------------------------------------------
// Core
// ------------------------------------------------------------------

export class SysproApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "SysproApiError";
  }
}

function buildPath(config: SysproConfig, rota: string): string {
  // Sem IIS: /api/exporta/<rota>
  // Com IIS: /sysproserverisapi.dll/api/exporta/<rota>
  const prefix = config.useIis
    ? "/sysproserverisapi.dll/api/exporta"
    : "/api/exporta";
  return `${prefix}/${rota}`;
}

function formatDate(d: string): string {
  // aceita DD/MM/AAAA ou ISO; normaliza para DD/MM/AAAA
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(d);
  if (iso) {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  }
  return d;
}

async function request<T>(
  config: SysproConfig,
  rota: string,
  range: SysproDateRange,
  signal?: AbortSignal,
): Promise<T[]> {
  const baseUrl = sanitizarSysproUrl(config.baseUrl);
  const params = new URLSearchParams({
    dt_inicial: formatDate(range.dtInicial),
    dt_final: formatDate(range.dtFinal),
  });
  const url = `${baseUrl}${buildPath(config, rota)}?${params.toString()}`;

  const res = await fetch(url, {
    signal: signal ?? AbortSignal.timeout(30_000),
    headers: { Accept: "application/json" },
    redirect: "error",
    // API local do Syspro: não validar TLS do cliente
    cache: "no-store",
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => undefined);
    }
    // 404 costuma ser caminho errado (com/sem IIS)
    throw new SysproApiError(
      res.status === 404
        ? "Rota não encontrada (404) — confira se o caminho é com ou sem IIS."
        : `Erro ${res.status} ao consultar a API do Syspro.`,
      res.status,
      body,
    );
  }

  const data = await lerRespostaJsonLimitada<T>(res);
  return Array.isArray(data) ? data : [data];
}

const MAX_SYSPRO_RESPONSE_BYTES = 10 * 1024 * 1024;
const MAX_SYSPRO_RECORDS = 50_000;

async function lerRespostaJsonLimitada<T>(res: Response): Promise<T[] | T> {
  const contentLength = Number(res.headers.get("content-length") ?? 0);
  if (contentLength > MAX_SYSPRO_RESPONSE_BYTES) {
    throw new SysproApiError("A resposta da API Syspro excede o limite permitido.", 502);
  }

  if (!res.body) throw new SysproApiError("Resposta vazia da API Syspro.", 502);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_SYSPRO_RESPONSE_BYTES) {
      await reader.cancel();
      throw new SysproApiError("A resposta da API Syspro excede o limite permitido.", 502);
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let data: T[] | T;
  try {
    data = JSON.parse(new TextDecoder().decode(body)) as T[] | T;
  } catch {
    throw new SysproApiError("A API Syspro retornou JSON inv\u00e1lido.", 502);
  }
  if (Array.isArray(data) && data.length > MAX_SYSPRO_RECORDS) {
    throw new SysproApiError("A resposta da API Syspro excede o limite de registros permitido.", 502);
  }
  return data;
}

// ------------------------------------------------------------------
// Consultas de vendas (foco do app)
// ------------------------------------------------------------------

export async function consultarVendas(
  config: SysproConfig,
  range: SysproDateRange,
  signal?: AbortSignal,
): Promise<VendaProduto[]> {
  const vendas = await request<unknown>(config, "produto/venda", range, signal);
  return vendas.map(normalizarVenda);
}

function normalizarVenda(item: unknown, indice: number): VendaProduto {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new SysproApiError(
      `Resposta de vendas inválida no item ${indice + 1}.`,
    );
  }
  const venda = item as Record<string, unknown>;
  const texto = (campo: string) => String(venda[campo] ?? "").trim();
  const numero = (campo: string) => {
    const valor = venda[campo];
    return typeof valor === "number" || typeof valor === "string" ? valor : 0;
  };
  const numeroOpcional = (campo: string) => {
    const valor = venda[campo];
    return typeof valor === "number" || typeof valor === "string" ? valor : undefined;
  };
  const camposObrigatorios = ["empresa_codigo", "nf_numero", "nf_dt_emissao"];
  if (camposObrigatorios.some((campo) => !texto(campo))) {
    throw new SysproApiError(
      `Resposta de vendas inválida no item ${indice + 1}: faltam campos obrigatórios.`,
    );
  }
  return {
    empresa_codigo: texto("empresa_codigo"),
    empresa_razao: texto("empresa_razao"),
    nf_cd_grupo_documento: texto("nf_cd_grupo_documento"),
    nf_ds_grupo_documento: texto("nf_ds_grupo_documento"),
    nf_numero: texto("nf_numero"),
    cliente_nome: texto("cliente_nome"),
    cliente_cidade: texto("cliente_cidade"),
    cliente_uf: texto("cliente_uf"),
    produto_id: texto("produto_id"),
    produto_descricao: texto("produto_descricao"),
    produto_departamento: texto("produto_departamento"),
    produto_un: texto("produto_un"),
    produto_qtde: numero("produto_qtde"),
    produto_vlr_item: numero("produto_vlr_item"),
    produto_vlr_icms_stb: numero("produto_vlr_icms_stb"),
    produto_vlr_desconto: numero("produto_vlr_desconto"),
    produto_vlr_frete: numero("produto_vlr_frete"),
    produto_vlr_seguro: numeroOpcional("produto_vlr_seguro"),
    produto_vlr_outros: numeroOpcional("produto_vlr_outros"),
    produto_vlr_total_item: numero("produto_vlr_total_item"),
    // Valor FINAL do item (bruto - desconto + frete + outros + seguro).
    // produto_vlr_total_item é o BRUTO (não abate desconto).
    produto_vlr_total_liquido: numeroOpcional("produto_vlr_total_liquido"),
    vendedor_nome: texto("vendedor_nome"),
    nf_dt_emissao: texto("nf_dt_emissao"),
    nf_modelo: texto("nf_modelo"),
    nf_forma_pagto: texto("nf_forma_pagto"),
  };
}

// ------------------------------------------------------------------
// Demais rotas do manual (disponíveis para evolução)
// ------------------------------------------------------------------

export async function consultarKardex(
  config: SysproConfig,
  range: SysproDateRange,
  signal?: AbortSignal,
): Promise<MovimentacaoEstoque[]> {
  return request<MovimentacaoEstoque>(config, "produto/kardex", range, signal);
}

export async function consultarProducao(
  config: SysproConfig,
  range: SysproDateRange,
  signal?: AbortSignal,
): Promise<ProducaoProduto[]> {
  return request<ProducaoProduto>(config, "producao", range, signal);
}

export async function consultarTitulosPagar(
  config: SysproConfig,
  range: SysproDateRange,
  signal?: AbortSignal,
): Promise<Titulo[]> {
  return request<Titulo>(config, "titulo/pagar", range, signal);
}

export async function consultarTitulosReceber(
  config: SysproConfig,
  range: SysproDateRange,
  signal?: AbortSignal,
): Promise<Titulo[]> {
  return request<Titulo>(config, "receber", range, signal);
}

export async function consultarTransporte(
  config: SysproConfig,
  range: SysproDateRange,
  signal?: AbortSignal,
): Promise<TransporteRota[]> {
  return request<TransporteRota>(config, "transporte/rota", range, signal);
}

// ------------------------------------------------------------------
// Configuração persistida no banco (tabela Empresa) + utilitário
// ------------------------------------------------------------------

export interface SysproEmpresa {
  cnpj: string;
  razaoSocial: string;
  empresaCodigo: string;
}

// A configuração de conexão (baseUrl/useIis) agora vive na tabela Empresa.
// As rotas montam o SysproConfig a partir da empresa selecionada.
// Fallback de ambiente permanece em consultarVendas quando baseUrl vazio.
