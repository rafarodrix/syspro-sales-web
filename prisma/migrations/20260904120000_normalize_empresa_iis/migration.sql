-- Remove o armazenamento legado TEXT de sysproUseIis e padroniza em BOOLEAN.
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Empresa" (
    "id", "cnpj", "razaoSocial", "empresaCodigo", "ativa", "sysproBaseUrl", "sysproUseIis", "createdAt", "updatedAt"
)
SELECT
    "id", "cnpj", "razaoSocial", "empresaCodigo", "ativa", "sysproBaseUrl",
    CASE WHEN "sysproUseIis" = 'true' OR "sysproUseIis" = 1 THEN true ELSE false END,
    "createdAt", "updatedAt"
FROM "Empresa";

DROP TABLE "Empresa";
ALTER TABLE "new_Empresa" RENAME TO "Empresa";
CREATE UNIQUE INDEX "Empresa_cnpj_key" ON "Empresa"("cnpj");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
