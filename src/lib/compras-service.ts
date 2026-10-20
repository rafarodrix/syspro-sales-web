import { obterMovimentosEstoque } from "@/lib/estoque-service";
import { normalizarCodigoProduto } from "@/lib/metricas-negocio";
import { SysproApiError } from "@/lib/syspro-api";
import { dividirPeriodoKardex, montarRelatorioCompras, normalizarDataIso } from "@/lib/relatorio-compras";
import {
  obterVendas,
  periodoConsultaValido,
  SalesQueryError,
  type EmpresaInfo,
} from "@/lib/sales-service";

function hojeEmSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

interface JanelaConsulta {
  inicial: string;
  final: string;
}

function dividirJanelaAoMeio(janela: JanelaConsulta): [JanelaConsulta, JanelaConsulta] | null {
  const inicio = Date.parse(`${janela.inicial}T00:00:00Z`);
  const fim = Date.parse(`${janela.final}T00:00:00Z`);
  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || inicio >= fim) return null;

  const umDia = 86_400_000;
  const meio = inicio + Math.floor((fim - inicio) / umDia / 2) * umDia;
  const paraIso = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 10);

  return [
    { inicial: janela.inicial, final: paraIso(meio) },
    { inicial: paraIso(meio + umDia), final: janela.final },
  ];
}

function excedeuLimiteResposta(error: unknown): boolean {
  let atual: unknown = error;
  for (let profundidade = 0; profundidade < 5 && atual; profundidade += 1) {
    if (atual instanceof SysproApiError
      && atual.status === 502
      && atual.message.includes("excede o limite")) {
      return true;
    }
    atual = (atual as { cause?: unknown }).cause;
  }
  return false;
}

async function obterVendasAdaptativo({
  actorId,
  empresa,
  janela,
  forcarAtualizacao,
  signal,
}: {
  actorId: string;
  empresa: EmpresaInfo;
  janela: JanelaConsulta;
  forcarAtualizacao: boolean;
  signal?: AbortSignal;
}) {
  try {
    return await obterVendas({
      actorId,
      empresasLiberadas: [empresa],
      empresaSelecionadaId: empresa.id,
      dtInicial: janela.inicial,
      dtFinal: janela.final,
      forcarAtualizacao,
      signal,
      enforceRateLimit: false,
    });
  } catch (error) {
    if (!excedeuLimiteResposta(error)) throw error;

    const partes = dividirJanelaAoMeio(janela);
    if (!partes) throw error;

    const vendas: Awaited<ReturnType<typeof obterVendas>> = [];
    for (const parte of partes) {
      vendas.push(...await obterVendasAdaptativo({
        actorId,
        empresa,
        janela: parte,
        forcarAtualizacao,
        signal,
      }));
    }
    return vendas;
  }
}

async function obterMovimentosAdaptativo({
  empresa,
  janela,
  idsProdutos,
  signal,
}: {
  empresa: EmpresaInfo;
  janela: JanelaConsulta;
  idsProdutos: Set<string>;
  signal?: AbortSignal;
}) {
  try {
    const movimentos = await obterMovimentosEstoque({
      empresa,
      dtInicial: janela.inicial,
      dtFinal: janela.final,
      signal,
    });
    for (const movimento of movimentos) {
      if (String(movimento.grupoDocumento ?? "").trim().toUpperCase() !== "EDV") continue;
      const id = normalizarCodigoProduto(movimento.produtoIdProduto, "");
      if (id) idsProdutos.add(id);
    }
    return movimentos.filter((movimento) =>
      idsProdutos.has(normalizarCodigoProduto(movimento.produtoIdProduto, "")),
    );
  } catch (error) {
    if (!excedeuLimiteResposta(error)) throw error;

    const partes = dividirJanelaAoMeio(janela);
    if (!partes) throw error;

    const movimentos: Awaited<ReturnType<typeof obterMovimentosEstoque>> = [];
    for (const parte of partes) {
      movimentos.push(...await obterMovimentosAdaptativo({
        empresa,
        janela: parte,
        idsProdutos,
        signal,
      }));
    }
    return movimentos;
  }
}

export async function obterRelatorioCompras({
  actorId,
  empresa,
  dtInicial,
  dtFinal,
  forcarAtualizacao = false,
  signal,
}: {
  actorId: string;
  empresa: EmpresaInfo;
  dtInicial: string;
  dtFinal: string;
  forcarAtualizacao?: boolean;
  signal?: AbortSignal;
}) {
  if (!periodoConsultaValido(dtInicial, dtFinal)) {
    throw new SalesQueryError("Informe um período válido de até 366 dias.", 400);
  }

  const inicialIso = normalizarDataIso(dtInicial);
  const finalIso = normalizarDataIso(dtFinal);
  const finalEstoque = inicialIso <= hojeEmSaoPaulo()
    ? [finalIso, hojeEmSaoPaulo()].sort().at(-1)!
    : finalIso;
  const janelasKardex = dividirPeriodoKardex(inicialIso, finalEstoque);

  const vendas = await obterVendasAdaptativo({
    actorId,
    empresa,
    janela: { inicial: inicialIso, final: finalIso },
    forcarAtualizacao,
    signal,
  });
  const idsProdutos = new Set(
    vendas
      .map((venda) => normalizarCodigoProduto(venda.produto_id, ""))
      .filter(Boolean),
  );
  const movimentos: Awaited<ReturnType<typeof obterMovimentosEstoque>> = [];
  // As janelas são cronológicas: um EDV pode revelar um produto sem venda no período,
  // cujo saldo precisa continuar sendo acompanhado nas janelas seguintes.
  for (const janela of janelasKardex) {
    movimentos.push(...await obterMovimentosAdaptativo({
      empresa,
      janela,
      idsProdutos,
      signal,
    }));
  }

  return montarRelatorioCompras(vendas, movimentos, { inicial: inicialIso, final: finalIso });
}
