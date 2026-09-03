export function destinoPosLoginSeguro(valor: string | null): string {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.includes("\\")) {
    return "/dashboard";
  }
  return valor;
}
