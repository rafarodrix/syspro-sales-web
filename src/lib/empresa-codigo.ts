/**
 * O Syspro devolve `empresa_codigo` sem zeros à esquerda ("1"), enquanto o
 * cadastro costuma ser digitado como "01" ou "001". Comparar as strings cruas
 * zerava a consulta inteira sem erro — o usuário via "0 vendas" e ia procurar
 * problema em token ou rede.
 */
export function normalizarEmpresaCodigo(valor: unknown): string {
  const limpo = String(valor ?? "").trim();
  if (!limpo) return "";
  const semZeros = limpo.replace(/^0+/, "");
  return (semZeros || "0").toUpperCase();
}

export function mesmaEmpresaCodigo(a: unknown, b: unknown): boolean {
  const esquerda = normalizarEmpresaCodigo(a);
  const direita = normalizarEmpresaCodigo(b);
  return esquerda !== "" && esquerda === direita;
}
