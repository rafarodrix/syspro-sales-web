import { describe, expect, it, vi } from "vitest";
import { SysproApiError } from "@/lib/syspro-api";
import { consultarSysproAdaptativamente, dividirJanelaAoMeio, excedeuLimiteRespostaSyspro } from "@/lib/syspro-consulta-adaptativa";

describe("consulta adaptativa do Syspro", () => {
  it("divide períodos brasileiros em metades sem sobreposição", () => {
    expect(dividirJanelaAoMeio({ inicial: "01/10/2026", final: "04/10/2026" })).toEqual([
      { inicial: "2026-10-01", final: "2026-10-02" },
      { inicial: "2026-10-03", final: "2026-10-04" },
    ]);
  });

  it("divide recursivamente somente quando a resposta excede o limite", async () => {
    const consultar = vi.fn(async (janela: { inicial: string; final: string }) => {
      if (janela.inicial === "01/10/2026") throw new SysproApiError("A resposta da API Syspro excede o limite permitido.", 502);
      return [`${janela.inicial}:${janela.final}`];
    });
    await expect(consultarSysproAdaptativamente({ inicial: "01/10/2026", final: "04/10/2026" }, consultar)).resolves.toEqual([
      "2026-10-01:2026-10-02",
      "2026-10-03:2026-10-04",
    ]);
    expect(consultar).toHaveBeenCalledTimes(3);
  });

  it("reconhece o limite mesmo quando o erro está encadeado", () => {
    const causa = new SysproApiError("A resposta da API Syspro excede o limite permitido.", 502);
    expect(excedeuLimiteRespostaSyspro(new Error("Falha da integração", { cause: causa }))).toBe(true);
  });

  it("preserva o erro original quando nem um único dia cabe no limite", async () => {
    const erro = new SysproApiError("A resposta da API Syspro excede o limite permitido.", 502);
    await expect(consultarSysproAdaptativamente(
      { inicial: "2026-10-01", final: "2026-10-01" },
      async () => { throw erro; },
    )).rejects.toBe(erro);
  });
});
