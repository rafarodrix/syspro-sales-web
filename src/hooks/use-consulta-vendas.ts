"use client";

import { useCallback, useRef, useState } from "react";
import type { VendaComEmpresa, VendaProduto } from "@/lib/syspro-api";
import { buscarVendasApi } from "@/lib/vendas-client";
import { salvarPeriodoCookie, type Periodo } from "@/components/date-range-filter";
import { erroPeriodo } from "@/lib/periodo";

type Venda = VendaProduto | VendaComEmpresa;

interface ConsultaParams {
  empresaId: string;
  periodo: Periodo;
  forcarAtualizacao?: boolean;
  /** Quando informado, busca também o período anterior equivalente (comparativos). */
  periodoAnterior?: Periodo | null;
}

export function useConsultaVendas(initialVendas: Venda[] = [], initialError?: string, initialVendasAnteriores: Venda[] = [], initialComparacaoDisponivel = true) {
  const [vendas, setVendas] = useState<Venda[]>(initialVendas);
  const [vendasAnteriores, setVendasAnteriores] = useState<Venda[]>(initialVendasAnteriores);
  const [erro, setErro] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);
  const [comparacaoDisponivel, setComparacaoDisponivel] = useState(initialComparacaoDisponivel);
  const consultaId = useRef(0);
  const abortController = useRef<AbortController | null>(null);

  const consultar = useCallback(async ({
    empresaId,
    periodo,
    forcarAtualizacao = false,
    periodoAnterior = null,
  }: ConsultaParams) => {
    const erroDatas = erroPeriodo(periodo);
    if (!empresaId || erroDatas) {
      throw new Error(erroDatas ?? "Empresa é obrigatória para a consulta.");
    }

    const idAtual = ++consultaId.current;
    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;
    setLoading(true);
    setErro(null);
    try {
      const [dadosAtuais, comparacao] = await Promise.all([
        buscarVendasApi(empresaId, periodo, { forcarAtualizacao, signal: controller.signal }),
        periodoAnterior?.inicial && periodoAnterior?.final
          ? buscarVendasApi(empresaId, periodoAnterior, { forcarAtualizacao, signal: controller.signal }).then(
              (dados) => ({ dados, disponivel: true }),
              () => ({ dados: [] as Venda[], disponivel: false }),
            )
          : Promise.resolve({ dados: [] as Venda[], disponivel: false }),
      ]);

      if (idAtual !== consultaId.current) return dadosAtuais;
      setVendas(dadosAtuais);
      setVendasAnteriores(comparacao.dados);
      setComparacaoDisponivel(comparacao.disponivel);
      salvarPeriodoCookie(periodo);
      return dadosAtuais;
    } catch (causa) {
      if (causa instanceof DOMException && causa.name === "AbortError") return [];
      const mensagem = causa instanceof Error ? causa.message : "Erro ao consultar as vendas.";
      if (idAtual === consultaId.current) setErro(mensagem);
      throw new Error(mensagem, { cause: causa });
    } finally {
      if (idAtual === consultaId.current) setLoading(false);
    }
  }, []);

  return { vendas, vendasAnteriores, comparacaoDisponivel, erro, loading, consultar };
}
