---
name: testing-ci
description: Use ao criar, corrigir ou revisar testes, migrations e workflows de CI do SysproERP Reports.
---

# Testes e CI

- Unitários ficam próximos do domínio e não dependem da rede Syspro.
- E2E usa `e2e.db`, nunca `dev.db`; o webServer cria o arquivo SQLite vazio, aplica migrations e seed idempotente antes de iniciar.
- Separe projetos visitante e autenticado. Testes de login não podem herdar `storageState`.
- Seletor Playwright prioriza role, label e nome único. Não use texto ambíguo nem detalhes visuais frágeis.
- Toda correção de regressão ganha teste que falhava antes.
- O projeto mobile verifica overflow, console, navegação e alvos essenciais de 44 px.
- CI mantém um único workflow canônico com install, migrations, check, cobertura crítica, build e E2E.

Antes de declarar pronto, rode `npm run check`, `npm run build` e `npm run test:e2e`.
