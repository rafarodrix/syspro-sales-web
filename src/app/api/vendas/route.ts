import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { consultarVendas, SysproApiError } from "@/lib/syspro-api";
import { resumoVendas } from "@/lib/vendas";

interface CacheEntry {
  timestamp: number;
  data: any[];
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

  // Empresa deve existir E estar liberada para o usuário (ou ser admin)
  const empresa = await prisma.empresa.findFirst({
    where: {
      id: empresaId,
      ativa: true,
      ...(isAdmin ? {} : { usuarios: { some: { userId: session.user.id } } }),
    },
  });
  if (!empresa) {
    return NextResponse.json(
      { error: "Empresa não encontrada ou não liberada para o usuário" },
      { status: 403 },
    );
  }

  const configuracao = await prisma.configuracao.findFirst();
  const cfg = {
    baseUrl: configuracao?.sysproBaseUrl ?? "",
    useIis: configuracao?.sysproUseIis === "true",
  };
  if (!cfg.baseUrl) {
    return NextResponse.json(
      { error: "Configure a URL da API do Syspro em Configurações" },
      { status: 400 },
    );
  }

  try {
    const cacheKey = `${cfg.baseUrl}_${dtInicial}_${dtFinal}`;
    const agora = Date.now();
    const emCache = vendasCache.get(cacheKey);

    let data: any[];
    if (!forcarAtualizacao && emCache && agora - emCache.timestamp < CACHE_TTL_MS) {
      data = emCache.data;
    } else {
      data = await consultarVendas(cfg, { dtInicial, dtFinal });
      vendasCache.set(cacheKey, { timestamp: agora, data });

      // Limpeza preventiva de cache antigo se crescer muito
      if (vendasCache.size > 50) {
        for (const [k, v] of vendasCache.entries()) {
          if (agora - v.timestamp > CACHE_TTL_MS) vendasCache.delete(k);
        }
      }
    }

    // Filtra a empresa no backend (o browser nunca vê a API do Syspro)
    const filtradas = data.filter(
      (v) => v.empresa_codigo === empresa.empresaCodigo,
    );
    return NextResponse.json({
      vendas: filtradas,
      resumo: resumoVendas(filtradas),
      cached: Boolean(emCache && !forcarAtualizacao && agora - emCache.timestamp < CACHE_TTL_MS),
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
