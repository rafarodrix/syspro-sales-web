---
name: syspro-reports-design-system
description: Use when building or changing UI in SysproERP Reports (layout, table, filter, metric, empty state).
---

# Design System — SysproERP Reports

Fonte de verdade: **`docs/design-system.md`**. Esta skill é o resumo executável; se divergir, o doc vence e o doc deve ser atualizado.

Referência de **arquitetura visual**: Design System do AutoCar (mesma stack). Identidade continua **Syspro** — não copiar cores, CSS ou bibliotecas do AutoCar.

## Antes de criar componente

Pergunte: **já existe um componente com esse papel?** Catálogo oficial:

| Papel | Use |
| --- | --- |
| Cabeçalho de página | `components/ui/page-header.tsx` |
| Barra de consulta/filtros | `components/ui/search-toolbar.tsx` |
| Filtros secundários | `components/ui/filtros-popover.tsx` |
| Chips de filtro ativo | `components/ui/filtros-ativos.tsx` |
| Tabela de relatório | `components/relatorios/report-table.tsx` |
| Métrica de topo | `components/analytics/metrics-strip.tsx` |
| Faixa de resumo | `ReportMetricStrip` (`relatorios/report-toolbar.tsx`) |
| Alternar visão | `relatorios/report-view-toggle.tsx` |
| Filtro de campo | `relatorios/filtro-relatorio.tsx` |
| Busca na tabela | `components/data-filter-bar.tsx` |
| Período | `components/date-range-filter.tsx` |
| Vazio/erro | `components/feedback-state.tsx` |
| Exportar | `components/export-dropdown.tsx` (+ `ExportExtra`) |
| Carregando | `components/ui/skeleton.tsx` |

Se falta um papel novo (ex.: `PageHeader`), crie **um** componente em `components/ui/` e registre no catálogo do doc.

## Regras que não se negociam

1. **Sem KPI duplicado**: a página já mostra Faturamento/Pedidos/Ticket/Margem; aba não repete.
2. **Gráfico só em dashboard** — relatório é tabular.
3. **Máx. 8 colunas visíveis** por padrão; resto em *Colunas* (`hiddenColumnIds`).
4. **Chevron de detalhe à esquerda** (`detalhePrimeiraColuna`) em tabela larga; nunca na última coluna.
5. **Sem totalizador próprio** — rodapé é o do `ReportTable`.
6. **Filtro de visão fica na barra do relatório**, não no cabeçalho da tabela; ordenação/densidade não consultam a API.
7. **Exportação** sempre no dropdown, nunca botão solto; reflete a coleção filtrada completa.
8. **Cores só por token** (`--positivo`, `--negativo`, `--atencao`, `--border`…). Nunca hex no componente.
9. **Números**: classe `.num` (tabular), alinhados à direita; `kind` da coluna define alinhamento e export.
10. **Texto**: escala fixa (10,5 / 11,5 / 12,5 / 13,5 / 16 / 22). Evite `text-[13px]` novo.
11. **Card com `overflow-hidden`** mata `position: sticky` — use `overflow-visible` no pai do cabeçalho fixo.
12. **Um `<h1>` por página**; título de bloco em `h2`/`CardTitle`.

## Checagem antes do commit

```bash
npx tsc --noEmit
npm test
bash scripts/deploy-local.sh --no-pull
```

Layout mudou? Anexe **antes/depois** e meça: altura até o primeiro dado, colunas visíveis, `scrollWidth ÷ innerWidth` da tabela (meta ≤ 1,0 em 1440 px).

## Armadilhas já pagas

- Preferência de coluna salva como *visíveis* escondia coluna nova → guardar `hiddenColumnIds` e só gravar depois de carregar a preferência da tabela (`chaveCarregada`).
- Header sticky sumia por causa de `overflow-hidden` do `Card`.
- Chevron de detalhe na última coluna exigia rolar a tabela para achar → `detalhePrimeiraColuna`.
- `ReportTable` esticado por 13+ colunas: revisar `kind` e mover colunas para *Colunas* antes de adicionar outra.
