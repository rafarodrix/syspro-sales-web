import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  chaveConsulta,
  definirUsuarioDoCache,
  executarDeduplicado,
  gravarCache,
  invalidarCache,
  lerCache,
  tamanhoCache,
  vooAtual,
} from "@/lib/cache-consulta";

describe("cache de consulta", () => {
  beforeEach(() => {
    invalidarCache();
  });

  it("monta a chave independente da ordem e ignora campos vazios", () => {
    const a = chaveConsulta({ empresa: "e1", inicial: "2026-09-01", final: "2026-09-30" });
    const b = chaveConsulta({ final: "2026-09-30", inicial: "2026-09-01", empresa: "e1" });
    expect(a).toBe(b);
    expect(chaveConsulta({ empresa: "e1", usuario: undefined, busca: "" })).toBe("empresa=e1");
  });

  it("devolve o dado dentro do TTL e descarta depois", () => {
    gravarCache("k", { total: 10 }, 1_000);
    expect(lerCache<{ total: number }>("k", 5_000, 4_000)?.dados).toEqual({ total: 10 });
    expect(lerCache("k", 5_000, 7_000)).toBeNull();
    expect(tamanhoCache()).toBe(0);
  });

  it("deduplica chamadas simultâneas e guarda o resultado", async () => {
    const buscar = vi.fn().mockResolvedValue("valor");
    const [a, b] = await Promise.all([
      executarDeduplicado("dup", buscar),
      executarDeduplicado("dup", buscar),
    ]);

    expect(a).toBe("valor");
    expect(b).toBe("valor");
    expect(buscar).toHaveBeenCalledTimes(1);
    expect(lerCache<string>("dup")?.dados).toBe("valor");
    expect(vooAtual("dup")).toBeUndefined();
  });

  it("não guarda resultado de consulta que falhou", async () => {
    await expect(executarDeduplicado("falha", () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    expect(lerCache("falha")).toBeNull();
    expect(vooAtual("falha")).toBeUndefined();
  });

  it("invalida só o que casa com o prefixo", () => {
    gravarCache("margens&empresa=e1", 1);
    gravarCache("margens&empresa=e2", 2);
    gravarCache("compras&empresa=e1", 3);

    invalidarCache("margens");

    expect(lerCache("margens&empresa=e1")).toBeNull();
    expect(lerCache("margens&empresa=e2")).toBeNull();
    expect(lerCache<number>("compras&empresa=e1")?.dados).toBe(3);
  });

  it("descarta tudo ao trocar de usuário (nunca serve dado de outra pessoa)", () => {
    definirUsuarioDoCache("usuario-a");
    gravarCache("k", "dado do A");
    expect(lerCache("k")).not.toBeNull();

    definirUsuarioDoCache("usuario-b");
    expect(lerCache("k")).toBeNull();
    expect(tamanhoCache()).toBe(0);
  });
});
