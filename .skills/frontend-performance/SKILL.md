---
name: frontend-performance
description: Use ao escrever ou revisar React 19 e Next 16 no SysproERP Reports, especialmente telas analíticas, bundle, renderização e data fetching.
---

# Performance de frontend

Antes de alterar APIs do framework, leia o guia correspondente em `node_modules/next/dist/docs/`.

## Decisões do projeto

- Páginas e layouts ficam como Server Components. Marque somente a menor fronteira interativa com `"use client"`.
- Não serialize o mesmo conjunto de vendas para múltiplos componentes. Passe somente campos necessários ou resultados agregados.
- Consultas independentes começam juntas; use `Promise.all`. Consultas Syspro devem preservar limites de concorrência.
- Abas analíticas e exportadores pesados são carregados com `next/dynamic` quando não participam da primeira tela.
- Evite `useEffect` para estado derivado. Cálculos caros usam funções puras testadas e `useMemo` apenas quando o custo justificar.
- Listas grandes usam paginação, `content-visibility` ou virtualização; não renderize milhares de linhas de uma vez.
- Novos arquivos de domínio não devem virar agregadores genéricos. Ao tocar em `lib/vendas.ts`, prefira extrair um domínio coeso mantendo reexports durante a migração.

## Verificação

Rode `npm run check`, `npm run build` e o fluxo Playwright afetado. Compare chunks do build quando adicionar biblioteca ou aba pesada.
