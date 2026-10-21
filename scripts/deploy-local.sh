#!/usr/bin/env bash
# Deploy local do SysproERP Reports (Windows/git-bash ou Linux).
#
# Faz, em ordem segura:
#   1. para o servidor de produção (senão o build apaga .next/standalone e derruba o app)
#   2. atualiza código do git (opcional: --no-pull)
#   3. prisma generate + prisma migrate deploy (migration pendente quebra o app)
#   4. build standalone
#   5. copia .next/static, public e .env para .next/standalone
#   6. sobe o start-prod.js em background com log
#   7. health check em /login até responder 200
#
# Uso:
#   bash scripts/deploy-local.sh                 # pull + migrate + build + restart
#   bash scripts/deploy-local.sh --no-pull       # deploy do código já local
#   bash scripts/deploy-local.sh --no-build      # só reinicia (sem pull/migrate/build)
#   PORTA=3000 bash scripts/deploy-local.sh      # porta alternativa
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ" || exit 1

PORTA="${PORTA:-3000}"
LOG_DIR="${LOG_DIR:-$LOCALAPPDATA/Temp}"
[ -d "$LOG_DIR" ] || LOG_DIR="/tmp"
LOG="$LOG_DIR/syspro-reports-deploy.log"

PULL=1
BUILD=1
for arg in "$@"; do
  case "$arg" in
    --no-pull) PULL=0 ;;
    --no-build) BUILD=0; PULL=0 ;;
    *) echo "[erro] argumento desconhecido: $arg"; exit 2 ;;
  esac
done

etapa() { printf '\n=== %s ===\n' "$1"; }
falhar() { printf '\n[FALHOU] %s\n' "$1"; exit 1; }

pid_da_porta() {
  netstat -ano 2>/dev/null | grep ":$PORTA " | grep -i listen | head -1 | awk '{print $NF}'
}

parar_servidor() {
  local pid
  pid="$(pid_da_porta)"
  if [ -n "${pid:-}" ]; then
    echo "parando PID $pid na porta $PORTA"
    # MSYS com conversão de path desligada: usar /PID (/ /PID é rejeitado)
    taskkill /PID "$pid" /F >/dev/null 2>&1 || kill -9 "$pid" 2>/dev/null || true
    for _ in $(seq 1 20); do
      [ -z "$(pid_da_porta)" ] && break
      sleep 1
    done
  else
    echo "nada escutando na porta $PORTA"
  fi
  if [ -n "$(pid_da_porta)" ]; then
    falhar "porta $PORTA continua ocupada — encerre o processo manualmente"
  fi
}

subir_servidor() {
  : > "$LOG"
  LOG="$LOG" node -e '
    const { spawn } = require("child_process");
    const fs = require("fs");
    const out = fs.openSync(process.env.LOG, "a");
    const p = spawn(process.execPath, ["start-prod.js"], {
      cwd: process.cwd(),
      detached: true,
      stdio: ["ignore", out, out],
    });
    p.unref();
    console.log("servidor iniciado com PID", p.pid);
  ' || falhar "não foi possível iniciar o start-prod.js"
}

health_check() {
  local tentativa
  for tentativa in $(seq 1 30); do
    local codigo
    codigo="$(curl -s -o /dev/null -m 5 -w '%{http_code}' "http://localhost:$PORTA/login" 2>/dev/null)"
    if [ "$codigo" = "200" ]; then
      echo "health check OK (/login respondeu 200 na tentativa $tentativa)"
      return 0
    fi
    sleep 2
  done
  echo "--- últimas linhas do log ---"
  tail -30 "$LOG" 2>/dev/null
  falhar "health check não passou: /login não respondeu 200"
}

etapa "1/7 parando servidor de produção"
parar_servidor

if [ "$PULL" -eq 1 ]; then
  etapa "2/7 atualizando código (git pull --ff-only)"
  git pull --ff-only || falhar "git pull falhou (resolva o merge manualmente)"
else
  etapa "2/7 git pull ignorado (--no-pull)"
fi

if [ "$BUILD" -eq 1 ]; then
  etapa "3/7 prisma generate + migrate deploy"
  npx prisma generate || falhar "prisma generate falhou"
  npx prisma migrate deploy || falhar "prisma migrate deploy falhou"

  etapa "4/7 build standalone"
  rm -rf .next
  npm run build || falhar "npm run build falhou"

  etapa "5/7 copiando estáticos, public e .env para .next/standalone"
  mkdir -p .next/standalone/.next/static
  cp -r .next/static/. .next/standalone/.next/static/ || falhar "falha ao copiar .next/static"
  [ -d public ] && { cp -r public .next/standalone/ || falhar "falha ao copiar public"; }
  [ -f .env ] && { cp .env .next/standalone/.env || falhar "falha ao copiar .env"; }
else
  etapa "3-5/7 build ignorado (--no-build)"
  [ -d .next/standalone ] || falhar "não existe .next/standalone para subir"
fi

etapa "6/7 iniciando servidor"
subir_servidor

etapa "7/7 health check"
health_check

etapa "resumo"
echo "commit:  $(git log -1 --oneline)"
echo "porta:   $PORTA"
echo "log:     $LOG"
echo "pids:    $(pid_da_porta)"
