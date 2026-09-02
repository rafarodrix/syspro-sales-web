import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Acesso de dispositivos na rede em dev (celular etc.) */
  allowedDevOrigins: [
    "192.168.1.2",
    "100.110.105.63",
    "localhost",
  ],
};

export default nextConfig;
