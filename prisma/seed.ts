/** Seed: cria os usuários padrão para cada perfil (Admin, Gerência, Vendas). */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import "dotenv/config";

async function main() {
  const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
  const prisma = new PrismaClient({ adapter });

  const auth = betterAuth({
    database: prismaAdapter(prisma, { provider: "sqlite" }),
    emailAndPassword: { enabled: true },
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET,
  });

  const usuariosPadrao = [
    {
      email: process.env.SEED_ADMIN_EMAIL || "admin@trilink.com.br",
      password: process.env.SEED_ADMIN_PASSWORD || "admin123",
      name: process.env.SEED_ADMIN_NAME || "Administrador",
      role: "admin",
    },
    {
      email: "gerencia@trilink.com.br",
      password: "gerencia123",
      name: "Gerente Comercial",
      role: "gerente",
    },
    {
      email: "vendas@trilink.com.br",
      password: "vendas123",
      name: "Consultor de Vendas",
      role: "vendas",
    },
  ];

  const empresas = await prisma.empresa.findMany();

  for (const u of usuariosPadrao) {
    // Remove usuário anterior para hash consistente
    await prisma.user.deleteMany({ where: { email: u.email } });

    const criado = await auth.api.signUpEmail({
      body: { name: u.name, email: u.email, password: u.password },
    });

    if (!criado?.user) {
      console.error(`Falha ao criar usuário: ${u.email}`);
      continue;
    }

    await prisma.user.update({
      where: { id: criado.user.id },
      data: { role: u.role, emailVerified: true },
    });

    // Se houver empresas cadastradas e não for admin, vincula automaticamente para teste
    if (u.role !== "admin" && empresas.length > 0) {
      for (const emp of empresas) {
        await prisma.userEmpresa.upsert({
          where: {
            userId_empresaId: {
              userId: criado.user.id,
              empresaId: emp.id,
            },
          },
          create: {
            userId: criado.user.id,
            empresaId: emp.id,
          },
          update: {},
        });
      }
    }

    console.log(`✓ Usuário criado: ${u.email} | Perfil: ${u.role}`);
  }
}

main().finally(() => process.exit(0));
