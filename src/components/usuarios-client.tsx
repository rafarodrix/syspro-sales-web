"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface UsuarioRow {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  empresas: { empresaId: string; cnpj: string; razaoSocial: string }[];
}

interface EmpresaRow {
  id: string;
  cnpj: string;
  razaoSocial: string;
}

interface Props {
  usuarios: UsuarioRow[];
  empresas: EmpresaRow[];
}

export function UsuariosClient({ usuarios, empresas }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [criando, setCriando] = useState(false);

  async function criarUsuario() {
    if (!name || !email || !password) {
      toast.error("Preencha nome, e-mail e senha");
      return;
    }
    setCriando(true);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    setCriando(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "Erro ao criar usuário");
      return;
    }
    toast.success("Usuário criado");
    setName("");
    setEmail("");
    setPassword("");
    router.refresh();
  }

  async function liberarEmpresa(userId: string, empresaId: string) {
    const res = await fetch("/api/usuarios/liberar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, empresaId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "Erro ao liberar empresa");
      return;
    }
    toast.success("Empresa liberada");
    router.refresh();
  }

  async function removerEmpresa(userId: string, empresaId: string) {
    const res = await fetch("/api/usuarios/liberar", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, empresaId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "Erro ao remover empresa");
      return;
    }
    toast.success("Empresa removida");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Novo usuário</CardTitle>
          <CardDescription>
            Cria acesso com usuário e senha (todos começam sem CNPJ liberado).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome"
            />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail"
            />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
            />
          </div>
          <Button onClick={criarUsuario} disabled={criando}>
            {criando ? "Criando..." : "+ Criar usuário"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {usuarios.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum usuário cadastrado.
          </p>
        )}
        {usuarios.map((u) => (
          <Card key={u.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{u.name}</CardTitle>
                  <CardDescription>{u.email}</CardDescription>
                </div>
                <div className="flex gap-2">
                  {u.role === "admin" && <Badge>Admin</Badge>}
                  {!u.emailVerified && (
                    <Badge variant="secondary">Não verificado</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {u.empresas.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    Nenhum CNPJ liberado.
                  </span>
                )}
                {u.empresas.map((e) => (
                  <Badge key={e.empresaId} variant="outline">
                    {e.razaoSocial} ({e.cnpj})
                    <button
                      className="ml-1 text-muted-foreground hover:text-destructive"
                      onClick={() => removerEmpresa(u.id, e.empresaId)}
                      title="Remover"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <div className="min-w-[220px] flex-1">
                  <Select
                    onValueChange={(empresaId) =>
                      liberarEmpresa(u.id, empresaId)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Liberar CNPJ..." />
                    </SelectTrigger>
                    <SelectContent>
                      {empresas
                        .filter(
                          (e) =>
                            !u.empresas.some((ue) => ue.empresaId === e.id),
                        )
                        .map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.razaoSocial} ({e.cnpj})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
