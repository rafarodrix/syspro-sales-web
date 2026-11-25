
import { formatarMoeda } from "@/lib/formatters";
import { paraNumero } from "@/lib/metricas-negocio";

export interface ContatoCliente {
  codigo: string;
  nome: string;
  telefone: string;
}

export interface VendaItemCliente {
  empresa_codigo: string;
  nf_numero: string;
  nf_dt_emissao: string;
  cliente_nome: string;
  produto_codigo_auxiliar?: string;
  produto_descricao: string;
  produto_departamento: string;
  produto_un: string;
  produto_qtde: number | string;
  produto_vlr_item: number | string;
  produto_vlr_total_liquido?: number | string;
  produto_vlr_total_item: number | string;
  produto_vlr_desconto?: number | string;
}

/** Departamentos que representam serviço (banho e tosa, estética, consulta...). */
const DEPARTAMENTOS_SERVICO = [/BANHO/, /TOSA/, /SERVI[CÇ]O/, /CONSULTA/, /VACINA/, /EST[EÉ]TICA/];

export function tipoDoItem(departamento: string): "Serviço" | "Mercadoria" {
  const texto = String(departamento ?? "").toUpperCase();
  return DEPARTAMENTOS_SERVICO.some((padrao) => padrao.test(texto)) ? "Serviço" : "Mercadoria";
}

/** Nome usado no cruzamento com o cadastro (o Syspro grava com espaços extras). */
export function normalizarNomeCliente(nome: string): string {
  return String(nome ?? "").replace(/\s+/g, " ").trim().toUpperCase();
}

export function indexarContatos(contatos: ContatoCliente[]): Map<string, ContatoCliente> {
  const mapa = new Map<string, ContatoCliente>();
  for (const contato of contatos) {
    const chave = normalizarNomeCliente(contato.nome);
    if (!chave) continue;
    const existente = mapa.get(chave);
    // Prefere o contato que tem telefone (o join pode trazer linhas sem número).
    if (!existente || (!existente.telefone && contato.telefone)) mapa.set(chave, contato);
  }
  return mapa;
}

export const COLUNAS_ITENS_CLIENTE = [
  "Código do cliente",
  "Nome do cliente",
  "Telefone/WhatsApp",
  "Data da compra",
  "Código do produto",
  "Descrição do produto/serviço",
  "Categoria",
  "Tipo",
  "Unidade",
  "Quantidade",
  "Valor unitário",
  "Valor total do item",
  "Desconto",
  "Número da venda",
];

function dataBr(iso: string): string {
  const limpo = String(iso ?? "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpo)) return limpo.split("-").reverse().join("/");
  return String(iso ?? "");
}

/**
 * Monta o detalhamento item a item por cliente — o dado que o cliente pediu em
 * planilha: código/nome/telefone, data, produto, categoria, quantidade,
 * unitário, total e número da venda. Código e telefone vêm do cadastro de
 * participantes; quando o nome não casa, a linha sai com o telefone vazio.
 */
export function montarItensPorCliente(
  vendas: VendaItemCliente[],
  contatos?: Map<string, ContatoCliente>,
): (string | number)[][] {
  return vendas
    .map((venda) => {
      const quantidade = paraNumero(venda.produto_qtde);
      const total =
        venda.produto_vlr_total_liquido != null
          ? paraNumero(venda.produto_vlr_total_liquido)
          : paraNumero(venda.produto_vlr_total_item);
      const unitario = quantidade > 0 ? total / quantidade : paraNumero(venda.produto_vlr_item);
      const contato = contatos?.get(normalizarNomeCliente(venda.cliente_nome));

      return [
        contato?.codigo ?? "",
        String(venda.cliente_nome ?? "").replace(/\s+/g, " ").trim(),
        contato?.telefone ?? "",
        dataBr(venda.nf_dt_emissao),
        venda.produto_codigo_auxiliar?.trim() ?? "",
        String(venda.produto_descricao ?? "").trim(),
        String(venda.produto_departamento ?? "").trim(),
        tipoDoItem(venda.produto_departamento),
        venda.produto_un ?? "",
        quantidade,
        formatarMoeda(unitario),
        formatarMoeda(total),
        formatarMoeda(paraNumero(venda.produto_vlr_desconto)),
        String(venda.nf_numero ?? ""),
      ];
    })
    .sort((a, b) => {
      const nome = String(a[1]).localeCompare(String(b[1]), "pt-BR");
      if (nome !== 0) return nome;
      return String(a[3]).slice(6).localeCompare(String(b[3]).slice(6)) || String(a[3]).localeCompare(String(b[3]));
    });
}
