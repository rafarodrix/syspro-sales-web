@echo off
rem Atalho Windows para o deploy local (delega para o script bash, fonte unica da verdade).
rem Uso: scripts\deploy-local.bat [--no-pull] [--no-build]
setlocal
cd /d "%~dp0.."

where bash >nul 2>&1
if errorlevel 1 (
  echo [ERRO] bash nao encontrado. Instale Git for Windows ou rode o deploy manualmente.
  exit /b 1
)

bash "scripts/deploy-local.sh" %*
exit /b %errorlevel%
