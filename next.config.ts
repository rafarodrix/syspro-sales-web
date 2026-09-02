import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Deploy de produção no servidor do cliente (sem dev server) */
  output: "standalone",
  /* Acesso de dispositivos na rede em dev (celular etc.) */
  allowedDevOrigins: [
    "192.168.1.2",
    "100.110.105.63",
    "26.68.175.115", // Radmin VPN
    "localhost",
  ],
};

export default nextConfig;
