import { betterAuth } from "better-auth";
import { prisma } from "@/lib/database";
import { prismaAdapter } from "better-auth/adapters/prisma";

function originsConfiaveis(): string[] {
  const configuradas = process.env.BETTER_AUTH_TRUSTED_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
  const locais = process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:3000", "http://127.0.0.1:3000"];
  return Array.from(new Set([process.env.BETTER_AUTH_URL, ...locais, ...configuradas].filter((origin): origin is string => Boolean(origin))));
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  emailAndPassword: { enabled: true },
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: originsConfiaveis(),
  session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "vendas", required: false, input: false },
    },
  },
});
