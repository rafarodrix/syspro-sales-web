/** Seed: cria o usuário admin inicial (idempotente — recria se preciso). */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import "dotenv/config";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@trilink.com.br";
  const password = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const name = process.env.SEED_ADMIN_NAME || "Administrador";

  const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
  const prisma = new PrismaClient({ adapter });

  const auth = betterAuth({
    database: prismaAdapter(prisma, { provider: "sqlite" }),
    emailAndPassword: { enabled: true },
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET,
  });

  // Remove usuário anterior (se houver) p/ hash consistente com o secret atual
  await prisma.user.deleteMany({ where: { email } });

  const criado = await auth.api.signUpEmail({
    body: { name, email, password },
  });
  if (!criado?.user) {
    console.error("Falha ao criar admin");
    process.exit(1);
  }
  await prisma.user.update({
    where: { id: criado.user.id },
    data: { role: "admin", emailVerified: true },
  });
  console.log(`Admin pronto: ${email} (role=admin)`);
}

main().finally(() => process.exit(0));
