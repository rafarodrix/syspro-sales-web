/**
 * Wrapper de produção — carrega o .env da pasta de instalação e
 * inicia o servidor standalone do Next.
 * Usado pelo PM2 (ecosystem.config.cjs).
 *
 * IMPORTANTE: roda a partir da RAIZ de instalação (onde ficam .env,
 * dev.db e .next/standalone). O DATABASE_URL "file:./dev.db" do .env
 * resolve relativo à RAIZ (cwd), NÃO ao standalone — por isso o banco
 * com dados fica na pasta de instalação e o standalone o encontra.
 */
const path = require("path");
const { config: loadEnv } = require("dotenv");

// Carrega .env da raiz de instalação (cwd = onde o PM2/wrapper roda)
loadEnv({ path: path.join(process.cwd(), ".env"), override: false });

const PORT = process.env.PORT || "3000";
// HOSTNAME no Windows = nome do PC ("SERVIDOR"), o que faz o Next escutar
// só numa interface. Forçamos 0.0.0.0 p/ atender local + rede + VPN.
const HOST = "0.0.0.0";

console.log(`[syspro-sales-web] iniciando na porta ${PORT} (host ${HOST})`);
console.log(`[syspro-sales-web] cwd: ${process.cwd()}`);
console.log(`[syspro-sales-web] DATABASE_URL: ${process.env.DATABASE_URL}`);

// Define antes de subir o server.js do standalone
process.env.PORT = PORT;
process.env.HOSTNAME = HOST;
process.env.NODE_ENV = "production";

// O standalone fica em .next/standalone — server.js espera ser chamado
// de dentro dessa pasta; mudamos o cwd para ela e garantimos o DATABASE_URL
// absoluto apontando para o dev.db da RAIZ de instalação.
const standaloneDir = path.join(process.cwd(), ".next", "standalone");
const dbPath = path.join(process.cwd(), "dev.db");
process.env.DATABASE_URL = `file:${dbPath.replace(/\\/g, "/")}`;
process.chdir(standaloneDir);

require(path.join(standaloneDir, "server.js"));
