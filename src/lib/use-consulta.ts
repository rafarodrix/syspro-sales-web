"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  TTL_CONSULTA_PADRAO,
  definirUsuarioDoCache,
  executarDeduplicado,
  invalidarCache,
  lerCache,
} from "@/lib/cache-consulta";

interface EstadoConsulta<T> {
  chave: string;
  dados: T | null;
  erro: string | null;
  carregando: boolean;
  consultadoEm: number | null;
}

export interface ResultadoConsulta<T> {
  dados: T | null;
  erro: string | null;
  /** Primeira carga da chave (sem dado em cache para mostrar). */
  carregando: boolean;
  /** Atualização em cima de dado já exibido. */
  atualizando: boolean;
  consultadoEm: number | null;
  atualizar: () => void;
}

function mensagemDeErro(erro: unknown): string {
  if (erro instanceof Error) return erro.message;
  return "Não foi possível consultar os dados.";
}

/**
 * Consulta com cache por chave, deduplicação e atualização manual.
 *
 * Regras:
 * - se a chave já tem dado válido, a tela abre preenchida e NÃO consulta;
 * - montagem dupla (StrictMode, navegação) reaproveita a requisição em andamento;
 * - se o componente sair da tela no meio da consulta, ela continua e o cache é
 *   preenchido — voltar para a aba não refaz o trabalho;
 * - `atualizar()` ignora o cache e busca novamente.
 */
export function useConsulta<T>({
  chave,
  buscar,
  ttlMs = TTL_CONSULTA_PADRAO,
  habilitado = true,
  usuarioId,
}: {
  chave: string;
  buscar: () => Promise<T>;
  ttlMs?: number;
  habilitado?: boolean;
  usuarioId?: string | null;
}): ResultadoConsulta<T> {
  const [versao, setVersao] = useState(0);
  const [estado, setEstado] = useState<EstadoConsulta<T>>(() => {
    const entrada = lerCache<T>(chave, ttlMs);
    return {
      chave,
      dados: entrada?.dados ?? null,
      erro: null,
      carregando: habilitado && !entrada,
      consultadoEm: entrada?.em ?? null,
    };
  });

  useEffect(() => {
    definirUsuarioDoCache(usuarioId);
  }, [usuarioId]);

  // Troca de chave (empresa/período/usuário): a tela passa a refletir o cache da
  // nova chave no mesmo render, sem piscar skeleton de um dado que já existe.
  if (estado.chave !== chave) {
    const entrada = lerCache<T>(chave, ttlMs);
    setEstado({
      chave,
      dados: entrada?.dados ?? null,
      erro: null,
      carregando: habilitado && !entrada,
      consultadoEm: entrada?.em ?? null,
    });
  }

  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;
  const chaveRef = useRef(chave);
  chaveRef.current = chave;

  useEffect(() => {
    if (!habilitado) {
      setEstado((atual) => (atual.chave === chave ? { ...atual, carregando: false } : atual));
      return;
    }
    const entrada = lerCache<T>(chave, ttlMs);
    if (entrada) {
      setEstado((atual) =>
        atual.chave !== chave
          ? atual
          : { ...atual, dados: entrada.dados, carregando: false, consultadoEm: entrada.em },
      );
      return;
    }

    let ativo = true;
    setEstado((atual) => (atual.chave === chave ? { ...atual, carregando: true, erro: null } : atual));

    executarDeduplicado(chave, () => buscarRef.current())
      .then((dados) => {
        if (!ativo || chaveRef.current !== chave) return;
        setEstado({ chave, dados, erro: null, carregando: false, consultadoEm: Date.now() });
      })
      .catch((erro: unknown) => {
        if (!ativo || chaveRef.current !== chave) return;
        setEstado((atual) =>
          atual.chave === chave ? { ...atual, carregando: false, erro: mensagemDeErro(erro) } : atual,
        );
      });

    // Sem abort ao desmontar: a consulta termina e o cache fica quente.
    return () => {
      ativo = false;
    };
  }, [chave, habilitado, ttlMs, versao]);

  const atualizar = useCallback(() => {
    invalidarCache(chave);
    setVersao((valor) => valor + 1);
  }, [chave]);

  return {
    dados: estado.dados,
    erro: estado.erro,
    carregando: estado.carregando,
    atualizando: estado.carregando && estado.dados !== null,
    consultadoEm: estado.consultadoEm,
    atualizar,
  };
}
