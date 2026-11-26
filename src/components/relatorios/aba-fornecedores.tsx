"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowLeftRight, Boxes, Factory, LayoutList } from "lucide-react";

import { FeedbackState } from "@/components/feedback-state";
import { ReportBarraVisao, ReportVisaoProvider } from "@/components/relatorios/report-barra";
import { ReportDiagnostics } from "@/components/relatorios/report-diagnostics";
import { ReportMetricStrip } from "@/components/relatorios/report-toolbar";
import { ReportTable } from "@/components/relatorios/report-table";
import { ReportViewSelector } from "@/components/relatorios/report-view-toggle";
import { Badge } from "@/components/ui/badge";
import { chaveConsulta } from "@/lib/cache-consulta";
import { exportarParaCSV } from "@/lib/exportar-csv";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import { useConsulta } from "@/lib/use-consulta";
import {
  analisarFornecedores,
  devolucoesPorFornecedor,
  produtosPorFornecedor,
  rotuloConcentracao,
  type ClasseFornecedor,
  type LinhaFornecedor,
  type ProdutoDoFornecedor,
} from "@/lib/analise-fornecedores";
import type { AnaliseMargens } from "@/lib/analise-margens";
import type { Periodo } from "@/components/date-range-filter";
import type { VendaComEmpresa, VendaProduto } from "@/lib/syspro-api";

type VisaoFornecedor = "sintese" | "fornecedores" | "itens" | "devolucoes";

const CORES_CLASSE: Record<ClasseFornecedor, string> = {
  A: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  B: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  C: "border-border bg-muted text-muted-foreground",
};

function SeloClasse({ classe }: { classe: ClasseFornecedor }) {
  return (
    <Badge
      variant="outline"
      className={`h-5 min-w-5 justify-center px-1 text-[10px] font-bold ${CORES_CLASSE[classe]}`}
    >
      {classe}
    </Badge>
  );
}

/**
 * Análise de Fornecedores (Relatórios › Vendas).
 *
 * Quatro leituras do mesmo período sobre o fornecedor que vem no item de venda:
 * síntese (o que importa), carteira (quem vende quanto), curva ABC de fornecedores
 * (dependência) e devoluções (o que voltou, por fornecedor).
 */
export function AbaFornecedores({
  vendas,
  empresaId,
  periodo,
  usuarioId,
}: {
  vendas: (VendaProduto | VendaComEmpresa)[];
  empresaId?: string;
  periodo?: Periodo;
  usuarioId?: string;
}) {
  const [visao, setVisao] = useState<VisaoFornecedor>("sintese");
  const [busca, setBusca] = useState("");

  const { linhas, resumo } = useMemo(() => analisarFornecedores(vendas), [vendas]);
  const produtos = useMemo(() => produtosPorFornecedor(vendas), [vendas]);

  // Base cujo SysproServer ainda não devolve fornecedor: nada a analisar.
  const somenteSemFornecedor = vendas.length > 0 && resumo.fornecedoresAtivos === 0;

  // Devoluções (EDV) vêm do Kardex pela rota de margens — mesma chave de cache da
  // aba Vendas & Margem, então quem já abriu aquela visão não paga a consulta.
  const chaveDevolucoes = chaveConsulta({
    relatorio: "margens",
    usuario: usuarioId,
    empresa: empresaId,
    inicial: periodo?.inicial,
    final: periodo?.final,
  });

  const buscarDevolucoes = useCallback(async () => {
    const resposta = await fetch("/api/relatorios/margens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresaId,
        dtInicial: periodo?.inicial,
        dtFinal: periodo?.final,
      }),
    });
    const json = (await resposta.json().catch(() => ({}))) as AnaliseMargens & { error?: string };
    if (!resposta.ok) throw new Error(json.error || "Erro ao consultar devoluções.");
    return json;
  }, [empresaId, periodo?.inicial, periodo?.final]);

  const devolucoes = useConsulta<AnaliseMargens>({
    chave: chaveDevolucoes,
    buscar: buscarDevolucoes,
    habilitado: visao === "devolucoes" && Boolean(empresaId && periodo?.inicial && periodo?.final),
  });

  const analiseDevolucoes = useMemo(
    () =>
      devolucoes.dados
        ? devolucoesPorFornecedor(
            devolucoes.dados.itens.map((item) => ({
              codigo: item.codigo,
              valorVendido: item.valorVendido,
              valorDevolvido: item.valorDevolvido,
            })),
            vendas,
          )
        : null,
    [devolucoes.dados, vendas],
  );

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return linhas;
    return linhas.filter((linha) => linha.fornecedor.toLowerCase().includes(termo));
  }, [linhas, busca]);

  const top15 = useMemo(() => filtradas.slice(0, 15), [filtradas]);

  const itensLista = useMemo(() => {
    const lista: (ProdutoDoFornecedor & { fornecedor: string })[] = [];
    for (const [fornecedor, listaDoFornecedor] of produtos) {
      for (const produto of listaDoFornecedor) lista.push({ ...produto, fornecedor });
    }
    return lista.sort((a, b) => b.venda - a.venda);
  }, [produtos]);

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return itensLista;
    return itensLista.filter(
      (item) =>
        item.produto.toLowerCase().includes(termo) ||
        item.fornecedor.toLowerCase().includes(termo) ||
        item.codigo.toLowerCase().includes(termo),
    );
  }, [itensLista, busca]);

  const fornecedoresClasseA = useMemo(
    () =>
      linhas.filter(
        (linha) => linha.classe === "A" && linha.fornecedor.toUpperCase() !== "SEM FORNECEDOR INFORMADO",
      ).length,
    [linhas],
  );

  const fornecedoresMargemNegativa = useMemo(
    () => linhas.filter((linha) => linha.margem !== null && linha.margem < 0).length,
    [linhas],
  );

  function exportarProdutos() {
    const linhasCsv: (string | number)[][] = [];
    for (const [fornecedor, lista] of produtos) {
      for (const produto of lista) {
        linhasCsv.push([
          fornecedor,
          produto.codigo,
          produto.produto,
          produto.quantidade,
          produto.venda,
          produto.lucro,
          produto.margem === null ? "" : produto.margem,
        ]);
      }
    }
    exportarParaCSV(
      `produtos-por-fornecedor-${periodo?.inicial ?? ""}-a-${periodo?.final ?? ""}`,
      ["Fornecedor", "Código", "Produto", "Quantidade", "Venda líquida", "Lucro", "Margem %"],
      linhasCsv,
    );
  }

  if (somenteSemFornecedor) {
    return (
      <FeedbackState
        variant="empty"
        title="Esta empresa ainda não devolve fornecedor"
        description={`Os ${formatarNumero(resumo.itensSemFornecedor, 0)} itens vendidos no período vieram sem fornecedor na rota produto/venda. Atualize o SysproServer desta base com a versão que envia fornecedor_codigo e fornecedor_nome — a análise passa a funcionar sem mudança no portal.`}
      />
    );
  }

  const diagnostico = [
    {
      label: "Maior fornecedor",
      value: formatarPercentual(linhas[0]?.participacao ?? 0, 1),
      detail: linhas[0]?.fornecedor,
    },
    {
      label: "Fornecedores para 80% da venda",
      value: `${formatarNumero(fornecedoresClasseA, 0)} de ${formatarNumero(resumo.fornecedoresAtivos, 0)}`,
      detail: "Quanto menor a proporção, mais dependente de poucos parceiros.",
      attention:
        resumo.fornecedoresAtivos > 0 && fornecedoresClasseA / resumo.fornecedoresAtivos < 0.2,
    },
    {
      label: "Margem negativa",
      value: `${formatarNumero(fornecedoresMargemNegativa, 0)} fornecedor(es)`,
      detail: "Vendendo abaixo do custo de reposição informado.",
      attention: fornecedoresMargemNegativa > 0,
    },
    {
      label: "Concentração (HHI)",
      value: `${formatarNumero(resumo.concentracaoHhi, 0)} · ${rotuloConcentracao(resumo.concentracaoHhi)}`,
      detail: "Soma dos quadrados das participações de venda.",
      attention: resumo.concentracaoHhi >= 2500,
    },
  ];

  return (
    <ReportVisaoProvider>
      <div className="space-y-4">
        <ReportBarraVisao>
          <ReportViewSelector
            view={visao}
            options={[
              { value: "sintese", label: "Síntese", icon: LayoutList },
              { value: "fornecedores", label: "Carteira", icon: Factory },
              { value: "itens", label: "Itens", icon: Boxes },
              { value: "devolucoes", label: "Devoluções", icon: ArrowLeftRight },
            ]}
            onViewChange={(proxima) => setVisao(proxima as VisaoFornecedor)}
          />
        </ReportBarraVisao>

        <ReportMetricStrip
          items={[
            { label: "Classe A", value: `${formatarNumero(fornecedoresClasseA, 0)} fornecedor(es)` },
            {
              label: "Margem negativa",
              value: `${formatarNumero(fornecedoresMargemNegativa, 0)} fornecedor(es)`,
              attention: fornecedoresMargemNegativa > 0,
            },
            {
              label: "Itens sem fornecedor",
              value: formatarNumero(resumo.itensSemFornecedor, 0),
              attention: resumo.itensSemFornecedor > 0,
            },
            {
              label: "Venda média por fornecedor",
              value: formatarMoeda(
                resumo.fornecedoresAtivos > 0 ? resumo.vendaTotal / resumo.fornecedoresAtivos : 0,
              ),
            },
          ]}
        />

        {visao === "sintese" ? (
          <div className="space-y-3">
            <ReportDiagnostics titulo="Como ler a carteira de fornecedores" metricas={diagnostico} />
            <ReportTable
              label="top fornecedores"
              caption="Principais fornecedores do período"
              data={top15}
              rowKey={(linha) => linha.fornecedor}
              stickyFirst
              exportObservacoes="Mostra os 15 maiores por venda líquida. A visão Carteira traz todos os fornecedores."
              columns={colunasBase()}
            />
            <p className="text-[11px] text-muted-foreground">
              {formatarNumero(filtradas.length, 0)} fornecedor(es) no período · a visão{" "}
              <strong className="text-foreground">Carteira</strong> traz a lista completa e{" "}
              <strong className="text-foreground">Devoluções</strong> mostra o que voltou.
            </p>
          </div>
        ) : null}

        {visao === "fornecedores" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <input
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Filtrar por fornecedor..."
                className="h-8 w-full rounded-md border bg-background px-2.5 text-xs sm:w-72"
                aria-label="Filtrar fornecedores"
              />
              <p className="text-[11px] text-muted-foreground">
                {formatarNumero(filtradas.length, 0)} de {formatarNumero(linhas.length, 0)} fornecedor(es)
              </p>
            </div>
            <ReportTable
              label="carteira de fornecedores"
              caption="Carteira completa de fornecedores"
              data={filtradas}
              rowKey={(linha) => linha.fornecedor}
              stickyFirst
              exportObservacoes="Venda bruta − descontos + acréscimos = venda líquida. Margem considera apenas itens com custo de reposição informado."
              exportExtras={[
                {
                  id: "produtos-por-fornecedor",
                  titulo: "Produtos por fornecedor (CSV)",
                  descricao: "SKU, quantidade, venda, lucro e margem",
                  icone: Boxes,
                  onSelect: exportarProdutos,
                },
              ]}
              columns={[
                ...colunasBase(false),
                {
                  id: "vendaBruta",
                  header: <>Venda bruta</>,
                  kind: "currency" as const,
                  value: (linha: LinhaFornecedor) => linha.valorVendido,
                  cell: (linha: LinhaFornecedor) => <>{formatarMoeda(linha.valorVendido)}</>,
                },
                {
                  id: "liquida",
                  header: <>Venda líquida</>,
                  kind: "currency" as const,
                  value: (linha: LinhaFornecedor) => linha.valorLiquido,
                  cell: (linha: LinhaFornecedor) => <>{formatarMoeda(linha.valorLiquido)}</>,
                },
                {
                  id: "acrescimos",
                  header: (
                    <span title="Frete, seguro e outros acréscimos somados ao item">Acréscimos</span>
                  ),
                  kind: "currency" as const,
                  value: (linha: LinhaFornecedor) => linha.acrescimos,
                  cell: (linha: LinhaFornecedor) => <>{formatarMoeda(linha.acrescimos)}</>,
                },
                {
                  id: "participacao",
                  header: <>Part.</>,
                  kind: "percent" as const,
                  value: (linha: LinhaFornecedor) => linha.participacao,
                  cell: (linha: LinhaFornecedor) => <>{formatarPercentual(linha.participacao, 1)}</>,
                },
              ]}
              renderDetalhe={(linha) => <DetalheProdutos lista={produtos.get(linha.fornecedor) ?? []} />}
              modoDetalhe="fechado"
            />
          </div>
        ) : null}

        {visao === "itens" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <input
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Filtrar por produto, código ou fornecedor..."
                className="h-8 w-full rounded-md border bg-background px-2.5 text-xs sm:w-96"
                aria-label="Filtrar itens"
              />
              <p className="text-[11px] text-muted-foreground">
                {formatarNumero(itensFiltrados.length, 0)} de {formatarNumero(itensLista.length, 0)} itens
              </p>
            </div>
            <ReportTable
              label="itens por fornecedor"
              caption="Itens vendidos por fornecedor"
              data={itensFiltrados}
              rowKey={(item) => `${item.fornecedor}-${item.codigo}`}
              stickyFirst
              exportObservacoes="Um item por produto e fornecedor. Venda é líquida de desconto; margem só existe onde há custo de reposição informado."
              exportExtras={[
                {
                  id: "produtos-por-fornecedor",
                  titulo: "Todos os itens (CSV)",
                  descricao: "SKU, quantidade, venda, lucro e margem",
                  icone: Boxes,
                  onSelect: exportarProdutos,
                },
              ]}
              columns={[
                {
                  id: "fornecedor",
                  header: <>Fornecedor</>,
                  kind: "name" as const,
                  value: (item) => item.fornecedor,
                  cell: (item) => (
                    <span className="block max-w-[18rem] truncate">{item.fornecedor}</span>
                  ),
                },
                {
                  id: "codigo",
                  header: <>Código</>,
                  kind: "name" as const,
                  value: (item) => item.codigo,
                  cell: (item) => <>{item.codigo}</>,
                },
                {
                  id: "produto",
                  header: <>Produto</>,
                  kind: "name" as const,
                  value: (item) => item.produto,
                  cell: (item) => <span className="block max-w-[24rem] truncate">{item.produto}</span>,
                },
                {
                  id: "quantidade",
                  header: <>Qtd</>,
                  kind: "number" as const,
                  value: (item) => item.quantidade,
                  cell: (item) => <>{formatarNumero(item.quantidade, 2)}</>,
                },
                {
                  id: "venda",
                  header: <>Venda</>,
                  kind: "currency" as const,
                  value: (item) => item.venda,
                  cell: (item) => <>{formatarMoeda(item.venda)}</>,
                },
                {
                  id: "lucro",
                  header: <>Lucro</>,
                  kind: "currency" as const,
                  value: (item) => item.lucro,
                  cell: (item) => (
                    <span className={item.lucro < 0 ? "font-semibold text-negativo" : ""}>
                      {formatarMoeda(item.lucro)}
                    </span>
                  ),
                },
                {
                  id: "margem",
                  header: <>Margem</>,
                  kind: "percent" as const,
                  value: (item) => item.margem,
                  cell: (item) => (
                    <span className={item.margem !== null && item.margem < 0 ? "font-semibold text-negativo" : ""}>
                      {item.margem === null ? "—" : formatarPercentual(item.margem, 1)}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        ) : null}

        {visao === "devolucoes" ? (
          <div className="space-y-3">
            {devolucoes.erro ? (
              <FeedbackState
                variant="error"
                title="Não foi possível carregar as devoluções"
                description={devolucoes.erro}
                onRetry={() => devolucoes.atualizar()}
              />
            ) : null}

            {!devolucoes.erro && !analiseDevolucoes ? (
              <FeedbackState
                variant="empty"
                title="Carregando devoluções"
                description="A devolução vem do Kardex (mesma fonte da aba Vendas & Margem); a consulta pode levar alguns segundos."
              />
            ) : null}

            {analiseDevolucoes ? (
              <>
                <ReportTable
                  label="devolucoes por fornecedor"
                  caption="Devoluções por fornecedor"
                  data={analiseDevolucoes.linhas}
                  rowKey={(linha) => linha.fornecedor}
                  stickyFirst
                  exportObservacoes={`Devolução (EDV) lida do Kardex. ${formatarNumero(analiseDevolucoes.vinculo, 0)} produto(s) ligados ao fornecedor pela venda, ${formatarNumero(analiseDevolucoes.semVinculo, 0)} sem vínculo.`}
                  columns={[
                    {
                      id: "fornecedor",
                      header: <>Fornecedor</>,
                      kind: "name" as const,
                      value: (linha) => linha.fornecedor,
                      cell: (linha) => (
                        <span className="block truncate font-medium">{linha.fornecedor}</span>
                      ),
                    },
                    {
                      id: "vendido",
                      header: <>Vendido</>,
                      kind: "currency" as const,
                      value: (linha) => linha.vendido,
                      cell: (linha) => <>{formatarMoeda(linha.vendido)}</>,
                    },
                    {
                      id: "devolvido",
                      header: <>Devolvido</>,
                      kind: "currency" as const,
                      value: (linha) => linha.devolvido,
                      cell: (linha) => (
                        <span className="font-semibold text-negativo">{formatarMoeda(linha.devolvido)}</span>
                      ),
                    },
                    {
                      id: "taxa",
                      header: <span title="Devolvido ÷ vendido">Taxa</span>,
                      kind: "percent" as const,
                      value: (linha) => linha.taxa,
                      cell: (linha) => <>{linha.taxa === null ? "—" : formatarPercentual(linha.taxa, 2)}</>,
                    },
                    {
                      id: "itens",
                      header: <>Produtos</>,
                      kind: "number" as const,
                      value: (linha) => linha.itens,
                      cell: (linha) => <>{formatarNumero(linha.itens, 0)}</>,
                    },
                  ]}
                />
                {analiseDevolucoes.semVinculo > 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    {formatarNumero(analiseDevolucoes.semVinculo, 0)} produto(s) com devolução não foram
                    vendidos no período e por isso não têm fornecedor identificado — aparecem em “Sem
                    fornecedor informado”.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </ReportVisaoProvider>
  );
}

/** Colunas comuns: fornecedor, classe, lucro, margem, SKUs e clientes. */
function colunasBase(comClasse = true) {
  return [
    {
      id: "fornecedor",
      header: <>Fornecedor</>,
      kind: "name" as const,
      value: (linha: LinhaFornecedor) => linha.fornecedor,
      cell: (linha: LinhaFornecedor) => (
        <span className="block max-w-[22rem] truncate font-medium">{linha.fornecedor}</span>
      ),
    },
    ...(comClasse
      ? [
          {
            id: "classe",
            header: <>Classe</>,
            kind: "name" as const,
            value: (linha: LinhaFornecedor) => linha.classe,
            cell: (linha: LinhaFornecedor) => <SeloClasse classe={linha.classe} />,
          },
        ]
      : []),
    {
      id: "lucro",
      header: <>Lucro</>,
      kind: "currency" as const,
      value: (linha: LinhaFornecedor) => linha.lucro,
      cell: (linha: LinhaFornecedor) => (
        <span className={linha.lucro < 0 ? "font-semibold text-negativo" : ""}>
          {formatarMoeda(linha.lucro)}
        </span>
      ),
    },
    {
      id: "margem",
      header: <>Margem</>,
      kind: "percent" as const,
      value: (linha: LinhaFornecedor) => linha.margem,
      cell: (linha: LinhaFornecedor) => (
        <span className={linha.margem !== null && linha.margem < 0 ? "font-semibold text-negativo" : ""}>
          {linha.margem === null ? "—" : formatarPercentual(linha.margem, 1)}
        </span>
      ),
    },
    {
      id: "skus",
      header: <>SKUs</>,
      kind: "number" as const,
      value: (linha: LinhaFornecedor) => linha.skus,
      cell: (linha: LinhaFornecedor) => <>{formatarNumero(linha.skus, 0)}</>,
    },
    {
      id: "clientes",
      header: (
        <span title="Clientes distintos que compraram itens deste fornecedor">Clientes</span>
      ),
      kind: "number" as const,
      value: (linha: LinhaFornecedor) => linha.clientes,
      cell: (linha: LinhaFornecedor) => <>{formatarNumero(linha.clientes, 0)}</>,
    },
  ];
}

/** Produtos do fornecedor, abertos na própria linha da tabela. */
function DetalheProdutos({ lista }: { lista: ProdutoDoFornecedor[] }) {
  if (!lista.length) {
    return <p className="px-3 py-2 text-[11px] text-muted-foreground">Sem produtos no período.</p>;
  }
  return (
    <div className="space-y-1 px-3 py-2">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        Produtos do fornecedor ({formatarNumero(lista.length, 0)})
      </p>
      <table className="w-full text-[11px]">
        <thead className="text-muted-foreground">
          <tr>
            <th className="py-1 text-left font-medium">Produto</th>
            <th className="py-1 text-right font-medium">Qtd</th>
            <th className="py-1 text-right font-medium">Venda</th>
            <th className="py-1 text-right font-medium">Lucro</th>
            <th className="py-1 text-right font-medium">Margem</th>
          </tr>
        </thead>
        <tbody>
          {lista.slice(0, 25).map((produto) => (
            <tr key={produto.codigo} className="border-t border-border/40">
              <td className="py-1 pr-2">{produto.produto}</td>
              <td className="num py-1 text-right">{formatarNumero(produto.quantidade, 2)}</td>
              <td className="num py-1 text-right">{formatarMoeda(produto.venda)}</td>
              <td className={`num py-1 text-right ${produto.lucro < 0 ? "text-negativo" : ""}`}>
                {formatarMoeda(produto.lucro)}
              </td>
              <td className="num py-1 text-right">
                {produto.margem === null ? "—" : formatarPercentual(produto.margem, 1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {lista.length > 25 ? (
        <p className="text-[10.5px] text-muted-foreground">
          Mostrando 25 de {formatarNumero(lista.length, 0)} produtos.
        </p>
      ) : null}
    </div>
  );
}
