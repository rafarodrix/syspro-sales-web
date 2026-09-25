# Padrão de evolução do dashboard

Este documento registra as decisões de interface aplicadas ao dashboard para que novas abas mantenham o mesmo padrão sem duplicar regras.

## Ordem da experiência

1. Contexto: empresa, período consultado e última atualização.
2. Consulta: presets de período, datas manuais, comparação e exportação.
3. Resumo: KPIs principais e variações contra o período anterior.
4. Diagnóstico: indicadores de eficiência e leitura rápida.
5. Exploração: evolução temporal, rankings e detalhamento.

## Regras de interação

- Toda consulta deve aceitar o botão **Consultar** e a tecla `Enter` nos campos de data.
- Enquanto a API responde, os controles de consulta ficam desabilitados e o conteúdo principal usa skeletons.
- Resultado vazio deve explicar o que ocorreu e oferecer nova consulta, sem renderizar gráficos vazios como se fossem dados válidos.
- Filtros ativos devem permanecer visíveis junto ao contexto da consulta.
- Exportações devem respeitar exatamente o período e a empresa atualmente consultados.

## Regras visuais

- KPIs usam valor principal grande, unidade/subtítulo curto e comparação claramente separada.
- A cor não pode ser o único sinal de tendência; sempre usar texto ou ícone.
- Cards de análise devem usar a mesma escala de espaçamento, borda e raio dos componentes de `src/components/ui`.
- Em telas pequenas, o conteúdo deve empilhar sem esconder o contexto ou exigir zoom.
- Tabelas devem usar rolagem horizontal controlada e manter busca, ordenação e paginação acessíveis.

## Componentes de referência

- `src/components/date-range-filter.tsx`: presets, datas manuais e consulta por teclado.
- `src/components/kpi-card.tsx`: indicador com comparação, tendência e sparkline.
- `src/components/feedback-state.tsx`: erro e estado vazio padronizados.
- `src/components/data-filter-bar.tsx`: busca, filtros e limpeza em tabelas.
- `src/components/dashboard-view.tsx`: composição da visão executiva.

Antes de criar um novo componente, verificar se uma variante desses componentes resolve o caso. Isso evita cópia de markup e mantém a experiência consistente entre Dashboard, Vendas e Relatórios.
