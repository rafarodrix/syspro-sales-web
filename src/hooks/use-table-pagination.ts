"use client";

import { useCallback, useMemo, useState } from "react";

export function useTablePagination<T>(itens: T[], quantidadeInicial = 25) {
  const [pagina, setPagina] = useState(1);
  const [itensPorPagina, setItensPorPaginaState] = useState(quantidadeInicial);
  const totalPaginas = Math.max(1, Math.ceil(itens.length / itensPorPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const itensPaginados = useMemo(
    () => itens.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina),
    [itens, itensPorPagina, paginaAtual],
  );

  const setItensPorPagina = useCallback((quantidade: number) => {
    setItensPorPaginaState(quantidade);
    setPagina(1);
  }, []);
  const reiniciar = useCallback(() => setPagina(1), []);

  return {
    itensPaginados,
    paginaAtual,
    itensPorPagina,
    setPagina,
    setItensPorPagina,
    reiniciar,
  };
}
