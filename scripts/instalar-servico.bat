@echo off
setlocal
cd /d "%~dp0.."

echo ===[ SysproERP Reports - instalacao segura ]===
node -v >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js LTS nao encontrado.
  pause
  exit /b 1
)

if not exist ".env" (
  copy ".env.production.example" ".env" >nul
  echo [ACAO NECESSARIA] Edite .env antes de continuar.
  echo Defina URL HTTPS, segredo Better Auth, allowlist Syspro e administrador inicial.
  pause
)

findstr /C:"GERAR-COM" ".env" >nul && (
  echo [ERRO] Gere e configure BETTER_AUTH_SECRET no .env.
  pause
  exit /b 1
)
findstr /C:"TROQUE-POR" ".env" >nul && (
  echo [ERRO] Defina uma senha forte para SEED_ADMIN_PASSWORD no .env.
  pause
  exit /b 1
)

echo Instalando dependencias...
call npm install --omit=dev
if errorlevel 1 ( pause & exit /b 1 )

where pm2 >nul 2>&1
if errorlevel 1 call npm install -g pm2

echo Build de producao...
call npm run build
if errorlevel 1 ( pause & exit /b 1 )

if exist ".next\standalone\.next" xcopy /E /I /Y ".next\static" ".next\standalone\.next\static" >nul
if exist "public" xcopy /E /I /Y "public" ".next\standalone\public" >nul

echo Migrations e bootstrap inicial...
call npx prisma migrate deploy
if errorlevel 1 ( pause & exit /b 1 )
call npx tsx prisma/seed.ts
if errorlevel 1 ( pause & exit /b 1 )

pm2 delete syspro-erp-reports >nul 2>&1
pm2 start ecosystem.config.cjs
pm2 save

echo [OK] Instalado. O Next escuta somente em 127.0.0.1 por padrao.
echo Publique-o por um proxy HTTPS e libere somente a porta do proxy no firewall.
pause
