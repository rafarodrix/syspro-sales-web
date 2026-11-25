import { NextRequest, NextResponse } from "next/server";

import { aplicarLimite, autenticarApi, validarJson } from "@/lib/api-route";
import { prisma } from "@/lib/database";
import { temAcessoTodasEmpresas } from "@/lib/role-permissions";
import { sanitizarSysproUrl } from "@/lib/validations";
import { vendasQuerySchema } from "@/lib/validations";

/**
 * Cadastro de clientes com telefone.
 *
 * A rota de exportação de vendas não devolve código nem telefone do cliente;
 * esses dados vivem em PARTICIPANTE + PARTICIPANTE_FONE, lidos pela rota
 * /api/dynamic/query. Serve para cruzar com o relatório de itens por cliente
 * (o cruzamento é por nome, então homônimos podem aparecer com o mesmo contato).
 */
export async function POST(request: NextRequest) {
  try {
    const autenticacao = await autenticarApi(
      "relatorios:visualizar",
      "Perfil sem permissão para consultar o cadastro de clientes.",
    );
    if (!autenticacao.ok) return autenticacao.response;
    const session = autenticacao.value;

    const limite = aplicarLimite(
      `clientes-cadastro:${session.user.id}`,
      15,
      60_000,
      "Limite de consultas excedido. Aguarde alguns instantes.",
    );
    if (limite) return limite;

    const json = await validarJson(request, vendasQuerySchema, "Parâmetros inválidos.");
    if (!json.ok) return json.response;

    const isAdmin = temAcessoTodasEmpresas(session.user.role);
    const empresa = await prisma.empresa.findUnique({ where: { id: json.value.empresaId } });
    const liberadas = await prisma.empresa.findMany({
      where: {
        ativa: true,
        ...(isAdmin ? {} : { usuarios: { some: { userId: session.user.id } } }),
      },
      select: { id: true },
    });
    if (!empresa || !liberadas.some((item) => item.id === empresa.id)) {
      return NextResponse.json({ error: "Empresa não encontrada ou não liberada." }, { status: 403 });
    }

    const base = sanitizarSysproUrl(empresa.sysproBaseUrl);
    const prefixo = empresa.sysproUseIis ? "/sysproserverisapi.dll" : "";
    const url = `${base}${prefixo}/api/dynamic/query`;

    const sql = [
      "select p.id_participante as id, p.nome as nome, f.tp_fone as tipo, f.ddd as ddd, f.fone as fone",
      "from participante p",
      "left join participante_fone f on f.id_participante = p.id_participante and (f.ativo is null or f.ativo = 1)",
      "where p.nome is not null",
    ].join("\n");

    const resposta = await fetch(url, {
      method: "PUT",
      signal: AbortSignal.timeout(120_000),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(empresa.sysproToken?.trim() ? { Authorization: `Bearer ${empresa.sysproToken.trim()}` } : {}),
      },
      body: JSON.stringify({ sql }),
      cache: "no-store",
    });

    if (resposta.status === 404) {
      return NextResponse.json(
        {
          error:
            "Esta instalação do SysproServer não expõe /api/dynamic/query: o telefone do cliente não pode ser lido aqui.",
        },
        { status: 501 },
      );
    }
    if (resposta.status === 401) {
      return NextResponse.json(
        { error: "A API do Syspro exigiu autenticação (HTTP 401). Confira o token da empresa." },
        { status: 401 },
      );
    }
    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => "");
      return NextResponse.json(
        { error: `Erro ${resposta.status} ao ler o cadastro de clientes. ${corpo.slice(0, 160)}`.trim() },
        { status: 502 },
      );
    }

    const dados = (await resposta.json().catch(() => null)) as { result?: unknown } | null;
    const linhas = Array.isArray(dados?.result) ? (dados!.result as Record<string, unknown>[]) : [];

    const porCliente = new Map<string, { id: string; nome: string; telefone: string; tipo: string }>();
    for (const linha of linhas) {
      const id = String(linha.id ?? "").trim();
      const nome = String(linha.nome ?? "").replace(/\s+/g, " ").trim();
      if (!id || !nome) continue;
      const tipo = String(linha.tipo ?? "").trim().toUpperCase();
      const ddd = String(linha.ddd ?? "").trim();
      const fone = String(linha.fone ?? "").trim();
      const telefone = fone ? (ddd ? `(${ddd}) ${fone}` : fone) : "";

      const atual = porCliente.get(id) ?? { id, nome, telefone: "", tipo: "" };
      // Prefere celular; depois principal; por último qualquer número.
      const peso = (t: string) => (t === "CELULAR" ? 3 : t === "PRINCIPAL" ? 2 : t ? 1 : 0);
      if (telefone && peso(tipo) >= peso(atual.tipo)) {
        atual.telefone = telefone;
        atual.tipo = tipo;
      }
      porCliente.set(id, atual);
    }

    return NextResponse.json(
      {
        clientes: [...porCliente.values()].map((cliente) => ({
          codigo: cliente.id,
          nome: cliente.nome,
          telefone: cliente.telefone,
        })),
        total: porCliente.size,
      },
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Erro ao ler o cadastro de clientes.";
    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}
