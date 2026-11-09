/** Regras de troca de senha do próprio usuário (Better Auth exige a senha atual). */
export const SENHA_MINIMA = 8;

export type ResultadoTrocaSenha =
  | { ok: true }
  | { ok: false; erro: string };

/** Validação local antes de chamar a API: evita round-trip para erro de digitação. */
export function validarTrocaSenha({
  atual,
  nova,
  confirmacao,
}: {
  atual: string;
  nova: string;
  confirmacao: string;
}): ResultadoTrocaSenha {
  if (!atual) return { ok: false, erro: "Informe a senha atual." };
  if (nova.length < SENHA_MINIMA) {
    return { ok: false, erro: `A nova senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.` };
  }
  if (nova !== confirmacao) return { ok: false, erro: "A confirmação não confere com a nova senha." };
  if (nova === atual) return { ok: false, erro: "A nova senha precisa ser diferente da atual." };
  return { ok: true };
}

/** Traduz o erro do Better Auth para uma mensagem de tela. */
export function mensagemErroSenha(codigo?: string, mensagem?: string): string {
  const texto = `${codigo ?? ""} ${mensagem ?? ""}`.toLowerCase();
  if (texto.includes("invalid password") || texto.includes("incorrect")) {
    return "Senha atual incorreta.";
  }
  if (texto.includes("too short") || texto.includes("password")) {
    return `A nova senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  }
  return "Não foi possível alterar a senha. Tente novamente.";
}
