<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SysproERP Reports — regras do projeto

Aplicação web **local** de consulta de vendas do Syspro ERP (Next.js 16 + Prisma 7 + Better Auth + SQLite). Produto: `SysproERP Reports`.

## Skills do projeto (carregar ANTES de tarefas relacionadas)
Este repo versiona skills próprias em `.skills/` (formato SKILL.md). Consulte-as conforme o tema:

- **`.skills/syspro-erp-reports/SKILL.md`** — arquitetura, estrutura, comandos e **armadilhas** do app. Leia antes de QUALQUER mudança de código.
- **`.skills/syspro-api-exporta/SKILL.md`** — API de exportação do Syspro: URLs (com/sem IIS), datas DD/MM/AAAA, rotas, campos. Consulte ao mexer em consultas.
- **`.skills/web-code-quality/SKILL.md`** — fluxo de dev em 4 etapas (questionar → arquitetar → implementar → revisar) e checklists.
- **`.skills/syspro-erp-reports-deploy/SKILL.md`** — instalar/atualizar o app no servidor do cliente (PM2 + standalone + .env de produção).
- **`.skills/syspro-mcp/SKILL.md`** — conectar o MCP do Syspro (endpoint `/syspro` :3333, auth Bearer GUID) ao Hermes/Grok/ChatGPT; guia completo em `.skills/syspro-mcp/guia-configuracao.md`.

## Regras rápidas
- **Navegador nunca chama a API do Syspro** — sempre via backend (`app/api/*`), que filtra por `empresa_codigo`.
- **Multi-empresa por usuário**: cada usuário vê só os CNPJs em `UserEmpresa`; admin vê tudo.
- Datas para a API do Syspro: **DD/MM/AAAA** (nunca ISO/AAAA-MM-DD) — input date converte com split `[a,m,d]`.
- Valide com `npx tsc --noEmit` e `npm run build` antes de declarar pronto; teste o fluxo real (login + consulta).
- Ignore o ruído de tipo de node_modules que aparece quando o lint roda por arquivo isolado; o check do projeto é o que vale.
