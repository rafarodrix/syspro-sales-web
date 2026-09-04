---
name: syspro-erp-reports
description: Use for the SysproERP Reports app (Next.js local sales viewer).
---

# SysproERP Reports

Aplicação **web local** (roda no servidor do cliente, não em nuvem) para consultar e apresentar as **vendas do Syspro ERP** via API de exportação. Sem agent Go, sem monitoramento remoto, sem integração com o Portal Trilink — escopo enxuto: usuário consulta vendas por CNPJ/período.

**Produto:** `SysproERP Reports` (dev em `npm run dev`, porta 3000)

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend/Backend | Next.js **16** (App Router, Turbopack) + React 19 + TypeScript estrito |
| UI | Tailwind v4 + shadcn/ui (radix, preset nova) |
| Auth | Better Auth 1.x (email/senha, cookie HttpOnly) + RBAC admin/user |
| Dados | Prisma **7** + SQLite (arquivo `./dev.db` na **raiz**) |
| Fonte externa | API de exportação do Syspro (ver skill `syspro-api-exporta`) |

## Estrutura

```
app/
  login/          página pública (useSearchParams exige <Suspense>)
  vendas/         consulta: CNPJ + período → resumo (total/ticket) + tabela
  usuarios/       admin: criar usuário, liberar CNPJ por usuário
  configuracoes/  admin: URL da API (com/sem IIS) + cadastro CNPJ ↔ empresa_codigo
  api/
    auth/[...all] Better Auth handler
    vendas/       POST — chama a API do Syspro no BACKEND e filtra por empresa
    empresas/     POST (add) / PATCH (edit) / DELETE (remove) — admin
    usuarios/     POST (criar) ; usuarios/liberar POST/DELETE
    configuracao/ POST — salva URL/IIS
components/       ui/ (shadcn) + nav-app, logout-button, vendas-client, ...
lib/
  auth.ts         instância Better Auth (trustedOrigins p/ IPs de acesso)
  auth-client.ts  cliente frontend do Better Auth
  database.ts     PrismaClient com adapter @prisma/adapter-better-sqlite3
  syspro-api.ts   cliente tipado da API de exporta (rotas + tipos)
prisma/
  schema.prisma   User/Session/Account/Verification/Empresa/UserEmpresa/Configuracao
  seed.ts         cria admin (npx tsx prisma/seed.ts)
prisma7.config.ts config do Prisma 7 (carrega .env via dotenv)
```

## Regras de arquitetura (validado nesta stack)
- **O navegador NUNCA chama a API do Syspro** — só o backend (`app/api/vendas`). O backend filtra por `empresa_codigo`; o usuário vê só o que tem liberado.
- **Multi-empresa:** uma base Syspro pode ter N empresas (`empresa_codigo` 1, 2...). Cada registro retornado traz `empresa_codigo`. A separação por usuário é via tabela `UserEmpresa` (CNPJ liberado por usuário); admin vê todas.
- **Admin** = role `admin` no User (vê tudo). **User** = só CNPJs em `UserEmpresa`.

## Comandos
```bash
npm run dev          # dev server (porta 3000)
npm run build        # build produção (valida TS + prerender)
npx prisma migrate dev --name <x>   # migration
npx prisma generate  # regenera client (necessário após mudar schema)
npx tsx prisma/seed.ts  # cria admin (SEED_ADMIN_EMAIL/SENHA, default admin@trilink.com.br/admin123)
```

## Armadilhas conhecidas (NÃO repetir)
1. **Prisma 7 exige driver adapter**: `new PrismaBetterSqlite3({ url })` + client importado de `@/generated/prisma/client` (não `@prisma/client`). `prisma generate` após todo schema change.
2. **Better Auth**: model `Account` **precisa** do campo `issuer` (senão signUp falha silencioso); senha fica em `Account.password` (providerId `credential`), não em `User.password`. Rodar signUp **fora** do app com `secret`/`baseURL` iguais ao `.env`.
3. **Next 16**: arquivo é `proxy.ts` (não `middleware.ts`); `useSearchParams` exige `<Suspense>`; `allowedDevOrigins` no `next.config` para acesso de celular/IP.
4. **Datas**: input `type=date` entrega `AAAA-MM-DD` — converter para `DD/MM/AAAA` (dia/mês/ano!) antes de mandar à API do Syspro. Split correto: `[a,m,d] = v.split("-")` → `${d}/${m}/${a}`. Erro aqui → API responde **500**.
5. **Acesso externo (celular)**: servidor escuta 0.0.0.0; liberar no `trustedOrigins` (Better Auth) + `allowedDevOrigins` (Next) os IPs usados (Wi-Fi 192.168.x e Tailscale 100.x).
6. **npm no Windows** bloqueia install-scripts: `npm install-scripts approve <pkg>` (better-sqlite3 precisa do build nativo).
7. **Empresa cadastrada** tem CNPJ + `empresaCodigo` que DEVE bater com o valor real do Syspro (`"1"`, `"2"` — não `"002"`). Código errado → filtro retorna 0 itens silenciosamente.

## Fluxo de dados (segurança)
```
Usuário loga → seleciona CNPJ autorizado → Next identifica empresa_codigo
→ backend consulta API do Syspro → filtra por empresa_codigo → apresenta
```
