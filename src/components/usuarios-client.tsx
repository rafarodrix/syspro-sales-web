"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Search,
  X,
  Plus,
  Trash2,
  Edit2,
  Save,
  Crown,
  Briefcase,
  UserCheck,
  KeyRound,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  // Criação
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "gerente" | "vendas">("vendas");
  const [criando, setCriando] = useState(false);

  // Edição
  const [usuarioParaEditar, setUsuarioParaEditar] = useState<UsuarioRow | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "gerente" | "vendas">("vendas");
  const [editPassword, setEditPassword] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Exclusão
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<UsuarioRow | null>(null);

  function abrirEdicao(u: UsuarioRow) {
    setUsuarioParaEditar(u);
    setEditNome(u.name);
    setEditEmail(u.email);
    setEditRole(u.role === "admin" ? "admin" : u.role === "gerente" ? "gerente" : "vendas");
    setEditPassword("");
  }

  async function salvarEdicao() {
    if (!usuarioParaEditar || !editNome.trim() || !editEmail.trim()) {
      toast.error("Preencha nome e e-mail");
      return;
    }
    if (editPassword && editPassword.length < 12) {
      toast.error("A nova senha deve ter no minimo 12 caracteres");
      return;
    }

    setSalvandoEdicao(true);
    const res = await fetch("/api/usuarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: usuarioParaEditar.id,
        name: editNome.trim(),
        email: editEmail.trim(),
        role: editRole,
        password: editPassword.trim() || undefined,
      }),
    });
    setSalvandoEdicao(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "Erro ao salvar alterações do usuário");
      return;
    }
    toast.success("Usuário atualizado com sucesso!");
    setUsuarioParaEditar(null);
    router.refresh();
  }

  async function criarUsuario() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Preencha nome, e-mail e senha");
      return;
    }
    if (password.length < 12) {
      toast.error("A senha deve ter no minimo 12 caracteres");
      return;
    }
    setCriando(true);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role,
      }),
    });
    setCriando(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "Erro ao criar usuário");
      return;
    }
    toast.success("Usuário criado com sucesso!");
    setName("");
    setEmail("");
    setPassword("");
    setRole("vendas");
    router.refresh();
  }

  async function confirmarExclusao() {
    if (!usuarioParaExcluir) return;
    const res = await fetch(`/api/usuarios?id=${usuarioParaExcluir.id}`, {
      method: "DELETE",
    });
    const json = await res.json().catch(() => ({}));
    setUsuarioParaExcluir(null);
    if (!res.ok) {
      toast.error(json.error ?? "Erro ao excluir usuário");
      return;
    }
    toast.success("Usuário excluído com sucesso");
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
        u.role.toLowerCase().includes(termo) ||
        u.empresas.some((e) =>
          e.razaoSocial.toLowerCase().includes(termo) || e.cnpj.includes(termo)
        ),
    );
  }, [usuarios, busca]);

  const totalAdmin = useMemo(() => usuarios.filter((u) => u.role.toLowerCase() === "admin").length, [usuarios]);
  const totalGerente = useMemo(() => usuarios.filter((u) => u.role.toLowerCase() === "gerente" || u.role.toLowerCase() === "gerencia").length, [usuarios]);
  const totalVendas = useMemo(() => usuarios.filter((u) => u.role.toLowerCase() === "vendas" || u.role.toLowerCase() === "user").length, [usuarios]);

  return (
    <div className="space-y-6">
      {/* Resumo de Usuários e Permissões */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-border/60 bg-card/80 p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total de Usuários</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold text-foreground">{usuarios.length}</span>
            <span className="text-[11px] text-muted-foreground">contas ativas</span>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/80 p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Administradores</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold text-amber-500">{totalAdmin}</span>
            <span className="text-[11px] text-muted-foreground">acesso total</span>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/80 p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Gerência</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold text-blue-500">{totalGerente}</span>
            <span className="text-[11px] text-muted-foreground">+ relatórios</span>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/80 p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Consultores / Vendas</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold text-emerald-500">{totalVendas}</span>
            <span className="text-[11px] text-muted-foreground">comercial</span>
          </div>
        </Card>
      </div>

      {/* Cadastro de Novo Usuário */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            <CardTitle className="text-lg font-bold">Cadastrar Novo Usuário</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Crie novos usuários atribuindo o perfil correspondente (Administrador, Gerência ou Vendas).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                placeholder="Minimo 12 caracteres"
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Perfil de Acesso</Label>
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger className="text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendas">💼 Vendas (Dashboard & Vendas)</SelectItem>
                  <SelectItem value="gerente">👔 Gerência (+ Relatórios)</SelectItem>
                  <SelectItem value="admin">👑 Administrador (Acesso Total)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={criarUsuario}
            disabled={criando}
            className="font-semibold gap-1.5 shadow-xs"
          >
            <Plus className="size-4" />
            {criando ? "Criando usuário..." : "Cadastrar Usuário"}
          </Button>
        </CardContent>
      </Card>

      {/* Tabela de Usuários */}
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
                {usuarios.length} usuário(s) cadastrado(s). Gerencie perfis, empresas e credenciais.
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Pesquisar por nome, e-mail, perfil..."
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
            <table className="w-full min-w-[560px] text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
                  <th className="p-3">Usuário</th>
                  <th className="p-3">Perfil de Acesso</th>
                  <th className="p-3">Empresas Liberadas</th>
                  <th className="p-3 text-right">Liberar Empresa</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map((u) => {
                    const isAdmin = u.role === "admin";
                    const isGerente = u.role === "gerente";
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
                            variant={isAdmin ? "default" : isGerente ? "secondary" : "outline"}
                            className={`gap-1 font-bold text-[11px] ${
                              isAdmin
                                ? "bg-primary text-primary-foreground"
                                : isGerente
                                  ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                                  : "text-foreground"
                            }`}
                          >
                            {isAdmin ? (
                              <Crown className="size-3" />
                            ) : isGerente ? (
                              <Briefcase className="size-3" />
                            ) : (
                              <UserCheck className="size-3" />
                            )}
                            {isAdmin ? "Administrador" : isGerente ? "Gerência" : "Vendas"}
                          </Badge>
                        </td>

                        <td className="p-3">
                          {isAdmin ? (
                            <span className="text-muted-foreground italic">
                              Acesso irrestrito a todas as empresas ativas.
                            </span>
                          ) : u.empresas.length === 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              Nenhum CNPJ liberado (sem acesso a dados).
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
                              <div className="w-44">
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
                                        Todas as empresas liberadas
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

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirEdicao(u)}
                              className="h-8 gap-1 text-xs"
                              title="Editar dados e perfil do usuário"
                            >
                              <Edit2 className="size-3" />
                              Editar
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => setUsuarioParaExcluir(u)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              title="Excluir usuário"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
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

      {/* Diálogo de Edição de Usuário */}
      <Dialog
        open={Boolean(usuarioParaEditar)}
        onOpenChange={(open) => !open && setUsuarioParaEditar(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere o nome, e-mail, perfil de acesso ou redefina a senha do usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label htmlFor="editNome" className="text-xs font-semibold">
                Nome Completo
              </Label>
              <Input
                id="editNome"
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="editEmail" className="text-xs font-semibold">
                E-mail
              </Label>
              <Input
                id="editEmail"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Perfil de Acesso</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as any)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendas">💼 Vendas (Dashboard & Vendas)</SelectItem>
                  <SelectItem value="gerente">👔 Gerência (+ Relatórios)</SelectItem>
                  <SelectItem value="admin">👑 Administrador (Acesso Total)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 border-t pt-2">
              <Label htmlFor="editPassword" className="text-xs font-semibold flex items-center gap-1">
                <KeyRound className="size-3 text-muted-foreground" />
                Redefinir Senha (opcional)
              </Label>
              <Input
                id="editPassword"
                type="password"
                placeholder="Deixe em branco para manter a senha atual"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setUsuarioParaEditar(null)}
              disabled={salvandoEdicao}
            >
              Cancelar
            </Button>
            <Button
              onClick={salvarEdicao}
              disabled={salvandoEdicao}
              className="gap-1.5 font-semibold"
            >
              <Save className="size-3.5" />
              {salvandoEdicao ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação de Exclusão */}
      <Dialog
        open={Boolean(usuarioParaExcluir)}
        onOpenChange={(open) => !open && setUsuarioParaExcluir(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão de Usuário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o usuário{" "}
              <strong>{usuarioParaExcluir?.name}</strong> ({usuarioParaExcluir?.email})?
              Esta ação revogará todo o acesso dele ao sistema e removerá seus vínculos de empresas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setUsuarioParaExcluir(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarExclusao}
            >
              Excluir Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
