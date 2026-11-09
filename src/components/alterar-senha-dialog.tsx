"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { SENHA_MINIMA, mensagemErroSenha, validarTrocaSenha } from "@/lib/senha";

/**
 * Troca de senha do próprio usuário. Só isso: empresa vinculada e perfil de
 * acesso continuam exclusivos da administração.
 */
export function AlterarSenhaDialog({ compacto = false }: { compacto?: boolean }) {
  const { data: sessao } = authClient.useSession();
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function limpar() {
    setAtual("");
    setNova("");
    setConfirmacao("");
    setErro(null);
    setSalvando(false);
  }

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    const validacao = validarTrocaSenha({ atual, nova, confirmacao });
    if (!validacao.ok) return setErro(validacao.erro);

    setSalvando(true);
    const { error } = await authClient.changePassword({
      currentPassword: atual,
      newPassword: nova,
      revokeOtherSessions: true,
    });
    setSalvando(false);

    if (error) {
      setErro(mensagemErroSenha(error.code, error.message));
      return;
    }

    toast.success("Senha alterada. As outras sessões foram encerradas.");
    setAberto(false);
    limpar();
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(valor) => {
        setAberto(valor);
        if (!valor) limpar();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant={compacto ? "ghost" : "outline"}
          size={compacto ? "icon" : "sm"}
          className={compacto ? "size-8 shrink-0 text-muted-foreground hover:text-foreground" : undefined}
          title="Alterar minha senha"
          aria-label="Alterar minha senha"
        >
          {compacto ? <KeyRound className="size-4" /> : "Senha"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar minha senha</DialogTitle>
          <DialogDescription>
            Conta: <span className="font-medium text-foreground">{sessao?.user?.email ?? "—"}</span>
            <br />
            Empresa vinculada e perfil de acesso são definidos pelo administrador.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={salvar} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="senha-atual">Senha atual</Label>
            <Input
              id="senha-atual"
              type="password"
              autoComplete="current-password"
              value={atual}
              onChange={(evento) => setAtual(evento.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha-nova">Nova senha</Label>
            <Input
              id="senha-nova"
              type="password"
              autoComplete="new-password"
              minLength={SENHA_MINIMA}
              value={nova}
              onChange={(evento) => setNova(evento.target.value)}
              required
            />
            <p className="text-[11px] text-muted-foreground">Mínimo de {SENHA_MINIMA} caracteres.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha-confirmacao">Confirmar nova senha</Label>
            <Input
              id="senha-confirmacao"
              type="password"
              autoComplete="new-password"
              minLength={SENHA_MINIMA}
              value={confirmacao}
              onChange={(evento) => setConfirmacao(evento.target.value)}
              required
            />
          </div>

          {erro ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-2.5 py-2 text-xs font-medium text-destructive">
              {erro}
            </p>
          ) : null}

          <DialogFooter className="gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setAberto(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Alterar senha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
