/** Inicializa o standalone com configuracao de producao validada. */
const path = require("path");
const fs = require("fs");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const installDir = process.cwd();
const standaloneDir = path.join(installDir, ".next", "standalone");

function validarAmbienteProducao() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32 || secret.includes("GERAR-COM")) {
    throw new Error("BETTER_AUTH_SECRET deve ter pelo menos 32 caracteres aleatorios.");
  }
}

function resolverDatabaseUrl(databaseUrl) {
  const valor = databaseUrl?.trim() || "file:./dev.db";
  if (!valor.startsWith("file:")) return valor;

  const arquivo = valor.slice("file:".length);
  const caminhoAbsoluto = path.isAbsolute(arquivo)
    ? arquivo
    : path.resolve(installDir, arquivo);
  return `file:${caminhoAbsoluto.replace(/\\/g, "/")}`;
}

function materializarDependenciasStandalone() {
  const aliasDir = path.join(standaloneDir, ".next", "node_modules");
  const fontes = [
    { prefixo: "better-sqlite3-", origem: path.join(installDir, "node_modules", "better-sqlite3") },
    { prefixo: "@prisma/client-", origem: path.join(installDir, "node_modules", "@prisma", "client") },
  ];

  for (const { prefixo, origem } of fontes) {
    if (!fs.existsSync(origem)) continue;
    const baseDir = prefixo.startsWith("@prisma/") ? path.join(aliasDir, "@prisma") : aliasDir;
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    for (const nome of fs.readdirSync(baseDir)) {
      if (!nome.startsWith(prefixo)) continue;
      const destino = path.join(baseDir, nome);
      try {
        if (fs.lstatSync(destino).isSymbolicLink()) {
          fs.rmSync(destino, { recursive: true, force: true });
          fs.cpSync(origem, destino, { recursive: true });
          console.log(`[SysproERP Reports] dependência materializada: ${nome}`);
        }
      } catch (error) {
        throw new Error(`Não foi possível preparar ${nome}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}

validarAmbienteProducao();
if (!fs.existsSync(path.join(standaloneDir, "server.js"))) {
  throw new Error("Build standalone não encontrado. Execute `npm run build` antes de iniciar.");
}
materializarDependenciasStandalone();

const PORT = process.env.PORT || "3000";
// Escuta em todas as interfaces p/ permitir acesso pela rede (No-IP, IP local,
// VPN). Em producao com HTTPS, proteger na camada do proxy reverso (Caddy).
const HOST = process.env.HOST || "0.0.0.0";

console.log(`[SysproERP Reports] iniciando na porta ${PORT} (host ${HOST})`);
process.env.PORT = PORT;
process.env.HOSTNAME = HOST;
process.env.NODE_ENV = "production";
process.env.DATABASE_URL = resolverDatabaseUrl(process.env.DATABASE_URL);
process.chdir(standaloneDir);
require(path.join(standaloneDir, "server.js"));
