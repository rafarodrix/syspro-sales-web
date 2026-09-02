@echo off
REM ============================================================
REM syspro-sales-web — Instalacao como servico no Windows (cliente)
REM Rode como Administrador NA PASTA DE INSTALACAO do cliente.
REM Requisitos: Node.js LTS instalado no servidor do cliente.
REM ============================================================
setlocal
cd /d "%~dp0"

echo.
echo ===[ syspro-sales-web - instalacao como servico ]===
echo.

REM 1. Verifica Node
node -v >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale Node.js LTS em https://nodejs.org
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo [OK] Node %%v

REM 2. Instala dependencias (package.json + .env)
echo Instalando dependencias...
call npm install --omit=dev
if errorlevel 1 ( echo [ERRO] npm install falhou & pause & exit /b 1 )
echo [OK] Dependencias

REM 3. Gera .env a partir do exemplo (se nao existir)
if not exist ".env" (
  copy ".env.production.example" ".env" >nul
  echo [ATENCAO] .env criado do exemplo.
  echo   Edite agora: BETTER_AUTH_URL, BETTER_AUTH_SECRET, SYSPRO_API_URL
  pause
)

REM 4. Instala PM2 global (se nao tiver)
where pm2 >nul 2>&1
if errorlevel 1 (
  echo Instalando PM2...
  call npm install -g pm2
)
echo [OK] PM2

REM 5. Build de producao (standalone)
echo Build de producao...
call npm run build
if errorlevel 1 ( echo [ERRO] build falhou & pause & exit /b 1 )
echo [OK] Build

REM 6. Copia static/public para o standalone (obrigatorio no Next)
if exist ".next\standalone\.next" (
  xcopy /E /I /Y ".next\static" ".next\standalone\.next\static" >nul
)
if exist "public" (
  xcopy /E /I /Y "public" ".next\standalone\public" >nul
)
echo [OK] Assets copiados p/ standalone

REM 7. Aplica migrations e cria admin
echo Migrations...
call npx prisma migrate deploy
call npx tsx prisma/seed.ts

REM 8. Sobe como servico PM2
pm2 delete syspro-sales-web >nul 2>&1
pm2 start ecosystem.config.cjs
pm2 save

echo.
echo ===[ Instalado! ]===
echo   Acesso local : http://localhost:3000
echo   Acesso rede  : http://<IP-deste-servidor>:3000
echo   Comandos     : pm2 status / pm2 restart syspro-sales-web / pm2 logs syspro-sales-web
echo   Subir c/ Windows: rode uma vez:  pm2 startup
echo.
pause
