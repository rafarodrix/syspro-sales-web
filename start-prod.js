/** Inicializa o standalone com configuracao de producao validada. */
const path = require("path");
const { config: loadEnv } = require("dotenv");

loadEnv({ path: path.join(process.cwd(), ".env"), override: false });

function validarAmbienteProducao() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32 || secret.includes("GERAR-COM")) {
    throw new Error("BETTER_AUTH_SECRET deve ter pelo menos 32 caracteres aleatorios.");
  }
}

validarAmbienteProducao();

const PORT = process.env.PORT || "3000";
// Escuta em todas as interfaces p/ permitir acesso pela rede (No-IP, IP local,
// VPN). Em producao com HTTPS, proteger na camada do proxy reverso (Caddy).
const HOST = process.env.HOST || "0.0.0.0";
const installDir = process.cwd();
const standaloneDir = path.join(installDir, ".next", "standalone");
const dbPath = path.join(installDir, "dev.db");

console.log(`[SysproERP Reports] iniciando na porta ${PORT} (host ${HOST})`);
process.env.PORT = PORT;
process.env.HOSTNAME = HOST;
process.env.NODE_ENV = "production";
process.env.DATABASE_URL = `file:${dbPath.replace(/\\/g, "/")}`;
process.chdir(standaloneDir);
require(path.join(standaloneDir, "server.js"));
