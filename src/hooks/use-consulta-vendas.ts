"use client";

import { useCallback, useState } from "react";
import type { VendaComEmpresa, VendaProduto } from "@/lib/syspro-api";
import { buscarVendasApi } from "@/lib/vendas-client";
import { salvarPeriodoCookie, type Periodo } from "@/components/date-range-filter";

type Venda = VendaProduto | VendaComEmpresa;

interface ConsultaParams {
  empresaId: string;
  periodo: Periodo;
  forcarAtualizacao?: boolean;
  /** Quando informado, busca também o período anterior equivalente (comparativos). */
  periodoAnterior?: Periodo | null;
}

export function useConsultaVendas(initialVendas: Venda[] = [], initialError?: string, initialVendasAnteriores: Venda[] = []) {
  const [vendas, setVendas] = useState<Venda[]>(initialVendas);
  const [vendasAnteriores, setVendasAnteriores] = useState<Venda[]>(initialVendasAnteriores);
  const [erro, setErro] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);

  const consultar = useCallback(async ({
    empresaId,
    periodo,
    forcarAtualizacao = false,
    periodoAnterior = null,
  }: ConsultaParams) => {
    if (!empresaId || !periodo.inicial || !periodo.final) {
      throw new Error("Empresa e período são obrigatórios para a consulta.");
    }

    salvarPeriodoCookie(periodo);
    setLoading(true);
    setErro(null);
    try {
      const [dadosAtuais, dadosAnteriores] = await Promise.all([
        buscarVendasApi(empresaId, periodo, { forcarAtualizacao }),
        periodoAnterior?.inicial && periodoAnterior?.final
          ? buscarVendasApi(empresaId, periodoAnterior, { forcarAtualizacao })
          : Promise.resolve([] as Venda[]),
      ]);

      setVendas(dadosAtuais);
      setVendasAnteriores(dadosAnteriores);
      return dadosAtuais;
    } catch (causa) {
      const mensagem = causa instanceof Error ? causa.message : "Erro ao consultar as vendas.";
      setErro(mensagem);
      throw new Error(mensagem, { cause: causa });
    } finally {
      setLoading(false);
    }
  }, []);

  return { vendas, vendasAnteriores, erro, loading, consultar };
}
