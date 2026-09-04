---
name: syspro-erp-reports-deploy
description: Use to install/update SysproERP Reports on a client server.
---

# Deploy no servidor do cliente (Windows)

Como instalar e atualizar o `SysproERP Reports` **no servidor do cliente** — a mesma máquina que roda o Syspro (IIS porta 1234 ou SysproServer.exe). O app roda como **serviço PM2** (sobe com o Windows, reinicia sozinho). Usa o build **standalone** do Next.

## Pré-requisitos no servidor do cliente
- **Node.js LTS** instalado (https://nodejs.org) — necessário p/ rodar o app.
- Pasta de instalação com permissão de escrita (ex.: `C:\Syspro\SalesWeb`).
- A API do Syspro acessível do app (mesma máquina: `http://localhost:1234`).

## Instalação (primeira vez)
1. Copiar o projeto (via git clone OU zip) para a pasta de instalação.
2. Criar `.env` a partir de `.env.production.example` e ajustar:
   - `BETTER_AUTH_URL` — URL/porta que os usuários digitam no navegador.
   - `BETTER_AUTH_SECRET` — gerar: `openssl rand -base64 32`.
   - `SYSPRO_API_URL` / `SYSPRO_USE_IIS` — endereço da API de exporta do cliente.
   - `SYSPRO_ALLOWED_ORIGINS` — **allowlist** de origens da API Syspro (vírgula). A URL de CADA empresa cadastrada precisa estar aqui, senão a consulta falha com "A origem da API Syspro nao esta na allowlist". Ex.: `http://localhost:1234,http://servidor:1234`.
   - `BETTER_AUTH_TRUSTED_ORIGINS` — origens de acesso ao app (No-IP, IPs, tunnels), separadas por vírgula.
3. Rodar **como Administrador**: `scripts\instalar-servico.bat`
   (instala deps, build, copia assets p/ standalone, migrations, seed admin, registra PM2).
4. `pm2 startup` (uma vez) para subir junto com o Windows.

## Atualização (versões novas)
```bat
git pull
call npm install --omit=dev
call npm run build
xcopy /E /I /Y ".next\static" ".next\standalone\.next\static" >nul
pm2 restart syspro-erp-reports
```
(ou rodar o `instalar-servico.bat` de novo — é idempotente).

## Acesso interno E externo — o ponto crítico
O app atende **dois públicos** com origens diferentes (ex.: IP local `192.168.x` + externo via Radmin/Tailscale). Isso cria um desafio no Better Auth:

- **`BETTER_AUTH_URL`** define a origem "canônica" (cookie/sessão). Escolha a **mais usada** (ex.: IP local do servidor).
- **`BETTER_AUTH_TRUSTED_ORIGINS`** (no `.env`) precisa listar **TODOS** os hosts/IPs usados, com porta: `http://192.168.x.x:3000`, `http://IP-externo:3000`, `https://tunnel.trycloudflare.com`, etc.
  - Em produção, o `auth.ts` **só** aceita origens do `.env` (nada hardcoded) — se um IP novo falhar com "Invalid origin" no log, adicione ao `.env` e **reinicie** (o `.env` é lido no start).
  - ⚠️ IPs de VPN (Radmin/Tailscale) **mudam** entre conexões.
  - Alternativa estável p/ externo: **No-IP/DDNS** (`http://host.ddns.net:3000`) ou um domínio com HTTPS.

## start-prod.js (produção)
- O wrapper escuta em **`0.0.0.0`** (todas as interfaces) para permitir acesso externo (No-IP, IPs, VPN). Override: `HOST=127.0.0.1` no `.env` para restringir a localhost.
- Valida `BETTER_AUTH_SECRET` (≥32 chars) no start.
- Carrega `.env` da raiz + resolve `DATABASE_URL` absoluto + `chdir` para `.next/standalone`.

## Porta e firewall
- App escuta em `0.0.0.0:3000` (config do ecosystem). Para mudar: `PORT=XXXX` no `.env`.
- Liberar no firewall do Windows a porta escolhida para a rede local (e para a interface da VPN se for acesso externo).

## Banco de dados
- SQLite em `./dev.db` (raiz de instalação). **Backup regular** desse arquivo.
- Migrations: `npx prisma migrate deploy` (o instalador já roda).

## Operação (PM2)
```bat
pm2 status                REM estado
pm2 logs syspro-erp-reports REM logs (erros ficam em logs/err.log)
pm2 restart syspro-erp-reports
pm2 stop syspro-erp-reports
```
Para **remover** o serviço: `pm2 delete syspro-erp-reports`.

## Diagnóstico rápido
1. `pm2 status` → online?
2. `pm2 logs` → "Ready" na porta? erro "Invalid origin"? 
3. `curl http://localhost:3000/login` → 200?
4. Login direto na API: `curl -X POST http://localhost:3000/api/auth/sign-in/email -H "Content-Type: application/json" -d '{"email":"...","password":"..."}'` → 200 com `user`?
