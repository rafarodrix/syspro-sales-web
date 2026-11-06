---
name: mobile-accessibility
description: Use em mudanças de UI, navegação, filtros, tabelas ou formulários para garantir uso mobile e acessibilidade no SysproERP Reports.
---

# Mobile e acessibilidade

## Invariantes

- Viewport mínimo de referência: 390×844; valide também desktop.
- Controle tocável tem pelo menos 44×44 px no mobile. A densidade compacta pode retornar a partir de `sm`.
- Não pode existir overflow horizontal da página. Tabelas podem rolar dentro de região nomeada e com indicação visual.
- Drawer/modal possui nome acessível, foco inicial, fechamento por Escape, bloqueio de scroll e devolução de foco.
- Ícone isolado exige `aria-label`; estado expandido usa `aria-expanded` e `aria-controls`.
- Erros usam `role="alert"`; carregamentos e resultados usam status compreensível sem depender somente de cor.
- Formulários mantêm label, autocomplete, `aria-invalid` e mensagem associada.

## Validação

Rode o projeto Playwright `mobile`. Inspecione console, clipping, alvos de toque, teclado, drawer e ao menos uma interação real. Para tabelas, teste dados suficientes para provocar paginação e rolagem.
