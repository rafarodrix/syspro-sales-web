import { obterMovimentosEstoque } from "@/lib/estoque-service";
import { normalizarCodigoProduto } from "@/lib/metricas-negocio";
import { dividirPeriodoKardex, montarRelatorioCompras, normalizarDataIso } from "@/lib/relatorio-compras";
import { obterVendas, periodoConsultaValido, SalesQueryError, type EmpresaInfo } from "@/lib/sales-service";
import { consultarSysproAdaptativamente } from "@/lib/syspro-consulta-adaptativa";

/** Janela extra consultada antes do período (histórico de saldo). */
const DIAS_HISTORICO_ANTERIOR = 30;

function somarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

function hojeEmSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function obterRelatorioCompras({
  actorId,
  empresa,
  dtInicial,
  dtFinal,
  forcarAtualizacao = false,
  consultarSaldoAtual = true,
  signal,
}: {
  actorId: string;
  empresa: EmpresaInfo;
  dtInicial: string;
  dtFinal: string;
  forcarAtualizacao?: boolean;
  /** Compras precisa do saldo atual; margens consulta somente EDVs do período. */
  consultarSaldoAtual?: boolean;
  signal?: AbortSignal;
}) {
  if (!periodoConsultaValido(dtInicial, dtFinal)) {
    throw new SalesQueryError("Informe um período válido de até 366 dias.", 400);
  }

  const inicialIso = normalizarDataIso(dtInicial);
  const finalIso = normalizarDataIso(dtFinal);
  const finalEstoque = consultarSaldoAtual && inicialIso <= hojeEmSaoPaulo()
    ? [finalIso, hojeEmSaoPaulo()].sort().at(-1)!
    : finalIso;
  // Olha 30 dias antes do período só para saber se o produto já existia na base.
  // Sem esse histórico, um item zerado antes da janela parece "cadastro novo" e
  // os dias de ruptura anteriores ao primeiro movimento ficam de fora da conta.
  const inicioHistorico = somarDias(inicialIso, -DIAS_HISTORICO_ANTERIOR);
  const janelasKardex = dividirPeriodoKardex(inicioHistorico, finalEstoque);

  // Vendas e Kardex já dividem automaticamente respostas acima do limite.
  const vendas = await consultarSysproAdaptativamente(
    { inicial: inicialIso, final: finalIso },
    (janela) => obterVendas({
      actorId,
      empresasLiberadas: [empresa],
      empresaSelecionadaId: empresa.id,
      dtInicial: janela.inicial,
      dtFinal: janela.final,
      forcarAtualizacao,
      signal,
      enforceRateLimit: false,
    }),
  );
  const idsProdutos = new Set(
    vendas
      .map((venda) => normalizarCodigoProduto(venda.produto_id, ""))
      .filter(Boolean),
  );
  const movimentos: Awaited<ReturnType<typeof obterMovimentosEstoque>> = [];

  // As janelas são cronológicas: um EDV pode revelar um produto sem venda no período,
  // cujo saldo precisa continuar sendo acompanhado nas janelas seguintes.
  for (const janela of janelasKardex) {
    const movimentosJanela = await consultarSysproAdaptativamente(
      janela,
      (parte) => obterMovimentosEstoque({
        empresa,
        dtInicial: parte.inicial,
        dtFinal: parte.final,
        signal,
      }),
    );
    for (const movimento of movimentosJanela) {
      if (String(movimento.grupoDocumento ?? "").trim().toUpperCase() !== "EDV") continue;
      const id = normalizarCodigoProduto(movimento.produtoIdProduto, "");
      if (id) idsProdutos.add(id);
    }
    movimentos.push(...movimentosJanela.filter((movimento) =>
      idsProdutos.has(normalizarCodigoProduto(movimento.produtoIdProduto, "")),
    ));
  }

  return montarRelatorioCompras(vendas, movimentos, { inicial: inicialIso, final: finalIso }, { grupoEstoquePadrao: empresa.grupoEstoquePadrao });
}
