/** Bootstrap explicito: cria somente o primeiro administrador, uma unica vez. */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import "dotenv/config";

function obterBootstrap() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || "Administrador";

  if (!email || !password || password.includes("TROQUE-POR")) {
    throw new Error("Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD para criar o primeiro administrador.");
  }
  if (password.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD deve ter pelo menos 12 caracteres.");
  }
  return { email, password, name };
}

async function main() {
  const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
  const prisma = new PrismaClient({ adapter });

  try {
    const totalUsuarios = await prisma.user.count();
    if (totalUsuarios > 0) {
      console.log("Bootstrap ignorado: ja existe usuario cadastrado.");
      return;
    }

    const bootstrap = obterBootstrap();
    const auth = betterAuth({
      database: prismaAdapter(prisma, { provider: "sqlite" }),
      emailAndPassword: { enabled: true },
      baseURL: process.env.BETTER_AUTH_URL,
      secret: process.env.BETTER_AUTH_SECRET,
    });
    const criado = await auth.api.signUpEmail({ body: bootstrap });
    if (!criado?.user) throw new Error("Falha ao criar o administrador inicial.");

    await prisma.user.update({
      where: { id: criado.user.id },
      data: { role: "admin", emailVerified: true },
    });
    console.log(`Administrador inicial criado: ${bootstrap.email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
