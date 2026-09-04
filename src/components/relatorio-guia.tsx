"use client";

import {
  Info,
  Lightbulb,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Guia "Como ler este relatório" — camada de explicação da Central de
 * Relatórios. Cada relatório tem: um resumo (o que mostra), como ler
 * (o que observar primeiro) e dicas de ação (o que fazer com o achado).
 */

export interface GuiaRelatorio {
  /** Resumo em 1-2 frases — o que este relatório mostra */
  resumo: string;
  /** Pontos de atenção — o que observar primeiro nos números */
  comoLer: string[];
  /** Dica de ação — decisão que o achado pode apoiar */
  dica?: string;
  /** Termos do relatório que merecem explicação (termo -> definição) */
  glossario?: { termo: string; definicao: string }[];
}

export const GUIAS_RELATORIOS: Record<string, GuiaRelatorio> = {
  "curva-abc": {
    resumo:
      "Ordena os produtos pelo faturamento do período e os divide em classes A, B e C (Pareto). Classe A = poucos produtos que geram a maior parte da receita.",
    comoLer: [
      "Classe A (≈80% do faturamento): são os produtos que sustentam a operação — falta deles no estoque derruba a venda do dia.",
      "Classe C (≈5%): muitos itens com baixíssima participação — avalie se vale manter todos em estoque ou se há itens parados.",
      "Compare com o volume de itens: um produto classe A em faturamento pode ter poucas unidades vendidas (alto valor) ou muitas (alto giro).",
    ],
    dica: "Use a classe A como base para reposição prioritária e para negociar com fornecedores (são os itens que mais movimentam).",
    glossario: [
      { termo: "Curva ABC / Pareto", definicao: "Método 80/20: uma minoria dos produtos concentra a maior parte do faturamento." },
      { termo: "Faturamento líquido", definicao: "Valor final da venda já com desconto abatido (e frete/outros somados)." },
      { termo: "Dependência do portfólio (Top 10/20)", definicao: "% da receita concentrada nos 10 e nos 20 produtos mais vendidos. Acima de 80% no Top 20, o resultado depende de poucos itens." },
      { termo: "Produtos em alta", definicao: "Produtos que venderam nos dois períodos (atual e anterior) e tiveram o maior crescimento de receita em R$ no atual." },
    ],
  },
  clientes: {
    resumo:
      "Mostra a concentração da receita por cliente, quantos clientes são recorrentes e o peso dos maiores compradores no total.",
    comoLer: [
      "Se poucos clientes representam grande parte do faturamento, a operação depende muito deles — a perda de um único cliente seria sentida.",
      "Clientes recorrentes (que compram em mais de um período) são a base saudável; clientes de evento único indicam venda de oportunidade.",
      "Na base PDV, o cliente 'CONSUMIDOR' concentra o balcão — a análise de concentração ganha sentido principalmente nas vendas faturadas (convênio/NF-e).",
    ],
    dica: "Para os clientes Top, avalie criar condições específicas (prazo, tabela) — são os que mais garantem previsibilidade de receita.",
    glossario: [
      { termo: "Cliente recorrente", definicao: "Cliente que comprou em mais de um período/ocasião dentro da amostra." },
      { termo: "Ticket médio por cliente", definicao: "Quanto, em média, o cliente gasta por nota no período." },
      { termo: "Concentração Top 20", definicao: "% do faturamento concentrado nos 20 maiores clientes — mede a dependência da receita em poucos compradores." },
      { termo: "Frequência média de compra", definicao: "Pedidos/NF do período ÷ clientes cadastrados ativos (exclui consumidor de balcão). Quantas vezes, em média, cada cliente compra." },
      { termo: "Clientes novos", definicao: "Compraram no período atual e não haviam comprado no período anterior equivalente." },
      { termo: "Clientes recorrentes entre períodos", definicao: "Compraram no período atual e também no anterior — a base que garante previsibilidade de receita." },
      { termo: "Visão sintética", definicao: "Ranking consolidado: uma linha por cliente com totais do período." },
      { termo: "Visão analítica", definicao: "Detalhe por nota/NF do período, filtrável por cliente — mostra o que compõe os números do ranking." },
    ],
  },
  descontos: {
    resumo:
      "Mede o desconto concedido sobre o faturamento, por vendedor e por departamento — ou seja, quanto de margem está sendo 'cedida' na negociação.",
    comoLer: [
      "Uma taxa de desconto alta em um vendedor pode indicar negociação agressiva ou falta de autoridade de preço — compare com os colegas.",
      "Departamentos com desconto recorrente podem ter preço de tabela acima do mercado ou sofrer pressão de concorrência.",
      "Desconto médio saudável costuma ficar abaixo de 5% do faturamento — acima disso, verifique se a margem ainda cobre os custos.",
    ],
    dica: "Vendedor com taxa de desconto muito acima da média é candidato a treinamento de negociação ou revisão da política de preços.",
    glossario: [
      { termo: "Taxa de desconto", definicao: "Total de desconto concedido ÷ faturamento líquido, em %. Quanto menor, melhor para a margem." },
    ],
  },
  sazonalidade: {
    resumo:
      "Revela o padrão de venda ao longo do tempo: quais dias da semana vendem mais e como o período se compara com a quinzena anterior.",
    comoLer: [
      "Dias da semana com pico indicam quando reforçar equipe e estoque; dias fracos indicam onde caberia uma ação de ativação.",
      "A comparação quinzenal mostra se o negócio está crescendo, estável ou caindo — olhe a tendência, não só o número isolado.",
    ],
    dica: "Escale a operação (caixa, reposição) pelos dias de maior movimento e reserve ações promocionais para os dias fracos.",
    glossario: [
      { termo: "Sazonalidade", definicao: "Padrão de variação das vendas por dia da semana, quinzena ou época." },
    ],
  },
  departamentos: {
    resumo:
      "Detalha o faturamento por departamento/categoria, com os itens que compõem cada um — mostra o mix de produtos do negócio.",
    comoLer: [
      "Departamentos com maior faturamento são o coração do negócio; os menores podem ser complemento ou oportunidade não explorada.",
      "Um departamento com muitos itens mas pouco faturamento pode ter estoque disperso demais.",
    ],
    dica: "Use o mix para decidir onde concentrar estoque, espaço e verba de compra.",
    glossario: [
      { termo: "Mix de vendas", definicao: "Proporção da receita vinda de cada departamento/categoria." },
      { termo: "Visão sintética", definicao: "Uma linha por departamento, com quantidade de produtos, volume e faturamento." },
      { termo: "Visão analítica", definicao: "Uma linha por produto dentro dos departamentos, para identificar quais itens compõem o resultado." },
    ],
  },
  vendedores: {
    resumo:
      "Ranking da equipe: faturamento, ticket médio, quantidade de vendas e taxa de desconto de cada vendedor.",
    comoLer: [
      "Olhe o ticket médio junto do faturamento: vendedor com ticket alto vende melhor o valor, não só o volume.",
      "Cruzando com a taxa de desconto, identifica-se quem vende mantendo margem e quem 'compra' a venda com desconto.",
    ],
    dica: "Metas individuais fazem mais sentido quando consideram o perfil de cada um (balcão vs. venda direta).",
    glossario: [
      { termo: "Ticket médio", definicao: "Faturamento ÷ número de notas (vendas) do vendedor no período." },
      { termo: "Visão sintética", definicao: "Ranking consolidado: uma linha por vendedor com totais do período." },
      { termo: "Visão analítica", definicao: "Detalhe por nota/NF do período, filtrável por vendedor — mostra o que compõe os números do ranking." },
    ],
  },
  geografico: {
    resumo:
      "Distribui as vendas por cidade/UF e mostra o frete rateado — de onde vêm os clientes e quanto custa atendê-los.",
    comoLer: [
      "Concentração em poucas cidades significa mercado regional dependente — expansão passa por diversificar praças.",
      "Frete alto em cidades distantes pode elevar o custo de atendimento de pedidos pequenos — avalie valor mínimo de pedido por região.",
    ],
    dica: "Se uma praça distante gera pouco faturamento e muito frete, considere política de entrega mínima ou parceiro logístico local.",
    glossario: [
      { termo: "UF", definicao: "Unidade Federativa do endereço do cliente, obtida do campo cliente_uf da API. Registros sem UF são agrupados como '—'." },
      { termo: "Visão por UF", definicao: "Faturamento, pedidos, clientes e cidades consolidados por estado; clique em uma UF para detalhar suas cidades." },
      { termo: "Visão por cidade", definicao: "Detalhamento das cidades do período, opcionalmente limitado a uma UF selecionada." },
      { termo: "Visão sintética", definicao: "Resumo agregado em uma linha por UF ou cidade." },
      { termo: "Visão analítica", definicao: "Detalhe no nível da nota fiscal, filtrável por cidade." },
    ],
  },
  financeiro: {
    resumo:
      "Separa o faturamento por forma de pagamento e por tipo de documento fiscal (NF-e vs. NFC-e), além de ICMS-ST e frete.",
    comoLer: [
      "Forma de pagamento dominante indica o perfil do cliente (cartão/pix = balcão; convênio = venda faturada).",
      "NF-e (modelo 55) = venda direta/faturada; NFC-e (modelo 65) = venda de balcão. A proporção entre elas define o tipo de operação.",
      "ICMS-ST alto sinaliza produtos com substituição tributária (ex.: muitos itens de limpeza/industrializados) — não é receita da empresa, é imposto repassado.",
    ],
    dica: "Se o convênio/NF-e é relevante, a gestão de prazo e inadimplência merece tanta atenção quanto a venda de balcão.",
    glossario: [
      { termo: "NF-e (modelo 55)", definicao: "Nota Fiscal eletrônica — venda faturada (empresa para empresa)." },
      { termo: "NFC-e (modelo 65)", definicao: "Nota de balcão/consumidor final (PDV), emitida no caixa." },
      { termo: "ICMS-ST", definicao: "Imposto com Substituição Tributária — recolhido antecipadamente; aparece no item mas não é receita da loja." },
      { termo: "Frete, seguro e outros acréscimos", definicao: "Valores informados nos itens da NF que compõem o valor final da venda; são exibidos separadamente para conferência." },
      { termo: "Forma de pagamento", definicao: "Meio informado na nota fiscal, como Pix, cartão, dinheiro ou faturado. Mede o mix declarado, não liquidação financeira." },
      { termo: "PDV", definicao: "Ponto de Venda — operação de balcão, com cupom fiscal." },
    ],
  },
};

/** Termos exibidos no Panorama do período (comuns a todos os relatórios). */
const TERMOS_PANORAMA = [
  { termo: "Faturamento", definicao: "Valor final das vendas do período, com descontos abatidos e frete/seguro/outros somados." },
  { termo: "Pedidos / NF", definicao: "Quantidade de notas fiscais emitidas no período — cada documento conta como uma venda." },
  { termo: "Ticket médio", definicao: "Faturamento do período ÷ número de notas. Valor médio de cada venda." },
  { termo: "Clientes ativos", definicao: "Clientes distintos que compraram no período, incluindo consumidor de balcão." },
  { termo: "Variação vs. período anterior", definicao: "Comparação com o período de mesma duração imediatamente anterior ao selecionado. Mostra crescimento (+) ou queda (−) em %." },
];

// Todo relatório usa o Panorama, então todo guia ganha os termos correspondentes.
for (const guia of Object.values(GUIAS_RELATORIOS)) {
  const existentes = new Set((guia.glossario ?? []).map((item) => item.termo));
  guia.glossario = [
    ...(guia.glossario ?? []),
    ...TERMOS_PANORAMA.filter((item) => !existentes.has(item.termo)),
  ];
}

/** Tooltip inline para explicar termos no cabeçalho de tabelas/cards */
export function TermoExplicado({
  termo,
  definicao,
  icone: Icone = Info,
}: {
  termo: string;
  definicao: string;
  icone?: LucideIcon;
}) {
  return (
    <span className="group relative inline-flex cursor-help items-center gap-1 border-b border-dotted border-muted-foreground/50">
      {termo}
      <Icone className="size-3 text-muted-foreground/70" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-[100] mb-2 hidden w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2 whitespace-normal rounded-lg border border-border bg-popover p-3 text-[11px] font-normal leading-relaxed text-popover-foreground shadow-xl group-hover:block">
        {definicao}
      </span>
    </span>
  );
}

/** Glossário recolhível — listado no rodapé do conteúdo de cada relatório */
export function GlossarioRelatorio({
  itens,
  guia,
  relatorioLabel,
}: {
  itens: { termo: string; definicao: string }[];
  guia: GuiaRelatorio;
  relatorioLabel: string;
}) {
  return (
    <details open className="mt-4 rounded-lg border border-border/60 bg-muted/20 p-3 open:pb-3">
      <summary className="flex cursor-pointer select-none items-center gap-2 text-xs font-bold text-muted-foreground">
        <HelpCircle className="size-3.5" />
        Como interpretar e definições — {relatorioLabel}
      </summary>
      <div className="mt-3 space-y-4">
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
            <Lightbulb className="size-3.5" />
            Como interpretar este relatório
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{guia.resumo}</p>
          <ul className="space-y-1">
            {guia.comoLer.map((item) => (
              <li key={item} className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-primary/60" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {guia.dica ? (
            <div className="rounded-md bg-amber-500/10 px-2 py-1.5 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
              <span className="font-bold">💡 Dica: </span>{guia.dica}
            </div>
          ) : null}
        </section>
        {itens.length > 0 ? (
          <section className="border-t border-border/60 pt-3">
            <h3 className="mb-2 text-xs font-bold text-foreground">Definições dos termos</h3>
            <dl className="space-y-1.5">
              {itens.map((item) => (
                <div key={item.termo} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                  <dt className="shrink-0 text-xs font-semibold text-foreground sm:w-44">{item.termo}</dt>
                  <dd className="text-xs leading-relaxed text-muted-foreground">{item.definicao}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </div>
    </details>
  );
}
