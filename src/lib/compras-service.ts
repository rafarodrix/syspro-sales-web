import { obterMovimentosEstoque } from "@/lib/estoque-service";
import { normalizarCodigoProduto } from "@/lib/metricas-negocio";
import { dividirPeriodoKardex, montarRelatorioCompras, normalizarDataIso } from "@/lib/relatorio-compras";
import { obterVendas, periodoConsultaValido, SalesQueryError, type EmpresaInfo } from "@/lib/sales-service";
import { consultarSysproAdaptativamente } from "@/lib/syspro-consulta-adaptativa";

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
  const janelasKardex = dividirPeriodoKardex(inicialIso, finalEstoque);

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
