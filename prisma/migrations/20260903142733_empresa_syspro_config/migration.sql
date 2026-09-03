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
    "sysproUseIis" TEXT NOT NULL DEFAULT 'false',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Empresa" ("ativa", "cnpj", "createdAt", "empresaCodigo", "id", "razaoSocial", "updatedAt") SELECT "ativa", "cnpj", "createdAt", "empresaCodigo", "id", "razaoSocial", "updatedAt" FROM "Empresa";
DROP TABLE "Empresa";
ALTER TABLE "new_Empresa" RENAME TO "Empresa";
CREATE UNIQUE INDEX "Empresa_cnpj_key" ON "Empresa"("cnpj");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
