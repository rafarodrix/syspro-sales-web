# Syspro Sales Web

Aplicação web local (Next.js) para **consultar e apresentar as vendas do Syspro ERP** via API de exportação. Roda no servidor do cliente; o navegador nunca acessa a API do Syspro diretamente (o backend filtra por empresa).

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS + shadcn/ui
- Better Auth (usuário/senha/sessão, RBAC admin/user)
- Prisma + SQLite
- API do Syspro: rota `/api/exporta/...` (sem IIS) ou `/sysproserverisapi.dll/api/exporta/...` (com IIS)

## Requisitos

- Node.js 22+
- API de exportação do Syspro acessível na rede (ex.: `http://localhost:1234`)

## Setup

```bash
npm install
# criar .env (veja .env.example) com BETTER_AUTH_SECRET
npx prisma migrate dev
npx prisma generate
npm run dev
```

Acesse `http://localhost:3000`.

### Seed (primeiro admin)

```bash
SEED_ADMIN_EMAIL=admin@empresa.com SEED_ADMIN_PASSWORD=troque123 npx tsx prisma/seed.ts
```

## Estrutura

```
app/
  login/          página pública de login
  vendas/         consulta de vendas (CNPJ + período)
  usuarios/       admin: gerencia usuários e CNPJs liberados
  configuracoes/  admin: URL/IIS da API + cadastro CNPJ ↔ empresa_codigo
  api/
    auth/         Better Auth
    vendas/       POST — consulta (backend → API Syspro, filtra empresa)
    empresas/     admin — cadastro de empresa
    usuarios/     admin — criar usuário / liberar CNPJ
    configuracao/ admin — salvar conexão
lib/
  auth.ts         instância Better Auth
  database.ts     PrismaClient (adapter SQLite)
  syspro-api.ts   cliente da API Syspro (rotas do manual)
prisma/schema.prisma  User/Session/Account/Empresa/UserEmpresa/Configuracao
```

## Fluxo de segurança

Usuário loga → seleciona CNPJ autorizado → Next identifica `empresa_codigo` → consulta API do Syspro no backend → filtra empresa → apresenta.

## URLs da API Syspro (confirmadas)

- Sem IIS: `http://servidor:porta/api/exporta/produto/venda?dt_inicial=DD/MM/AAAA&dt_final=DD/MM/AAAA`
- Com IIS: `http://servidor:porta/sysproserverisapi.dll/api/exporta/produto/venda?dt_inicial=DD/MM/AAAA&dt_final=DD/MM/AAAA`

A escolha é feita na tela **Configurações**.
