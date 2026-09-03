import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { consultarVendas, SysproApiError, type VendaProduto } from "@/lib/syspro-api";
import { resumoVendas } from "@/lib/vendas";

interface CacheEntry {
  timestamp: number;
  data: (VendaProduto & { empresa_id?: string; empresa_nome?: string; empresa_cnpj?: string })[];
}

const vendasCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 45 * 1000; // 45 segundos

export async function POST(request: NextRequest) {
  try {
    return await handleVendas(request);
  } catch (e) {
    console.error("[api/vendas] ERRO NAO TRATADO:", e);
    return NextResponse.json(
      { error: "Erro interno ao consultar vendas" },
      { status: 500 },
    );
  }
}

async function handleVendas(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const isAdmin = session.user.role === "admin";

  let body: { empresaId?: string; dtInicial?: string; dtFinal?: string; forcarAtualizacao?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { empresaId, dtInicial, dtFinal, forcarAtualizacao } = body;
  if (!empresaId || !dtInicial || !dtFinal) {
    return NextResponse.json(
      { error: "Empresa e período são obrigatórios" },
      { status: 400 },
    );
  }
  if (!periodoValido(dtInicial, dtFinal)) {
    return NextResponse.json(
      { error: "Informe um período válido de até 366 dias." },
      { status: 400 },
    );
  }

  // Buscar empresas liberadas para o usuário
  const empresasLiberadas = await prisma.empresa.findMany({
    where: {
      ativa: true,
      ...(isAdmin ? {} : { usuarios: { some: { userId: session.user.id } } }),
    },
    orderBy: { razaoSocial: "asc" },
  });

  if (empresasLiberadas.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma empresa disponível ou liberada para o usuário" },
      { status: 403 },
    );
  }

  // MODO CONSOLIDADO (Todas as Empresas)
  if (empresaId === "todas") {
    try {
      const agora = Date.now();
      const promessas = empresasLiberadas.map(async (emp) => {
        const cfg = {
          baseUrl: emp.sysproBaseUrl || "http://localhost:8080",
          useIis: emp.sysproUseIis === "true",
        };
        const cacheKey = `${emp.id}_${dtInicial}_${dtFinal}`;
        const emCache = vendasCache.get(cacheKey);

        if (!forcarAtualizacao && emCache && agora - emCache.timestamp < CACHE_TTL_MS) {
          return emCache.data;
        }

        try {
          const data = await consultarVendas(cfg, { dtInicial, dtFinal });
          const filtradas = data
            .filter((v) => v.empresa_codigo === emp.empresaCodigo)
            .map((v) => ({
              ...v,
              empresa_id: emp.id,
              empresa_nome: emp.razaoSocial,
              empresa_cnpj: emp.cnpj,
            }));

          vendasCache.set(cacheKey, { timestamp: agora, data: filtradas });
          return filtradas;
        } catch (err) {
          console.error(`[api/vendas] Falha ao consultar empresa ${emp.razaoSocial}:`, err);
          return [];
        }
      });

      const resultados = await Promise.all(promessas);
      const consolidadas = resultados.flat();

      return NextResponse.json({
        vendas: consolidadas,
        resumo: resumoVendas(consolidadas),
        isConsolidado: true,
        totalEmpresas: empresasLiberadas.length,
      });
    } catch (e) {
      return NextResponse.json(
        { error: "Erro ao consolidar vendas das empresas." },
        { status: 502 },
      );
    }
  }

  // MODO INDIVIDUAL (Empresa Única)
  const empresa = empresasLiberadas.find((e) => e.id === empresaId);
  if (!empresa) {
    return NextResponse.json(
      { error: "Empresa não encontrada ou não liberada para o usuário" },
      { status: 403 },
    );
  }

  const cfg = {
    baseUrl: empresa.sysproBaseUrl || "http://localhost:8080",
    useIis: empresa.sysproUseIis === "true",
  };
  if (!cfg.baseUrl) {
    return NextResponse.json(
      { error: `Configure a URL da API do Syspro para a empresa "${empresa.razaoSocial}" em Configurações.` },
      { status: 400 },
    );
  }

  try {
    const cacheKey = `${empresa.id}_${dtInicial}_${dtFinal}`;
    const agora = Date.now();
    const emCache = vendasCache.get(cacheKey);

    let filtradas: (VendaProduto & { empresa_id?: string; empresa_nome?: string; empresa_cnpj?: string })[];
    if (!forcarAtualizacao && emCache && agora - emCache.timestamp < CACHE_TTL_MS) {
      filtradas = emCache.data;
    } else {
      const data = await consultarVendas(cfg, { dtInicial, dtFinal });
      filtradas = data
        .filter((v) => v.empresa_codigo === empresa.empresaCodigo)
        .map((v) => ({
          ...v,
          empresa_id: empresa.id,
          empresa_nome: empresa.razaoSocial,
          empresa_cnpj: empresa.cnpj,
        }));
      vendasCache.set(cacheKey, { timestamp: agora, data: filtradas });

      // Limpeza preventiva de cache antigo se crescer muito
      if (vendasCache.size > 50) {
        for (const [k, v] of vendasCache.entries()) {
          if (agora - v.timestamp > CACHE_TTL_MS) vendasCache.delete(k);
        }
      }
    }

    return NextResponse.json({
      vendas: filtradas,
      resumo: resumoVendas(filtradas),
      cached: Boolean(emCache && !forcarAtualizacao && agora - emCache.timestamp < CACHE_TTL_MS),
      isConsolidado: false,
    });
  } catch (e) {
    if (e instanceof SysproApiError) {
      return NextResponse.json(
        { error: e.message },
        { status: e.status ?? 502 },
      );
    }
    return NextResponse.json(
      { error: "Erro ao consultar a API do Syspro" },
      { status: 502 },
    );
  }
}

function periodoValido(inicial: string, final: string) {
  const padrao = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  if (!padrao.test(inicial) || !padrao.test(final)) return false;
  const paraData = (valor: string) => {
    const [dia, mes, ano] = valor.split("/").map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    return data.getUTCFullYear() === ano &&
      data.getUTCMonth() === mes - 1 &&
      data.getUTCDate() === dia
      ? data
      : null;
  };
  const inicio = paraData(inicial);
  const fim = paraData(final);
  return Boolean(
    inicio &&
    fim &&
    inicio <= fim &&
    fim.getTime() - inicio.getTime() <= 366 * 86_400_000,
  );
}
