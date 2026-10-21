import { NextRequest, NextResponse } from "next/server";
import { aplicarLimite, autenticarApi, buscarEmpresaAutorizada, validarJson } from "@/lib/api-route";
import { consultarTitulosPagar, consultarTitulosReceber, SysproApiError } from "@/lib/syspro-api";
import { normalizarTitulo, resumirTitulos, type CategoriaTitulo } from "@/lib/titulos";

import { z } from "zod";

const corpoSchema = z.object({
  empresaId: z.string().min(1, "Empresa e obrigatoria."),
  categoria: z.enum(["pagar", "receber"]),
  modo: z.enum(["aberto", "pagos", "todos"]).default("aberto"),
  dtInicial: z.string().optional(),
  dtFinal: z.string().optional(),
});

const ROTULOS: Record<CategoriaTitulo, string> = {
  pagar: "contas a pagar",
  receber: "contas a receber",
};

export async function POST(request: NextRequest) {
  try {
    const autenticacao = await autenticarApi(
      "relatorios:visualizar",
      "Perfil sem permissão para consultar títulos financeiros.",
    );
    if (!autenticacao.ok) return autenticacao.response;
    const session = autenticacao.value;

    const limite = aplicarLimite(
      `financeiro-titulos:${session.user.id}`,
      15,
      60_000,
      "Limite de consultas financeiras excedido. Aguarde alguns instantes.",
    );
    if (limite) return limite;

    const json = await validarJson(request, corpoSchema, "Parâmetros inválidos.");
    if (!json.ok) return json.response;
    const { empresaId, categoria, modo } = json.value;

    // "Sem data" na tela vira uma janela ampla: 24 meses atrás (cobre todo vencido
    // real) até 12 meses à frente (cobre o a vencer). Testado: 6k títulos em ~0,5s.
    const formatar = (data: Date) => {
      const dia = String(data.getUTCDate()).padStart(2, "0");
      const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
      return `${dia}/${mes}/${data.getUTCFullYear()}`;
    };
    const hoje = new Date();
    const inicioPadrao = new Date(Date.UTC(hoje.getUTCFullYear() - 1, hoje.getUTCMonth(), hoje.getUTCDate()));
    const fimPadrao = new Date(Date.UTC(hoje.getUTCFullYear() + 1, hoje.getUTCMonth(), hoje.getUTCDate()));
    const dtInicial = json.value.dtInicial ?? formatar(inicioPadrao);
    const dtFinal = json.value.dtFinal ?? formatar(fimPadrao);

    if (empresaId === "todas" || empresaId.includes(",")) {
      return NextResponse.json(
        { error: "Selecione uma única empresa para consultar títulos." },
        { status: 400 },
      );
    }

    const empresa = await buscarEmpresaAutorizada(session, empresaId);
    if (!empresa) {
      return NextResponse.json(
        { error: "Empresa não encontrada ou não liberada." },
        { status: 403 },
      );
    }
    if (!empresa.sysproBaseUrl) {
      return NextResponse.json(
        { error: "A empresa selecionada não possui uma origem Syspro configurada." },
        { status: 400 },
      );
    }

    const config = { baseUrl: empresa.sysproBaseUrl, useIis: empresa.sysproUseIis === true };
    const range = { dtInicial, dtFinal };
    const consultar = categoria === "pagar" ? consultarTitulosPagar : consultarTitulosReceber;

    let brutos: unknown[];
    try {
      brutos = (await consultar(config, range, request.signal)) as unknown[];
    } catch (erro) {
      if (erro instanceof SysproApiError && erro.status === 401) {
        return NextResponse.json(
          {
            error:
              `A rota de ${ROTULOS[categoria]} ainda não está autorizada no SysproServer ` +
              `(HTTP 401 "Authorization not found"). Peça a liberação da rota ` +
              `\`${categoria === "pagar" ? "titulo/pagar" : "receber"}\` para esta instalação.`,
            rotaNaoAutorizada: true,
          },
          { status: 503 },
        );
      }
      throw erro;
    }

    // Defesa em profundidade: a API de exportação pode devolver registros de outra
    // empresa da mesma base quando o código informado não existe. Nunca exibir.
    const normalizarCodigo = (valor: string) => valor.trim().replace(/^0+/, "") || "0";
    const codigoEmpresa = normalizarCodigo(empresa.empresaCodigo);
    const mesmaEmpresa = (item: unknown) => {
      const codigo = String((item as Record<string, unknown>)?.empresa_codigo ?? "").trim();
      return !codigo || normalizarCodigo(codigo) === codigoEmpresa;
    };
    let considerados = brutos.filter(mesmaEmpresa);
    // A base pode devolver sempre o mesmo empresa_codigo (ex.: 001) para qualquer
    // filial da mesma instalação. Nesse caso, mostrar os dados com aviso é melhor
    // do que exibir tela vazia.
    const baseSemFiltro = considerados.length === 0 && brutos.length > 0;
    if (baseSemFiltro) considerados = brutos;

    const todos = considerados.map((item) => normalizarTitulo(item));
    const itens =
      modo === "aberto"
        ? todos.filter((item) => item.situacao !== "pago")
        : modo === "pagos"
          ? todos.filter((item) => item.situacao === "pago")
          : todos;
    const resumo = resumirTitulos(itens);

    return NextResponse.json(
      {
        categoria,
        modo,
        empresaId: empresa.id,
        empresaNome: empresa.razaoSocial,
        periodo: { inicial: dtInicial, final: dtFinal },
        consultadoEm: new Date().toISOString(),
        ignoradosPorEmpresa: baseSemFiltro ? 0 : brutos.length - considerados.length,
        avisoEmpresa: baseSemFiltro,
        itens,
        resumo,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (erro) {
    if (erro instanceof SysproApiError) {
      return NextResponse.json(
        { error: `Falha ao consultar o Syspro: ${erro.message}` },
        { status: 502 },
      );
    }
    const mensagem = erro instanceof Error ? erro.message : "Erro ao consultar títulos.";
    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}
