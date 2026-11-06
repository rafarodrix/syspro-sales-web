import { describe, expect, it } from "vitest";
import { mesmoServidor, normalizarOrigemServidor, tokenDoServidor } from "@/lib/servidor-syspro";

describe("servidor Syspro (token por instalação)", () => {
  it("normaliza a origem para comparar filiais do mesmo servidor", () => {
    expect(normalizarOrigemServidor(" http://Vitrine.ServeFTP.com:1234/ ")).toBe("http://vitrine.serveftp.com:1234");
    expect(normalizarOrigemServidor(null)).toBe("");
    expect(normalizarOrigemServidor(undefined)).toBe("");
  });

  it("considera o mesmo servidor apenas com origem e modo de rota iguais", () => {
    const a = { baseUrl: "http://servidor:1234", useIis: true };
    expect(mesmoServidor(a, { baseUrl: "http://SERVIDOR:1234", useIis: true })).toBe(true);
    expect(mesmoServidor(a, { baseUrl: "http://servidor:1234", useIis: false })).toBe(false);
    expect(mesmoServidor(a, { baseUrl: "http://outro:1234", useIis: true })).toBe(false);
    expect(mesmoServidor({ baseUrl: "", useIis: true }, { baseUrl: "", useIis: true })).toBe(false);
  });

  it("usa o token informado e, sem ele, herda do servidor", () => {
    const irmaos = [{ sysproToken: null }, { sysproToken: " token-do-servidor " }];
    expect(tokenDoServidor(" novo-token ", irmaos)).toBe("novo-token");
    expect(tokenDoServidor("", irmaos)).toBe("token-do-servidor");
    expect(tokenDoServidor(null, irmaos)).toBe("token-do-servidor");
    expect(tokenDoServidor(null, [{ sysproToken: null }])).toBeNull();
    expect(tokenDoServidor(null, [])).toBeNull();
  });
});
