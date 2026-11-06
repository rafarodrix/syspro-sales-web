/**
 * Consulta de pedidos (DAV) no SysproServer.
 *
 * Usa a rota `/api/dynamic/query` (PUT com SQL) porque a rota de exportação
 * `venda/pedidos` não devolve o horário de conferência nem o de fechamento —
 * justamente as colunas que o acompanhamento operacional precisa.
 *
 * O SQL é FIXO: só as datas entram na consulta, depois de validadas como
 * AAAA-MM-DD. O filtro de empresa é aplicado em memória (o código da empresa
 * tem zeros à esquerda que variam por instalação).
 */
import { SysproApiError } from "@/lib/syspro-api";
import { sanitizarSysproUrl } from "@/lib/validations";
import { fechamentoConfiavel, type PedidoSyspro } from "@/lib/pedidos";
import { normalizarDataIso } from "@/lib/periodo";

export interface ConfigPedidos {
  baseUrl?: string | null;
  useIis?: boolean | null;
  token?: string | null;
}

const PADRAO_DATA = /^\d{4}-\d{2}-\d{2}$/;

function montarSql(inicial: string, final: string): string {
  return [
    "select",
    "  p.NUMERO as numero,",
    "  p.PARTICIPANTE_NOME as cliente,",
    "  p.DT_VENDA as data_venda,",
    "  p.HR_VENDA as hora_venda,",
    "  p.HR_SEPARADO as hora_conferido,",
    "  e.HR_SAIDA as hora_saida,",
    "  p.HR_FECHAMENTO as hora_fechamento,",
    "  part.NOME as entregador,",
    "  p.STATUS as status,",
    "  p.STATUS2 as status2,",
    "  emp.CD_EMPRESA as empresa_codigo",
    "from PEDIDO p",
    "left join ENTREGA e on e.ID_PEDIDO = p.ID_PEDIDO",
    "left join PARTICIPANTE part on part.ID_PARTICIPANTE = e.ID_ENTREGADOR",
    "left join EMPRESA emp on emp.ID_EMPRESA = p.ID_EMPRESA",
    `where p.DT_VENDA between '${inicial}' and '${final}'`,
    "order by p.DT_VENDA, p.HR_VENDA",
  ].join("\n");
}

/** "01" e "1" representam a mesma empresa. */
function normalizarEmpresa(codigo: unknown): string {
  return String(codigo ?? "").trim().replace(/^0+/, "") || "0";
}

function texto(valor: unknown): string | null {
  const limpo = String(valor ?? "").trim();
  return limpo ? limpo : null;
}

function normalizarPedido(registro: Record<string, unknown>): PedidoSyspro | null {
  const numero = texto(registro.numero);
  if (!numero) return null;
  return {
    numero,
    cliente: texto(registro.cliente) ?? "—",
    dataVenda: normalizarDataIso(String(registro.data_venda ?? "")),
    horaVenda: texto(registro.hora_venda),
    // O Syspro ainda não registra a saída para separação (só o fim da conferência).
    horaSeparacao: null,
    horaConferido: texto(registro.hora_conferido),
    horaSaida: texto(registro.hora_saida),
    // Enquanto o pedido está aberto o Syspro repete o horário da venda aqui.
    horaFechamento: fechamentoConfiavel(texto(registro.hora_venda), texto(registro.hora_fechamento)),
    entregador: texto(registro.entregador),
    status: String(registro.status ?? "").trim().toUpperCase() || "—",
    status2: String(registro.status2 ?? "").trim().toUpperCase() || "—",
    empresaCodigo: String(registro.empresa_codigo ?? "").trim(),
  };
}

export async function obterPedidos({
  empresa,
  inicial,
  final,
  signal,
}: {
  empresa: ConfigPedidos & { empresaCodigo?: string | null };
  inicial: string;
  final: string;
  signal?: AbortSignal;
}): Promise<PedidoSyspro[]> {
  const inicio = normalizarDataIso(inicial);
  const fim = normalizarDataIso(final);
  if (!PADRAO_DATA.test(inicio) || !PADRAO_DATA.test(fim) || inicio > fim) {
    throw new SysproApiError("Período inválido para consultar pedidos.", 400);
  }
  if (!empresa.baseUrl) {
    throw new SysproApiError("A empresa selecionada não possui uma origem Syspro configurada.", 400);
  }

  const base = sanitizarSysproUrl(empresa.baseUrl);
  const prefixo = empresa.useIis ? "/sysproserverisapi.dll" : "";
  const url = `${base}${prefixo}/api/dynamic/query`;

  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: "PUT",
      signal: signal ?? AbortSignal.timeout(120_000),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(empresa.token?.trim() ? { Authorization: `Bearer ${empresa.token.trim()}` } : {}),
      },
      body: JSON.stringify({ sql: montarSql(inicio, fim) }),
      cache: "no-store",
    });
  } catch (erro) {
    throw new SysproApiError(
      `Não foi possível falar com o SysproServer em ${base}: ${erro instanceof Error ? erro.message : "erro de rede"}`,
      502,
    );
  }

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => "");
    if (resposta.status === 401) {
      throw new SysproApiError(
        "A API do Syspro exigiu autenticação (HTTP 401). Configure o Token da API desta empresa em Configurações.",
        401,
      );
    }
    if (resposta.status === 404) {
      throw new SysproApiError(
        "A rota /api/dynamic/query não está disponível nesta instalação do SysproServer.",
        404,
      );
    }
    throw new SysproApiError(
      `Erro ${resposta.status} ao consultar pedidos no Syspro. ${corpo.slice(0, 200)}`.trim(),
      502,
    );
  }

  const dados = (await resposta.json().catch(() => null)) as { result?: unknown } | null;
  const linhas = Array.isArray(dados?.result) ? dados!.result : [];
  const esperada = normalizarEmpresa(empresa.empresaCodigo);

  return linhas
    .map((linha) => normalizarPedido(linha as Record<string, unknown>))
    .filter((pedido): pedido is PedidoSyspro => pedido !== null)
    .filter((pedido) => normalizarEmpresa(pedido.empresaCodigo) === esperada);
}
