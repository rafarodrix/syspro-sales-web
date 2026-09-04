"use client";

import { useCallback, useState } from "react";
import type { VendaComEmpresa, VendaProduto } from "@/lib/syspro-api";
import { buscarVendasApi } from "@/lib/vendas-client";
import { salvarPeriodoCookie, type Periodo } from "@/components/date-range-filter";

type Venda = VendaProduto | VendaComEmpresa;

export function useConsultaVendas(initialVendas: Venda[] = [], initialError?: string) {
  const [vendas, setVendas] = useState<Venda[]>(initialVendas);
  const [erro, setErro] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);

  const consultar = useCallback(async ({
    empresaId,
    periodo,
    forcarAtualizacao = false,
  }: {
    empresaId: string;
    periodo: Periodo;
    forcarAtualizacao?: boolean;
  }) => {
    if (!empresaId || !periodo.inicial || !periodo.final) {
      throw new Error("Empresa e período são obrigatórios para a consulta.");
    }

    salvarPeriodoCookie(periodo);
    setLoading(true);
    setErro(null);
    try {
      const dados = await buscarVendasApi(empresaId, periodo, { forcarAtualizacao });
      setVendas(dados);
      return dados;
    } catch (causa) {
      const mensagem = causa instanceof Error ? causa.message : "Erro ao consultar as vendas.";
      setErro(mensagem);
      throw new Error(mensagem, { cause: causa });
    } finally {
      setLoading(false);
    }
  }, []);

  return { vendas, erro, loading, consultar };
}
