import { describe, expect, it } from "vitest";
import { obterVendas, type EmpresaInfo } from "@/lib/sales-service";

const empresas: EmpresaInfo[] = [
  { id: "empresa-a", cnpj: "00000000000100", razaoSocial: "Empresa A", empresaCodigo: "A", sysproBaseUrl: "http://a" },
  { id: "empresa-b", cnpj: "00000000000200", razaoSocial: "Empresa B", empresaCodigo: "B", sysproBaseUrl: "http://b" },
];

const consultaBase = {
  actorId: "usuario-a",
  empresasLiberadas: empresas,
  dtInicial: "2026-01-01",
  dtFinal: "2026-01-31",
  enforceRateLimit: false,
};

describe("isolamento de empresas no serviço de vendas", () => {
  it("não faz fallback para outra empresa quando o id não está liberado", async () => {
    await expect(obterVendas({ ...consultaBase, empresaSelecionadaId: "empresa-inexistente" }))
      .rejects.toMatchObject({ status: 400 });
  });

  it("rejeita consolidação customizada sem nenhuma empresa autorizada", async () => {
    await expect(obterVendas({ ...consultaBase, empresaSelecionadaId: "empresa-inexistente,outra" }))
      .rejects.toMatchObject({ status: 400 });
  });

  it("permite somente ids presentes na lista autorizada", async () => {
    await expect(obterVendas({ ...consultaBase, empresaSelecionadaId: "empresa-a,empresa-inexistente" }))
      .rejects.toMatchObject({ status: 400 });
  });
});
