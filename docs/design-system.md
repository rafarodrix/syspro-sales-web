# Design System — SysproERP Reports (Trilink)

Documento oficial de UI/UX do **SysproERP Reports**. Referência de **arquitetura visual**: Design System do AutoCar (mesma stack: Next 16, React 19, Tailwind 4, shadcn/Radix, Recharts, Motion). **Identidade visual: Syspro** — copiamos padrões e disciplina, não cores nem CSS.

> Regra de ouro: este documento manda. Componente novo que divergir daqui precisa atualizar este arquivo primeiro.

---

## 1. Princípios

1. **Densidade > decoração.** A tela é ferramenta de trabalho: mais linhas visíveis, menos contorno, sombra e card.
2. **Um componente por papel.** Existe *uma* forma de mostrar métrica, *uma* de mostrar tabela, *uma* de filtrar. Variação é prop, não cópia.
3. **Número alinhado é número legível.** Toda coluna numérica usa `tabular-nums` (classe `.num`), alinhada à direita.
4. **Contexto sempre visível.** Empresa + período consultado aparecem juntos e permanecem ao rolar.
5. **Detalhe não empurra conteúdo.** Detalhamento abre em drawer/painel lateral ou em linha expansível *fixa à esquerda*; nunca esconde a ação na última coluna.
6. **Sem KPI duplicado.** Se a página já mostra Faturamento/Pedidos/Ticket/Margem, a aba não repete.
7. **Gráfico só responde pergunta de negócio.** Relatório é tabular; gráfico vive em dashboard.
8. **Cor nunca é o único sinal.** Tendência tem seta/sinal além da cor (acessibilidade).

---

## 2. Tokens

Valores ficam em `src/app/globals.css`. Componentes usam **token semântico**, nunca hex.

### 2.1 Cores (papel → token → valor)

| Papel | Token | Claro | Escuro |
| --- | --- | --- | --- |
| Fundo da aplicação | `--background` | `oklch(0.99 0 0)` | `oklch(0.13 0.01 260)` |
| Superfície (card/tabela) | `--card` | `oklch(1 0 0)` | `oklch(0.17 0.015 260)` |
| Superfície secundária | `--muted` | `oklch(0.965 0 0)` | `oklch(0.22 0.01 260)` |
| Borda | `--border` | `oklch(0.91 0 0)` | `oklch(1 0 0 / 12%)` |
| Borda forte | `--borda-forte` | mistura de `--border` + `--foreground` | idem |
| Texto | `--foreground` | `oklch(0.145 0 0)` | `oklch(0.98 0 0)` |
| Texto secundário | `--muted-foreground` | `oklch(0.5 0 0)` | `oklch(0.72 0 0)` |
| Primária (ação) | `--primary` | `oklch(0.488 0.243 264.376)` | `oklch(0.65 0.2 264.376)` |
| Sucesso / favorável | `--positivo` | `oklch(0.55 0.13 155)` | `oklch(0.76 0.15 155)` |
| Atenção | `--atencao` | `oklch(0.7 0.14 80)` | `oklch(0.8 0.14 80)` |
| Erro / negativo | `--negativo` | `oklch(0.56 0.19 25)` | `oklch(0.72 0.17 25)` |
| Divisor hairline | `--linha` | `oklch(0.91 0 0)` | `oklch(1 0 0 / 10%)` |

### 2.2 Tipografia

- Fonte: `--font-sans` (system-ui). Mono para códigos: `--font-mono`.
- Escala (px): `10.5` rótulo de KPI · `11.5` apoio · `12.5` corpo de tabela · `13.5` corpo · `16` título de bloco · `22` valor de KPI.
- Peso: 400 dado · 500 nome · 600 rótulo · 700 valor/título.
- Nunca `text-[13px]` solto: use a escala (`text-xs`, `text-[11px]` só via componente).

### 2.3 Espaçamento, raio e sombra

- Grade de 4 px: 4 · 8 · 12 · 16 · 24 · 32.
- Raio: `--raio-sm` 8 · `--raio-md` 10 · `--raio-lg` 14.
- Sombra: no máximo `shadow-2xs` em superfície elevada (menu, popover). Tabela e card não usam sombra.

---

## 3. Componentes oficiais

| Papel | Componente | Status |
| --- | --- | --- |
| Cabeçalho de página | `components/ui/page-header.tsx` | **A criar (UX03)** |
| Consulta + filtros | `AnalysisQueryCard` + `DateRangeFilter` | Existe — unificar em `SearchToolbar` (UX06) |
| Filtro de campo único | `relatorios/filtro-relatorio.tsx` | Padrão aprovado (28 usos) |
| Busca em tabela | `DataFilterBar` | Padrão aprovado (7 usos) |
| Tabela analítica | `relatorios/report-table.tsx` | **Padrão oficial** (15 usos) |
| Tabela simples (config/usuários) | `ui/table.tsx` | Restrito a CRUD, nunca a relatório |
| Métrica de topo | `analytics/metrics-strip.tsx` | Padrão oficial |
| Métrica de destaque | `analytics/action-metric-card.tsx` | Só dashboard |
| Faixa de resumo de relatório | `relatorios/report-toolbar.tsx` (`ReportMetricStrip`) | Padrão oficial |
| Alternância de visão | `relatorios/report-view-toggle.tsx` | Padrão oficial |
| Detalhe de registro | `renderDetalhe` do `ReportTable` (chevron à esquerda) | Padrão oficial; drawer é evolução (UX09) |
| Estado vazio/erro | `feedback-state.tsx` | Padrão oficial |
| Carregamento | `ui/skeleton.tsx` | Usar por bloco, nunca spinner de página |
| Exportação | `export-dropdown.tsx` (+ `ExportExtra`) | Padrão oficial — nada de botão solto |

### 3.1 Regras de tabela (`ReportTable`)

1. Primeira coluna = identificação e **sticky**; com detalhe, o chevron vem **antes** dela (`detalhePrimeiraColuna`).
2. Toda coluna declara `kind` (`name`, `number`, `currency`, `percent`, `date`, `month`) — isso define alinhamento e formato de export.
3. Exportar sempre reflete **a coleção filtrada completa**, não a página.
4. Máximo prático: **8 colunas visíveis** por padrão; o resto atrás de *Colunas* (persistido em `hiddenColumnIds`).
5. Cabeçalho fixo ao rolar (o `Card` pai **não** pode ter `overflow-hidden`).
6. Nenhum totalizador próprio: o rodapé é o padrão do componente.

### 3.2 Regras de filtro

1. Período + empresa no topo, persistidos; trocar de aba não perde o recorte.
2. Filtros da visão ficam na barra do relatório, nunca dentro do cabeçalho da tabela.
3. Filtro aplicado aparece como **chip removível** (UX06).
4. Ordenação, densidade e visibilidade de coluna são locais: **não** consultam a API.

---

## 4. Auditoria atual (UX01)

Medido em 2026-11-26 sobre `src/` (215 arquivos TS/TSX, 82 componentes):

| Sintoma | Número |
| --- | --- |
| Tamanhos de fonte arbitrários (`text-[Npx]`) | **172** ocorrências em 36 arquivos |
| `rounded-*` / `shadow-*` / `border` / `bg-muted/*` dispersos | 149 / 65 / 80 / 92 |
| Componentes de métrica diferentes | **8** (`kpi-card`, `action-metric-card`, `metrics-strip`, `report-metric-strip`, `ranking-card`, `pie-chart-card`, `estoque-metricas`, `ui/card`) |
| Formas de filtrar | **4** (`date-range-filter`, `filtro-relatorio`, `data-filter-bar`, `analysis-query-card`) |
| `<table>` fora do `ReportTable` | **7** arquivos |
| `<h1>` (cabeçalho não padronizado) | 5 arquivos |
| Relatório com mais de 20 colunas | Análise de Compras (22) |
| Relatório com 13 colunas | Fornecedores/Carteira |

**Conclusão:** a base funcional está boa; o custo está em **repetição de primitivas** e **densidade vertical** (250–300 px antes do primeiro dado).

---

## 5. Roadmap UX (entrega/Syspro Reports)

| Código | Entrega | Prioridade | Status |
| --- | --- | --- | --- |
| UX01 | Auditoria da interface | P0 | ✅ concluída (seção 4) |
| UX02 | Design tokens e temas | P0 | ✅ tokens semânticos em `globals.css` (seção 2) |
| UX03 | Layout principal e sidebar recolhível | P0 | ⏳ |
| UX04 | Componentes compartilhados (`PageHeader`, `EmptyState` único) | P0 | ⏳ |
| UX05 | Motor visual de tabelas | P0 | ✅ `ReportTable` (colunas essenciais pendente) |
| UX06 | Motor de filtros (`SearchToolbar` + chips) | P0 | ⏳ |
| UX07 | **Relatório piloto: Vendas** | P0 | ⏳ |
| UX08 | Indicadores e dashboards | P1 | ⏳ |
| UX09 | Gráficos e drill-down (drawer de contexto) | P1 | ⏳ |
| UX10 | Loading, erro e vazio padronizados | P1 | parcial (`FeedbackState`) |
| UX11 | Responsividade e acessibilidade | P1 | ⏳ |
| UX12 | Performance de interface (cache, skeleton por bloco) | P1 | parcial (`useConsulta`) |
| UX13 | Remoção de legado (8 metric cards → 2) | P1 | ⏳ |
| UX14 | Documentação + skill do projeto | P0 | ✅ este arquivo + `.skills/syspro-reports-design-system` |

### 5.1 Piloto UX07 — escopo fechado

1. `PageHeader` compacto: título + empresa + período + `Consultar` em **uma linha**.
2. Filtros em `SearchToolbar`: busca + chips, sem card de consulta gigante.
3. Tabela com **8 colunas essenciais**; resto em *Colunas*.
4. Detalhe da NF em drawer lateral (não expandir linha).
5. Estados: skeleton por bloco, vazio com próxima ação, erro com retry.
6. Critério de aceite: cabeçalho ≤ 120 px, tabela sem rolagem horizontal em 1440 px, exportações idênticas em conteúdo.

---

## 6. Governança

- Toda tela nova usa os componentes da seção 3. Componente que já existe **não** é recriado.
- Alterou padrão? Atualiza este arquivo **e** a skill antes do commit.
- `npx tsc --noEmit` + `npm test` + `bash scripts/deploy-local.sh --no-pull` antes de considerar pronto.
- Comparação antes/depois obrigatória em mudança de layout (print + medida de altura/largura).
