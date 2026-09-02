/**
 * PM2 ecosystem — syspro-sales-web (produção, servidor do cliente)
 * Uso: pm2 start ecosystem.config.cjs
 * Depois: pm2 save && pm2 startup (p/ subir com o Windows)
 *
 * O wrapper start-prod.js carrega o .env da pasta de instalação e
 * inicia o server.js do standalone (gerado por `next build`).
 */
module.exports = {
  apps: [
    {
      name: "syspro-sales-web",
      script: "start-prod.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "500M",
      time: true,
      out_file: "logs/out.log",
      error_file: "logs/err.log",
      merge_logs: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
