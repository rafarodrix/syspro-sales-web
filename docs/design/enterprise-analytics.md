# SysproERP Reports — guia de estilo Enterprise Analytics

Documento normativo. Vale para toda tela nova e para o que for sendo tocado nas antigas.

## Princípios

1. **O número é o herói.** Espaço, tamanho e alinhamento servem ao dado. Ícone decorativo, gradiente e sombra competem com ele e saem.
2. **Borda é exceção.** Separe por espaço e por hairline (1px), não por caixas. Uma tela não deve parecer uma grade de retângulos.
3. **Cor só com significado.** Dado é neutro (texto/foreground). Verde = favorável, vermelho = alerta, âmbar = em andamento. Nunca usar cor para "deixar bonito".
4. **Todo número grande tem contexto.** Ao lado do valor, a comparação com o período anterior e o que ela significa.
5. **Comparação explica variação.** Nunca mostrar "+12%" sem dizer contra o quê.

## Tipografia e números

| Papel | Regra |
| --- | --- |
| Rótulo de indicador | 10,5–11px, `uppercase`, `tracking-[0.08em]`, `text-muted-foreground` |
| Valor principal | 22–26px, `font-semibold`, `leading-none`, `.num` |
| Apoio (período anterior, unidade) | 11px, `text-muted-foreground`, mesma família |
| Delta | 11,5px, `font-semibold`, cor semântica, seta de 12px |

**Números tabulares obrigatórios** em qualquer coluna de valor (`.num`): `font-variant-numeric: tabular-nums`. Sem isso, as colunas dançam a cada linha atualizada. Já existia em 12 lugares; a meta é 100% das tabelas e indicadores.

## Superfícies

- Painel novo: `border-t border-linha pt-3` (hairline no topo) ou `.superficie` (`bg-muted/45`, sem contorno).
- Proibido em indicador: `bg-gradient-*`, `shadow-*`, `ring-1` envolvendo cada célula, `hover:scale/rotate` no conteúdo do dado.
- `Card` do shadcn continua valendo para blocos com conteúdo próprio (tabela, gráfico) — sem `border` extra nem `shadow` além do `ring` que ele já tem.

## Gráficos (Recharts) — somente no Dashboard

Escolha pelo tipo de pergunta, não pela aparência:

| Pergunta | Gráfico |
| --- | --- |
| Como evoluiu no tempo? | linha / área (sem área cheia em séries sobrepostas) |
| Quem puxou o resultado? | barras horizontais ordenadas |
| Como se distribui? | barras empilhadas; pizza só até 4 fatias |
| Estamos acima ou abaixo do período anterior? | linha atual + linha de referência tracejada |

**Onde gráfico é permitido:** apenas no Dashboard. Relatórios (`/relatorios/*`, Vendas & Margem, Sazonalidade, Compras, Entrega) são **tabulares**: quem precisa de leitura visual usa o Dashboard ou uma aba nova de Dashboard por tema. Gráfico em relatório concorre com a tabela e come a dobra.

Regras técnicas: `CartesianGrid` só horizontal em `var(--linha)`; sem eixo Y duplicado; tooltip com fundo `var(--popover)` e `boxShadow: none`; animação desligada (`isAnimationActive={false}`) para não "piscar" ao atualizar dados; clique no ponto dispara drill-down. Componentes em `src/components/analytics/grafico.tsx`.

## Estados

- **Carregando:** skeleton com o formato do conteúdo (barra de rótulo + barra de valor), sem spinner de página inteira. Só na primeira carga — com dado em cache, a tela abre preenchida (ver `useConsulta`).
- **Atualizando:** mantém o conteúdo na tela e sinaliza no cabeçalho ("Atualizando..."), sem esvaziar a área.
- **Vazio:** diz o que fazer ("Ajuste o período ou selecione outra empresa"), nunca só "Nenhum dado".

## Stack

| Camada | Hoje | Decisão |
| --- | --- | --- |
| Componentes | shadcn/ui (radix) | mantém — base de botão, dialog, select, tabela |
| Gráficos | SVG escrito à mão (1.089 linhas em 4 arquivos) | **Recharts** (adotado): tooltip, eixo, responsivo e drill-down sem manter matemática de coordenadas |
| Animação | tw-animate-css | **Motion** instalado, uso pontual (entrada de painel, transição de número). Respeitar `prefers-reduced-motion` |
| Tabela | `ReportTable` próprio (ordenação, paginação, export, linha expansível, exportação pt-BR) | **TanStack Table: postergado.** Migrar agora custa regressão em 5 telas para ganhar recurso que já existe. Reavaliar quando precisarmos de agrupamento/coluna virtualizada |
| Dados no cliente | `useConsulta` (cache + dedupe + TTL) | **TanStack Query: postergado.** Uma única consulta pesada no cliente hoje. Quando houver 3+, trocar a implementação do hook (mesma API) |
| Blocos prontos | — | **Kibo UI: referência, não dependência.** Copiar bloco quando resolver, em vez de arrastar registro inteiro |

## Contraste e acessibilidade

Verde/vermelho de estado passam por `--positivo`/`--negativo` (oklch, tema claro e escuro). Nunca usar cor como único sinal: o delta sempre leva seta e o texto do percentual.

## Checklist de tela nova

- [ ] Nenhum cartão decorativo em volta de número
- [ ] `.num` em toda coluna de valor
- [ ] Delta com valor do período anterior visível
- [ ] Gráfico escolhido pela pergunta (tabela acima) e clicável quando fizer sentido
- [ ] Skeleton na primeira carga, conteúdo preservado na atualização
- [ ] Estado vazio com instrução
