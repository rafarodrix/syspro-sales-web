import { betterAuth } from "better-auth";
import { prisma } from "@/lib/database";
import { prismaAdapter } from "better-auth/adapters/prisma";

const envOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS
  ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map((o) => o.trim())
  : [];

const defaultOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://192.168.1.2:3000",
  "http://100.110.105.63:3000",
  "http://26.68.175.115:3000", // Radmin VPN
];

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: Array.from(new Set([...defaultOrigins, ...envOrigins])),
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutos
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        required: false,
        input: false,
      },
    },
  },
});
