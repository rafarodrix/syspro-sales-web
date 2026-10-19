import { obterMovimentosEstoque } from "@/lib/estoque-service";
import { normalizarCodigoProduto } from "@/lib/metricas-negocio";
import { SysproApiError } from "@/lib/syspro-api";
import { dividirPeriodoKardex, montarRelatorioCompras } from "@/lib/relatorio-compras";
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

async function executarComPool<T, R>(
  itens: T[],
  limite: number,
  executar: (item: T) => Promise<R>,
): Promise<R[]> {
  const resultados = new Array<R>(itens.length);
  let proximo = 0;
  async function trabalhador() {
    while (proximo < itens.length) {
      const indice = proximo++;
      resultados[indice] = await executar(itens[indice]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
  return resultados;
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
  return error instanceof SysproApiError
    && error.status === 502
    && error.message.includes("excede o limite");
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

  const finalEstoque = dtInicial <= hojeEmSaoPaulo()
    ? [dtFinal, hojeEmSaoPaulo()].sort().at(-1)!
    : dtFinal;
  const janelasKardex = dividirPeriodoKardex(dtInicial, finalEstoque);

  const vendas = await obterVendas({
    actorId,
    empresasLiberadas: [empresa],
    empresaSelecionadaId: empresa.id,
    dtInicial,
    dtFinal,
    forcarAtualizacao,
    signal,
    enforceRateLimit: false,
  });
  const idsProdutos = new Set(
    vendas
      .map((venda) => normalizarCodigoProduto(venda.produto_id, ""))
      .filter(Boolean),
  );
  const movimentos = idsProdutos.size > 0
    ? await executarComPool(janelasKardex, 2, (janela) =>
        obterMovimentosAdaptativo({
          empresa,
          janela,
          idsProdutos,
          signal,
        }),
      ).then((resultados) => resultados.flat())
    : [];

  return montarRelatorioCompras(vendas, movimentos, { inicial: dtInicial, final: dtFinal });
}
