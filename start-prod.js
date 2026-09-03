/** Inicializa o standalone com configuracao de producao validada. */
const path = require("path");
const { config: loadEnv } = require("dotenv");

loadEnv({ path: path.join(process.cwd(), ".env"), override: false });

function validarAmbienteProducao() {
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseUrl = process.env.BETTER_AUTH_URL;
  if (!secret || secret.length < 32 || secret.includes("GERAR-COM")) {
    throw new Error("BETTER_AUTH_SECRET deve ter pelo menos 32 caracteres aleatorios.");
  }
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("BETTER_AUTH_URL deve ser uma URL valida.");
  }
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("BETTER_AUTH_URL deve usar HTTPS para acesso pela rede.");
  }
}

validarAmbienteProducao();

const PORT = process.env.PORT || "3000";
const HOST = "127.0.0.1";
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
