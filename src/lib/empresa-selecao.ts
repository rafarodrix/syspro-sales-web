interface EmpresaSelecionavel {
  id: string;
}

/**
 * Aceita uma empresa, todas ou uma lista de IDs separados por vírgula apenas
 * quando todos pertencem ao conjunto já autorizado para o usuário.
 */
export function resolverEmpresaSelecionada<T extends EmpresaSelecionavel>(
  empresaInicial: string | undefined,
  empresas: T[],
): string {
  if (empresaInicial === "todas") return "todas";

  const ids = empresaInicial?.split(",").map((id) => id.trim()).filter(Boolean) ?? [];
  if (ids.length > 0 && ids.every((id) => empresas.some((empresa) => empresa.id === id))) {
    return ids.join(",");
  }

  return empresas[0]?.id ?? "";
}
