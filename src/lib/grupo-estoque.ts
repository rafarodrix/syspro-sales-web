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
  return normalizarGrupoEstoque(valor) === normalizarGrupoEstoque(padrao);
}
