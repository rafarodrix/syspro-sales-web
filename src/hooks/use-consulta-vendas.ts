"use client";

import { useCallback, useState } from "react";
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

    setLoading(true);
    setErro(null);
    try {
      const [dadosAtuais, comparacao] = await Promise.all([
        buscarVendasApi(empresaId, periodo, { forcarAtualizacao }),
        periodoAnterior?.inicial && periodoAnterior?.final
          ? buscarVendasApi(empresaId, periodoAnterior, { forcarAtualizacao }).then(
              (dados) => ({ dados, disponivel: true }),
              () => ({ dados: [] as Venda[], disponivel: false }),
            )
          : Promise.resolve({ dados: [] as Venda[], disponivel: false }),
      ]);

      setVendas(dadosAtuais);
      setVendasAnteriores(comparacao.dados);
      setComparacaoDisponivel(comparacao.disponivel);
      salvarPeriodoCookie(periodo);
      return dadosAtuais;
    } catch (causa) {
      const mensagem = causa instanceof Error ? causa.message : "Erro ao consultar as vendas.";
      setErro(mensagem);
      throw new Error(mensagem, { cause: causa });
    } finally {
      setLoading(false);
    }
  }, []);

  return { vendas, vendasAnteriores, comparacaoDisponivel, erro, loading, consultar };
}
