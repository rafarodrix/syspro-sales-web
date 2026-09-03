import type { NextConfig } from "next";

const envDevOrigins = process.env.ALLOWED_DEV_ORIGINS
  ? process.env.ALLOWED_DEV_ORIGINS.split(",").map((o) => o.trim())
  : [];

const nextConfig: NextConfig = {
  /* Deploy de produção no servidor do cliente (sem dev server) */
  output: "standalone",
  /* Acesso de dispositivos na rede em dev (celular etc.) */
  allowedDevOrigins: Array.from(
    new Set([
      "192.168.1.2",
      "100.110.105.63",
      "26.68.175.115", // Radmin VPN
      "localhost",
      "127.0.0.1",
      ...envDevOrigins,
    ]),
  ),
};

export default nextConfig;
