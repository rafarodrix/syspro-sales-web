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
   - URL e modo IIS da API são cadastrados por empresa na tela **Configurações**.
   - `SYSPRO_ALLOWED_ORIGINS` — **allowlist** de origens da API Syspro (vírgula). A URL de CADA empresa cadastrada precisa estar aqui, senão a consulta falha com "A origem da API Syspro nao esta na allowlist". Ex.: `http://localhost:1234,http://servidor:1234`. A Mundial usa `http://mundial.serveftp.com:1234`; o caminho IIS é resolvido pelo modo `sysproUseIis` da empresa.
   - `BETTER_AUTH_TRUSTED_ORIGINS` — origens de acesso ao app (No-IP, IPs, tunnels), separadas por vírgula.
3. Rodar **como Administrador**: `scripts\instalar-servico.bat`
   (instala deps, build, copia assets p/ standalone, migrations, seed admin, registra PM2).
4. `pm2 startup` (uma vez) para subir junto com o Windows.

## Atualização (versões novas)
```bat
git pull
call npm ci
call npm run build
call npx prisma migrate deploy
call npm run roles:normalize
xcopy /E /I /Y ".next\static" ".next\standalone\.next\static" >nul
call npm prune --omit=dev
pm2 restart syspro-erp-reports
```
(ou rodar o `instalar-servico.bat` de novo — é idempotente).

## Armadilha de build (Windows)
- **NUNCA rodar `npm run build` com o servidor de produção no ar.** O Next apaga/regenera `.next` (incluindo `.next/standalone`), então o processo antigo continua de pé em memória mas o app quebra na hora (HTTP 500, sem chunks/estáticos). Se precisar validar build, pare o processo primeiro (`netstat -ano | grep :3000` → `taskkill /PID <pid> /F`), rode o build, copie `.next/static`, `public` e `.env` para `.next/standalone` e só então suba com `node start-prod.js`.

## Acesso interno E externo — o ponto crítico
O app atende **dois públicos** com origens diferentes (ex.: IP local `192.168.x` + externo via Radmin/Tailscale). Isso cria um desafio no Better Auth:

- **`BETTER_AUTH_URL`** define a origem "canônica" (cookie/sessão). Escolha a **mais usada** (ex.: IP local do servidor).
- **`BETTER_AUTH_TRUSTED_ORIGINS`** (no `.env`) precisa listar **TODOS** os hosts/IPs usados, com porta: `http://192.168.x.x:3000`, `http://IP-externo:3000`, `https://tunnel.trycloudflare.com`, etc.
  - Em produção, o `auth.ts` **só** aceita origens do `.env` (nada hardcoded) — se um IP novo falhar com "Invalid origin" no log, adicione ao `.env` e **reinicie** (o `.env` é lido no start).
  - ⚠️ IPs de VPN (Radmin/Tailscale) **mudam** entre conexões.
  - Alternativa estável p/ externo: **No-IP/DDNS** (`http://host.ddns.net:3000`) ou um domínio com HTTPS.

## start-prod.js (produção)
- O wrapper usa `HOST` do `.env`. O exemplo de produção adota **`127.0.0.1`**, indicado quando há proxy HTTPS. Use `0.0.0.0` apenas quando o acesso direto pela rede for intencional.
- Valida `BETTER_AUTH_SECRET` (≥32 chars) no start.
- Carrega `.env` da raiz + resolve `DATABASE_URL` absoluto + `chdir` para `.next/standalone`.

## Porta e firewall
- Host e porta são configurados por `HOST` e `PORT` no `.env`.
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
