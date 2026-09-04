"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

interface SeletorMultiploProps {
  /** Opções disponíveis (já ordenadas pelo chamador, se desejar). */
  valores: string[];
  /** Valores selecionados. Array vazio = "todos". */
  selecionados: string[];
  onChange: (selecionados: string[]) => void;
  /** Rótulo usado no placeholder ("Cliente", "Vendedor"...). */
  rotulo: string;
  /** Quantidade máxima de opções visíveis no painel antes do scroll. */
  limiteVisivel?: number;
}

/**
 * Seletor com busca e múltipla escolha, usado nos filtros analíticos.
 * Com muitos clientes/vendedores, o dropdown simples fica inviável;
 * aqui é possível digitar para filtrar e marcar vários valores.
 */
export function SeletorMultiplo({
  valores,
  selecionados,
  onChange,
  rotulo,
  limiteVisivel = 12,
}: SeletorMultiploProps) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(evento: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(evento.target as Node)) {
        setAberto(false);
      }
    }
    function aoPressionarEsc(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoPressionarEsc);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoPressionarEsc);
    };
  }, [aberto]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return valores;
    return valores.filter((valor) => valor.toLowerCase().includes(termo));
  }, [valores, busca]);

  const todosSelecionados = selecionados.length === 0;
  const rotuloSelecao = todosSelecionados
    ? `Todos os ${rotulo.toLowerCase()}s`
    : selecionados.length === 1
      ? selecionados[0]
      : `${selecionados.length} ${rotulo.toLowerCase()}s selecionados`;

  function alternarValor(valor: string) {
    if (todosSelecionados) {
      onChange([valor]);
      return;
    }
    const jaSelecionado = selecionados.includes(valor);
    const proximo = jaSelecionado
      ? selecionados.filter((item) => item !== valor)
      : [...selecionados, valor];
    onChange(proximo.length === valores.length ? [] : proximo);
  }

  return (
    <div ref={containerRef} className="relative min-w-52">
      {/* Gatilho do seletor */}
      <button
        type="button"
        onClick={() => {
          setAberto((atual) => !atual);
          setBusca("");
        }}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-md border bg-background px-2 text-xs font-medium text-foreground hover:bg-muted/40"
        aria-haspopup="listbox"
        aria-expanded={aberto}
      >
        <span className="truncate">{rotuloSelecao}</span>
        <ChevronDown className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      {/* Painel com busca e checkboxes */}
      {aberto && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 rounded-md border bg-popover p-1.5 shadow-lg">
          <div className="relative">
            <Search className="absolute left-2 top-2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              autoFocus
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder={`Buscar ${rotulo.toLowerCase()}...`}
              className="h-8 w-full rounded-md border bg-background pl-7 pr-6 text-xs outline-hidden focus:ring-2 focus:ring-primary"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                aria-label="Limpar busca"
                className="absolute right-1.5 top-2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="mt-1.5 border-b pb-1.5">
            <button
              type="button"
              onClick={() => onChange([])}
              className={`flex w-full items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted/50 ${todosSelecionados ? "font-bold text-foreground" : "text-muted-foreground"}`}
            >
              <span className={`flex size-3.5 items-center justify-center rounded-sm border ${todosSelecionados ? "border-primary bg-primary" : "border-border"}`}>
                {todosSelecionados && <Check className="size-2.5 text-primary-foreground" />}
              </span>
              Todos
            </button>
          </div>

          <ul role="listbox" aria-multiselectable="true" className="max-h-56 overflow-y-auto py-1">
            {filtrados.length === 0 ? (
              <li className="px-1.5 py-2 text-center text-xs text-muted-foreground">
                Nenhuma opção encontrada.
              </li>
            ) : (
              filtrados.map((valor) => {
                const marcado = todosSelecionados || selecionados.includes(valor);
                return (
                  <li key={valor}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={marcado}
                      onClick={() => alternarValor(valor)}
                      className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-muted/50"
                    >
                      <span className={`flex size-3.5 shrink-0 items-center justify-center rounded-sm border ${marcado ? "border-primary bg-primary" : "border-border"}`}>
                        {marcado && <Check className="size-2.5 text-primary-foreground" />}
                      </span>
                      <span className="truncate">{valor}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {valores.length > limiteVisivel && (
            <div className="border-t pt-1 text-[10px] text-muted-foreground">
              {filtrados.length} de {valores.length} opções — digite para filtrar
            </div>
          )}
        </div>
      )}
    </div>
  );
}
