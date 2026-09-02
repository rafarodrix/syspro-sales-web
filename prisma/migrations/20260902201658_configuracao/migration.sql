-- CreateTable
CREATE TABLE "Configuracao" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "sysproBaseUrl" TEXT NOT NULL DEFAULT 'http://localhost:8080',
    "sysproUseIis" TEXT NOT NULL DEFAULT 'false',
    "updatedAt" DATETIME NOT NULL
);
