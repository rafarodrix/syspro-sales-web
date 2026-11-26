/**
 * Grupo (depósito) de estoque do Syspro.
 *
 * O campo `produto_grupo_estoque` vem como "GERAL (1)", "GERAL (2)" — o número
 * entre parênteses é o código do depósito, não outra categoria. Comparar a
 * string crua com o grupo configurado na empresa ("GERAL") descartava **todos**
 * os movimentos: a análise de compras da Lubfiltro aparecia sem saldo e sem
 * dias de estoque para 100% dos produtos.
 */
export function normalizarGrupoEstoque(valor: unknown): string {
  const limpo = String(valor ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
  const semCodigoDoDeposito = limpo.replace(/\s*\(\s*\d+\s*\)\s*$/, "").trim();
  return semCodigoDoDeposito || "GERAL";
}

export function grupoEstoqueCorresponde(valor: unknown, padrao: unknown): boolean {
  return movimentoNoGrupoConfigurado(valor, padrao);
}

/** Identificador do depósito como o Syspro manda: "GERAL (2)", "GERAL", "FISCAL". */
export function identificadorDeposito(valor: unknown): string {
  return String(valor ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/\(\s*(\d+)\s*\)/g, "($1)");
}

/** Lista configurada na empresa (separada por `;` ou `,`). */
export function listaGruposEstoque(valor: unknown): string[] {
  const bruto = String(valor ?? "").trim();
  if (!bruto) return ["GERAL"];
  const entradas = bruto
    .split(/[;,]/)
    .map((entrada) => identificadorDeposito(entrada))
    .filter(Boolean);
  return entradas.length ? entradas : ["GERAL"];
}

/**
 * O movimento entra no saldo?
 *
 * Entrada **sem** código de depósito (ex.: `GERAL`) vale para todos os depósitos
 * do grupo; entrada **com** código (ex.: `GERAL (2)`) vale só para aquele.
 */
export function movimentoNoGrupoConfigurado(
  grupoDoMovimento: unknown,
  configurado: unknown,
): boolean {
  const deposito = identificadorDeposito(grupoDoMovimento) || "GERAL";
  const grupoDoDeposito = normalizarGrupoEstoque(deposito);

  return listaGruposEstoque(configurado).some((entrada) =>
    entrada.includes("(") ? entrada === deposito : entrada === grupoDoDeposito,
  );
}

/** Texto curto para a tela ("GERAL (1) + GERAL (2)" ou "GERAL"). */
export function rotuloGruposEstoque(valor: unknown): string {
  return listaGruposEstoque(valor).join(" + ");
}
