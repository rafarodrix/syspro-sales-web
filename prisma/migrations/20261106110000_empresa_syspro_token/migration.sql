-- Token Bearer exigido pelo SysproServer nas rotas de exporta
ALTER TABLE "Empresa" ADD COLUMN "sysproToken" TEXT;
