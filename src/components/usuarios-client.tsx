"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ShieldAlert,
  Building,
  X,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [busca, setBusca] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [criando, setCriando] = useState(false);

  async function criarUsuario() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Preencha nome, e-mail e senha");
      return;
    }
    setCriando(true);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password: password.trim() }),
    });
    setCriando(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "Erro ao criar usuário");
      return;
    }
    toast.success("Usuário criado com sucesso");
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
    toast.success("Empresa liberada para o usuário");
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
    toast.success("Acesso à empresa revogado");
    router.refresh();
  }

  const usuariosFiltrados = useMemo(() => {
    if (!busca.trim()) return usuarios;
    const termo = busca.toLowerCase().trim();
    return usuarios.filter(
      (u) =>
        u.name.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo) ||
        u.empresas.some((e) =>
          e.razaoSocial.toLowerCase().includes(termo) || e.cnpj.includes(termo)
        ),
    );
  }, [usuarios, busca]);

  return (
    <div className="space-y-6">
      {/* Cadastro de Novo Usuário */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            <CardTitle className="text-lg font-bold">Novo Usuário</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Crie novos usuários para acesso ao portal. Cada usuário visualiza somente as empresas liberadas abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="nome" className="text-xs font-semibold">
                Nome Completo
              </Label>
              <Input
                id="nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João da Silva"
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-semibold">
                E-mail de Acesso
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="joao@empresa.com.br"
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="senha" className="text-xs font-semibold">
                Senha Inicial
              </Label>
              <Input
                id="senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="text-xs"
              />
            </div>
          </div>
          <Button
            onClick={criarUsuario}
            disabled={criando}
            className="font-semibold gap-1.5 shadow-xs"
          >
            <Plus className="size-4" />
            {criando ? "Criando usuário..." : "Criar Usuário"}
          </Button>
        </CardContent>
      </Card>

      {/* Lista e Gestão de Usuários */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users className="size-5 text-primary" />
                <CardTitle className="text-lg font-bold">
                  Usuários e Permissões
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                {usuarios.length} usuário(s) cadastrado(s). Gerencie os CNPJs autorizados para cada conta.
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Pesquisar por nome, e-mail..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-9 w-full rounded-md border bg-background pl-8 pr-8 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
              {busca && (
                <button
                  onClick={() => setBusca("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
                  <th className="p-3">Usuário</th>
                  <th className="p-3">Perfil</th>
                  <th className="p-3">Empresas Liberadas</th>
                  <th className="p-3 text-right">Liberar Acesso</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map((u) => {
                    const isAdmin = u.role === "admin";
                    const empresasDisponiveis = empresas.filter(
                      (e) => !u.empresas.some((ue) => ue.empresaId === e.id),
                    );

                    return (
                      <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3">
                          <div className="font-semibold text-foreground text-sm">
                            {u.name}
                          </div>
                          <div className="font-mono text-muted-foreground text-xs">
                            {u.email}
                          </div>
                        </td>

                        <td className="p-3">
                          <Badge
                            variant={isAdmin ? "default" : "secondary"}
                            className="gap-1 text-[11px] font-bold"
                          >
                            {isAdmin ? (
                              <Shield className="size-3" />
                            ) : (
                              <Users className="size-3" />
                            )}
                            {isAdmin ? "Administrador" : "Usuário"}
                          </Badge>
                        </td>

                        <td className="p-3">
                          {isAdmin ? (
                            <span className="text-muted-foreground italic">
                              Acesso irrestrito a todas as empresas ativas.
                            </span>
                          ) : u.empresas.length === 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              Nenhum CNPJ liberado (sem acesso).
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {u.empresas.map((e) => (
                                <Badge
                                  key={e.empresaId}
                                  variant="outline"
                                  className="gap-1 bg-background text-[11px] font-medium"
                                >
                                  <span>{e.razaoSocial}</span>
                                  <button
                                    onClick={() => removerEmpresa(u.id, e.empresaId)}
                                    className="ml-1 text-muted-foreground hover:text-destructive"
                                    title={`Remover acesso a ${e.razaoSocial}`}
                                  >
                                    <X className="size-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="p-3 text-right">
                          {!isAdmin && (
                            <div className="flex justify-end">
                              <div className="w-48">
                                <Select
                                  onValueChange={(empresaId) =>
                                    liberarEmpresa(u.id, empresaId)
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="+ Liberar CNPJ" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {empresasDisponiveis.length === 0 ? (
                                      <div className="p-2 text-center text-xs text-muted-foreground">
                                        Todas as empresas já liberadas
                                      </div>
                                    ) : (
                                      empresasDisponiveis.map((e) => (
                                        <SelectItem key={e.id} value={e.id}>
                                          {e.razaoSocial} ({e.cnpj})
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
