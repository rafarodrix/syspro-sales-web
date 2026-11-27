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
| Cabeçalho de página | `components/ui/page-header.tsx` | ✅ oficial (piloto Vendas) |
| Consulta + filtros | `components/ui/search-toolbar.tsx` + `DateRangeFilter` | ✅ oficial; `AnalysisQueryCard` em retirada |
| Filtros secundários | `components/ui/filtros-popover.tsx` | ✅ oficial (popover com contador) |
| Chips de filtro ativo | `components/ui/filtros-ativos.tsx` | ✅ oficial (remoção individual) |
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

## 3.3 Decisões de bibliotecas (Syspro Reports)

Antes de instalar qualquer coisa: **o que já existe no `package.json` resolve?** Instalado hoje: Next 16.3, React 19.2, Tailwind 4, `radix-ui`, `lucide-react`, `recharts` 3, `motion`, `clsx` + `tailwind-merge`, `sonner`, `zod`.

| Biblioteca (referência AutoCar) | Decisão | Motivo |
| --- | --- | --- |
| Tailwind CSS 4 | **usar** (já instalado) | Fundação visual e tokens. |
| Radix UI | **usar** (já instalado) | Menus, dialogs, selects acessíveis. |
| React Aria Components | **não instalar** | Seria a terceira biblioteca de primitivas no projeto (Radix + shadcn). Sem ganho que justifique. |
| shadcn/ui | **usar como padrão** (já instalado) | Base dos componentes em `components/ui`. |
| TanStack Table | **não instalar** | `ReportTable` já entrega ordenação, paginação, preferência de colunas, export e detalhe — e é usado em 15 telas. Migrar seria refactor sem ganho funcional. |
| TanStack Virtual | **avaliar depois** | Hoje paginamos (25/50/100). Só faz sentido quando alguma tela precisar renderizar > 1.000 linhas de uma vez. |
| Recharts 3 | **usar** (já instalado) | Gráficos de dashboard. |
| Apache ECharts | **não instalar** | Dois motores gráficos no bundle sem necessidade comprovada. |
| Motion | **usar com parcimônia** | `motion` já instalado; animação é P2 — só feedback, nunca decoração. |
| Lucide | **usar** (já instalado) | Ícones. |
| Kibo UI / Magic UI | **referência visual** | Padrões para consultar, não dependências. |

Regra: nova dependência de UI exige justificativa escrita aqui e ganho que o componente existente não entrega.

### 3.3.1 Primitivas: Radix hoje, Base UI como default do shadcn

Correção importante: **o shadcn não "trocou" o Radix no nosso projeto.** O shadcn é uma coleção de componentes (código nosso, em `components/ui`), e as primitivas por baixo são escolhidas pelo `style` do `components.json`:

| Style no `components.json` | Primitivas |
| --- | --- |
| `radix-nova` | **Radix UI** ← é o nosso caso |
| `base-nova` | Base UI (default de projetos novos criados pelo CLI hoje) |

Estado real do Syspro Reports:
- `components.json` → `"style": "radix-nova"`.
- Após a Fase 1 da migração (3.3.2), **5 de 17** componentes importam `radix-ui`: `badge`, `button`, `dialog`, `dropdown-menu`, `select`.
- Nenhum import de `@base-ui-components` no projeto.

Decisão: **manter Radix agora.** Migrar para Base UI significa reescrever imports de 8 primitivas, revalidar acessibilidade/animação e re-gerar componentes — custo sem ganho funcional no curto prazo. Reavaliar quando:
1. precisarmos de um componente que só exista na variante Base UI; ou
2. uma atualização do CLI/estilo exigir a migração; ou
3. formos criar um projeto Trilink novo — aí nasce em `base-nova`, e o padrão comum será decidido no Design System Trilink (não neste app).

Regra prática: **não misturar** `radix-*` e `base-*` no mesmo app; import novo de primitiva segue o style já configurado.

### 3.3.2 Migração para Base UI — plano e estado

Posição oficial do shadcn (changelog de julho/2026): **Base UI é o default para projetos novos, mas o Radix não foi depreciado** — todo componente novo/atualizado sai para as duas bibliotecas, e a recomendação é "se seu app funciona, continue entregando". Ainda assim, migrar é possível de forma **progressiva**: um componente por vez, as duas bibliotecas convivem, e o projeto pode parar no meio sem quebrar.

Custo medido no Syspro Reports:

| Item | Quantidade |
| --- | --- |
| Componentes em `components/ui` | 17 |
| Arquivos importando `radix-ui` (antes) | 8 |
| Arquivos importando `radix-ui` (hoje) | **5** |
| Usos de `asChild` (vira `render` no Base UI) | 12 em 7 arquivos |
| Usos de `Separator` / `Tabs` | 0 (componentes mortos) |
| Usos de `Button` / `Badge` / `Label` / `Select` / `Dialog` | 67 / 37 / 28 / 14 / 7 |

Fases:

| Fase | Escopo | Estado |
| --- | --- | --- |
| 1 | Ganhos sem risco: remover `separator` e `tabs` (nunca importados) e migrar `label` para `<label>` nativo | ✅ feito |
| 2 | `dialog`, `dropdown-menu`, `select` — componentes com comportamento; validar foco, escape e animação | ⏳ |
| 3 | `button` e `badge` — `asChild` → `render`; manter `asChild` aceito no wrapper e traduzir internamente para não tocar nas 12 chamadas | ⏳ |

Regras da migração:
1. **Instalar `@base-ui/react` só quando a Fase 2 começar** — não antes; não serve para os componentes atuais.
2. **Um componente por commit**, com `tsc`, testes, deploy e comparação visual.
3. **Nunca** dois imports de primitivas no mesmo componente; nenhum componente novo em Radix a partir da Fase 2.
4. Gatilho para acelerar: quando um desses componentes for alterado por outro motivo, ou quando o padrão comum dos apps Trilink migrar.

### 3.4 Pass enterprise (aparência sóbria)

O que faz uma tela parecer "gerada por IA" não é a biblioteca: é excesso de cor decorativa, escala tipográfica inventada, sombra/raio variados e texto verboso. Regras aplicadas:

1. **Ícones neutros**: ícones de navegação/abas usam `text-muted-foreground` (ativo = `foreground`). Cor em ícone só para estado (sucesso/erro/atenção).
2. **Sem emoji na interface** (nem 🟢/🛑/💡/🏢) — status é badge/pílula com texto.
3. **Card**: `rounded-lg`, borda `border-border/70`, **sem `ring` e sem `overflow-hidden`** (o ring duplicava com borda e o overflow matava sticky).
4. **Escala tipográfica com piso de 11 px** para rótulos e 12 px para dado; nunca `text-[9px]`.
5. **Data sempre pt-BR** (`formatarDataBr`) — ISO só em payload/export.
6. **Contagem pluralizada** (`1 nota` / `12 notas`).
7. **Uma cor de ação** (primária) + semânticas. Nada de violeta/teal/laranja por relatório.

Antes → depois medido:

| Indicador | Antes | Depois |
| --- | --- | --- |
| Cores de ícone na navegação | 9 tons diferentes | 1 (neutro) |
| Tamanhos de fonte distintos | 9 / 9,5 / 10 / 10,5 / 11 / 11,5 | 10 / 11 / 12 / 13 / 16 / 22 |
| Chrome do card | `rounded-xl` + `ring-1` + `overflow-hidden` | `rounded-lg` + `border` |
| Emojis na UI | 3 (+ artefatos em código gerado) | 0 |

### 3.5 Rodapé de tabela, filtro de período e consulta compartilhada

**Rodapé único.** Toda tabela de relatório usa a mesma barra (`ReportTable › resumo`): `TOTAL · N registros · somas`. Não existe mais `TableFooter` montado à mão por tela nem contador solto acima da tabela.

```tsx
<ReportTable
  resumo={(linhas) => ({
    label: `${linhas.length} fornecedores`,
    itens: [{ rotulo: "Lucro", valor: formatarMoeda(...) }],
  })}
/>
```

**Filtro de período em duas linhas.** Linha 1: atalhos + De/Até + Consultar. Linha 2: `Comparar com [modo] · janela anterior · atualizado às HH:MM`. O comparativo nunca aparece em outro bloco da tela.

**Sem repetição de contexto.** O topo não repete empresa nem quantidade de itens (essas informações estão no seletor de empresa e no rodapé). Título de página vem do `PageHeader`; o `AnalysisQueryCard` foi removido.

**Consulta compartilhada.** `buscarVendasApi` grava em `cache-consulta` com chave `recurso=vendas|empresa|inicial|final` (TTL 5 min, dedupe por chave). Navegar entre Vendas, Relatórios e Fornecedores com o mesmo recorte **não** rebate no Syspro. "Forçar atualização" invalida só aquela chave.

---


**Fechamento do relatório.** Indicadores extras e leitura ficam no fim, nunca entre os cards e as tabelas:

```
─────────  LEITURA DO PERÍODO  ─────────
▸ Outros indicadores · mudança de mix     (acordeão: métricas + contribuição)
▸ Como interpretar e definições           (acordeão: glossário do relatório)
```

`ReportDiagnostics` sempre com o prefixo "Outros indicadores · <tema>". Painéis contextuais de uma tabela (ex.: Dependência do portfólio) ficam logo após a própria tabela, em bloco separado.

---


Estrutura fixa do relatório, de cima para baixo:

```
PageHeader
filtros (atalho + dias + datas + comparativo + Consultar)   → 1 linha
──── RESULTADOS ────            (separador antes das tabelas)
KPIs · tabelas · rodapé padrão
──── LEITURA DO PERÍODO ────    (separador antes do fechamento)
▸ Outros indicadores            (título único; o tema vai dentro do painel)
▸ Como interpretar e definições
```

Ajustes finos de filtro: atalhos viram select no modo compacto (placeholder "Personalizado" quando o recorte não casa com nenhum atalho), a duração em dias aparece ao lado das datas, e a janela comparada só é exibida a partir de `2xl` (fica no `title` do elemento).

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
| UX03 | Layout principal e sidebar recolhível | P0 | parcial — `PageHeader` + `SearchToolbar` em Vendas; replicar nas demais |
| UX04 | Componentes compartilhados (`PageHeader`, `SearchToolbar`, `FiltrosPopover`) | P0 | ✅ base criada |
| UX05 | Motor visual de tabelas | P0 | ✅ `ReportTable` (15 telas) — colunas essenciais ainda opcionais |
| UX06 | Motor de filtros (`SearchToolbar` + popover + chips) | P0 | ✅ base completa em Vendas |
| UX07 | **Relatório piloto: Vendas** | P0 | em andamento — cabeçalho, consulta, filtros e chips prontos; drawer de NF e `NumericCell` pendentes |
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
