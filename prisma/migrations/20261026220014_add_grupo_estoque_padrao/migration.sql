-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Empresa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cnpj" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "empresaCodigo" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "sysproBaseUrl" TEXT NOT NULL DEFAULT 'http://localhost:8080',
    "sysproUseIis" BOOLEAN NOT NULL DEFAULT false,
    "coberturaCriticaDias" INTEGER NOT NULL DEFAULT 7,
    "coberturaAtencaoDias" INTEGER NOT NULL DEFAULT 15,
    "coberturaExcessoDias" INTEGER NOT NULL DEFAULT 90,
    "coberturaCompraDias" INTEGER NOT NULL DEFAULT 30,
    "grupoEstoquePadrao" TEXT NOT NULL DEFAULT 'GERAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Empresa" ("ativa", "cnpj", "coberturaAtencaoDias", "coberturaCompraDias", "coberturaCriticaDias", "coberturaExcessoDias", "createdAt", "empresaCodigo", "id", "razaoSocial", "sysproBaseUrl", "sysproUseIis", "updatedAt") SELECT "ativa", "cnpj", "coberturaAtencaoDias", "coberturaCompraDias", "coberturaCriticaDias", "coberturaExcessoDias", "createdAt", "empresaCodigo", "id", "razaoSocial", "sysproBaseUrl", "sysproUseIis", "updatedAt" FROM "Empresa";
DROP TABLE "Empresa";
ALTER TABLE "new_Empresa" RENAME TO "Empresa";
CREATE UNIQUE INDEX "Empresa_cnpj_key" ON "Empresa"("cnpj");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'vendas',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "id", "image", "name", "password", "role", "updatedAt") SELECT "createdAt", "email", "emailVerified", "id", "image", "name", "password", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
