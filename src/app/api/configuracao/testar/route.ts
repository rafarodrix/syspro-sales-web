import { NextResponse } from "next/server";
import { aplicarLimite, autenticarApi, validarJson } from "@/lib/api-route";
import { dataInputParaSyspro, dataParaInput } from "@/lib/vendas";
import { configuracaoTesteSchema, sanitizarSysproUrl } from "@/lib/validations";

export async function POST(request: Request) {
  const autenticacao = await autenticarApi("configuracoes:gerenciar", "Acesso não autorizado.");
  if (!autenticacao.ok) return autenticacao.response;
  const session = autenticacao.value;

  const limite = aplicarLimite(`config:testar:${session.user.id}`, 20, 60_000, "Limite de testes atingido. Aguarde um momento.");
  if (limite) return limite;

  try {
    const json = await validarJson(request, configuracaoTesteSchema, "Configuração inválida.");
    if (!json.ok) return json.response;
    const { baseUrl, useIis } = json.value;

    let sanitizedBase: string;
    try {
      sanitizedBase = sanitizarSysproUrl(baseUrl);
    } catch (urlErr) {
      return NextResponse.json(
        { error: urlErr instanceof Error ? urlErr.message : "URL inválida." },
        { status: 400 },
      );
    }

    const hoje = new Date();
    const seteDiasAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dtInicial = dataInputParaSyspro(dataParaInput(seteDiasAtras));
    const dtFinal = dataInputParaSyspro(dataParaInput(hoje));

    const isIis = useIis;
    const prefixo = isIis
      ? "/sysproserverisapi.dll/api/exporta/produto/venda"
      : "/api/exporta/produto/venda";
    
    const urlFinal = `${sanitizedBase}${prefixo}?dt_inicial=${dtInicial}&dt_final=${dtFinal}`;

    const inicio = performance.now();
    let response: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      response = await fetch(urlFinal, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
        redirect: "error",
      });
      clearTimeout(timeoutId);
    } catch (fetchErr) {
      const fim = Math.round(performance.now() - inicio);
      return NextResponse.json({
        ok: false,
        latencyMs: fim,
        urlTestada: urlFinal,
        error: `Falha ao conectar no host: ${fetchErr instanceof Error ? fetchErr.message : "Timeout ou erro de rede"}`,
      });
    }

    const fim = Math.round(performance.now() - inicio);
    if (!response.ok) {
      let sugestao: string | undefined;
      if (response.status === 404) {
        sugestao = isIis
          ? "Recebeu 404. Tente desmarcar 'Com IIS' para usar /api/exporta/ direto."
          : "Recebeu 404. Tente marcar 'Com IIS' para usar /sysproserverisapi.dll/api/exporta/.";
      }
      return NextResponse.json({
        ok: false,
        status: response.status,
        statusText: response.statusText,
        latencyMs: fim,
        urlTestada: urlFinal,
        sugestao,
        error: `Servidor retornou HTTP ${response.status} (${response.statusText})`,
      });
    }

    const data = await response.json().catch(() => null);
    const registros = Array.isArray(data) ? data.length : 0;

    return NextResponse.json({
      ok: true,
      status: response.status,
      latencyMs: fim,
      urlTestada: urlFinal,
      registrosRetornados: registros,
      mensagem: `Conexão bem sucedida! ${registros} registros nos últimos 7 dias.`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido ao testar conexão." },
      { status: 500 },
    );
  }
}
