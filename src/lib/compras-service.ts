import { obterMovimentosEstoque } from "@/lib/estoque-service";
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

  const vendasPromise = obterVendas({
    actorId,
    empresasLiberadas: [empresa],
    empresaSelecionadaId: empresa.id,
    dtInicial,
    dtFinal,
    forcarAtualizacao,
    signal,
    enforceRateLimit: false,
  });
  const movimentosPromise = executarComPool(janelasKardex, 2, (janela) =>
    obterMovimentosEstoque({
      empresa,
      dtInicial: janela.inicial,
      dtFinal: janela.final,
      signal,
    }),
  ).then((resultados) => resultados.flat());

  const [vendas, movimentos] = await Promise.all([vendasPromise, movimentosPromise]);
  return montarRelatorioCompras(vendas, movimentos, { inicial: dtInicial, final: dtFinal });
}
