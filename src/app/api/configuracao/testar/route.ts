import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { dataInputParaSyspro, dataParaInput } from "@/lib/vendas";
import { sanitizarSysproUrl } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const rateCheck = checkRateLimit(`config:testar:${session.user.id}`, 20, 60_000);
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: "Limite de testes atingido. Aguarde um momento." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const { baseUrl, useIis } = body;

    if (!baseUrl || typeof baseUrl !== "string") {
      return NextResponse.json(
        { error: "URL da API Syspro não informada." },
        { status: 400 },
      );
    }

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

    const isIis = useIis === "true" || useIis === true;
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
