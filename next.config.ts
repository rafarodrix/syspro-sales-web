import type { NextConfig } from "next";

const envDevOrigins = process.env.ALLOWED_DEV_ORIGINS
  ? process.env.ALLOWED_DEV_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];

const nextConfig: NextConfig = {
  /* Deploy de produção no servidor do cliente (sem dev server) */
  output: "standalone",
  /* Acesso de dispositivos na rede em dev (celular etc.) */
  allowedDevOrigins: Array.from(
    new Set([
      "localhost",
      "127.0.0.1",
      ...envDevOrigins,
    ]),
  ),
};

export default nextConfig;
