"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  Activity,
  Server,
  Building,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
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

interface EmpresaRow {
  id: string;
  cnpj: string;
  razaoSocial: string;
  empresaCodigo: string;
  ativa: boolean;
}

interface Props {
  configuracao: { sysproBaseUrl: string; sysproUseIis: string };
  empresas: EmpresaRow[];
}

interface TesteResultado {
  ok: boolean;
  status?: number;
  latencyMs?: number;
  urlTestada?: string;
  registrosRetornados?: number;
  mensagem?: string;
  sugestao?: string;
  error?: string;
}

function formatarCnpj(cnpj: string) {
  const v = cnpj.replace(/\D/g, "").slice(0, 14);
  if (v.length <= 2) return v;
  if (v.length <= 5) return `${v.slice(0, 2)}.${v.slice(2)}`;
  if (v.length <= 8) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`;
  if (v.length <= 12)
    return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8)}`;
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12, 14)}`;
}

export function ConfiguracaoClient({ configuracao, empresas }: Props) {
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState(configuracao.sysproBaseUrl);
  const [useIis, setUseIis] = useState(
    configuracao.sysproUseIis === "true" ? "true" : "false",
  );
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<TesteResultado | null>(null);

  // campos da nova empresa
  const [cnpj, setCnpj] = useState("");
  const [razao, setRazao] = useState("");
  const [codigo, setCodigo] = useState("");
  const [adicionando, setAdicionando] = useState(false);

  // exclusão
  const [empresaParaExcluir, setEmpresaParaExcluir] = useState<EmpresaRow | null>(null);

  async function salvarConexao() {
    setSalvando(true);
    const res = await fetch("/api/configuracao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseUrl, useIis }),
    });
    setSalvando(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "Erro ao salvar conexão");
      return;
    }
    toast.success("Configuração de conexão salva com sucesso");
    router.refresh();
  }

  async function testarConexao() {
    setTestando(true);
    setResultadoTeste(null);
    try {
      const res = await fetch("/api/configuracao/testar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, useIis }),
      });
      const json = await res.json();
      setResultadoTeste(json);
      if (json.ok) {
        toast.success("Teste de conexão bem-sucedido!");
      } else {
        toast.error("Falha no teste de conexão com o Syspro");
      }
    } catch {
      setResultadoTeste({
        ok: false,
        error: "Erro de conexão ao executar teste.",
      });
      toast.error("Erro ao testar conexão");
    } finally {
      setTestando(false);
    }
  }

  async function adicionarEmpresa() {
    const rawCnpj = cnpj.replace(/\D/g, "");
    if (!rawCnpj || !razao || !codigo) {
      toast.error("Preencha CNPJ, razão social e código da empresa");
      return;
    }
    setAdicionando(true);
    const res = await fetch("/api/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cnpj: rawCnpj,
        razaoSocial: razao,
        empresaCodigo: codigo.trim(),
      }),
    });
    setAdicionando(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "Erro ao adicionar empresa");
      return;
    }
    toast.success("Empresa cadastrada com sucesso");
    setCnpj("");
    setRazao("");
    setCodigo("");
    router.refresh();
  }

  async function confirmarExclusao() {
    if (!empresaParaExcluir) return;
    const res = await fetch(`/api/empresas?id=${empresaParaExcluir.id}`, {
      method: "DELETE",
    });
    const json = await res.json().catch(() => ({}));
    setEmpresaParaExcluir(null);
    if (!res.ok) {
      toast.error(json.error ?? "Erro ao excluir empresa");
      return;
    }
    toast.success("Empresa excluída com sucesso");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Conexão com API */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="size-5 text-primary" />
            <CardTitle className="text-lg font-bold">
              Conexão com a API Syspro
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Configuração da rota REST de exportação do Syspro ERP (com IIS via DLL ou sem IIS direto).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="baseUrl" className="text-xs font-semibold">
                URL / Porta do Servidor
              </Label>
              <Input
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:8080 ou http://192.168.1.10:1234"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Modo de Rota (IIS)</Label>
              <Select value={useIis} onValueChange={setUseIis}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">
                    Sem IIS (/api/exporta/produto/venda)
                  </SelectItem>
                  <SelectItem value="true">
                    Com IIS (/sysproserverisapi.dll/api/exporta/produto/venda)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              onClick={salvarConexao}
              disabled={salvando || testando}
              className="font-semibold shadow-xs"
            >
              <Save className="size-4 mr-1.5" />
              {salvando ? "Salvando..." : "Salvar Configuração"}
            </Button>
            <Button
              onClick={testarConexao}
              disabled={testando || salvando}
              variant="outline"
              className="font-semibold gap-1.5"
            >
              <Activity className={`size-4 ${testando ? "animate-spin text-primary" : ""}`} />
              {testando ? "Testando conexão..." : "Testar Conexão"}
            </Button>
          </div>

          {resultadoTeste ? (
            <div
              className={`mt-4 rounded-lg border p-4 text-xs ${
                resultadoTeste.ok
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200"
                  : "border-destructive/30 bg-destructive/10 text-destructive dark:text-rose-200"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {resultadoTeste.ok ? (
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="size-4 text-destructive" />
                )}
                <span>
                  {resultadoTeste.ok
                    ? `Conexão estabelecida (${resultadoTeste.latencyMs} ms)`
                    : `Falha na conexão (${resultadoTeste.latencyMs ?? 0} ms)`}
                </span>
              </div>
              <div className="mt-2 space-y-1 font-mono text-[11px]">
                <p>
                  <span className="font-semibold">URL testada:</span> {resultadoTeste.urlTestada}
                </p>
                {resultadoTeste.registrosRetornados !== undefined && (
                  <p>
                    <span className="font-semibold">Registros encontrados (últimos 7 dias):</span>{" "}
                    {resultadoTeste.registrosRetornados}
                  </p>
                )}
                {resultadoTeste.error && (
                  <p className="text-destructive font-semibold">
                    Erro: {resultadoTeste.error}
                  </p>
                )}
                {resultadoTeste.sugestao && (
                  <p className="font-semibold text-amber-600 dark:text-amber-400">
                    💡 Sugestão: {resultadoTeste.sugestao}
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Cadastro de Empresas */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building className="size-5 text-primary" />
            <CardTitle className="text-lg font-bold">
              Empresas (CNPJ ↔ Código Syspro)
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Mapeamento entre o CNPJ do cliente e o <code className="font-mono font-bold">empresa_codigo</code> retornado pela API Syspro (ex: 1, 2).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/20 p-3.5">
            <div className="mb-2 text-xs font-bold text-foreground">
              Cadastrar Nova Empresa
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="cnpjNovo" className="text-[11px] font-semibold">
                  CNPJ
                </Label>
                <Input
                  id="cnpjNovo"
                  value={cnpj}
                  onChange={(e) => setCnpj(formatarCnpj(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="razaoNova" className="text-[11px] font-semibold">
                  Razão Social / Nome Fantasia
                </Label>
                <Input
                  id="razaoNova"
                  value={razao}
                  onChange={(e) => setRazao(e.target.value)}
                  placeholder="Ex: Matriz Distribuidora"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="codigoNovo" className="text-[11px] font-semibold">
                  Código Syspro (empresa_codigo)
                </Label>
                <Input
                  id="codigoNovo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ex: 1 ou 2"
                  className="text-xs font-mono"
                />
              </div>
            </div>
            <Button
              onClick={adicionarEmpresa}
              disabled={adicionando}
              size="sm"
              className="mt-3 font-semibold gap-1.5"
            >
              <Plus className="size-3.5" />
              {adicionando ? "Cadastrando..." : "Cadastrar Empresa"}
            </Button>
          </div>

          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-left font-bold text-muted-foreground">
                  <th className="p-3">CNPJ</th>
                  <th className="p-3">Razão Social</th>
                  <th className="p-3">Código Syspro</th>
                  <th className="p-3">Situação</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {empresas.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={5}>
                      Nenhuma empresa cadastrada.
                    </td>
                  </tr>
                )}
                {empresas.map((e) => (
                  <EmpresaRow
                    key={e.id}
                    empresa={e}
                    onChanged={() => router.refresh()}
                    onExcluir={() => setEmpresaParaExcluir(e)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de Confirmação de Exclusão */}
      <Dialog
        open={Boolean(empresaParaExcluir)}
        onOpenChange={(open) => !open && setEmpresaParaExcluir(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão de Empresa</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a empresa{" "}
              <strong>{empresaParaExcluir?.razaoSocial}</strong> (CNPJ: {empresaParaExcluir?.cnpj})?
              Esta ação removerá também os acessos de todos os usuários a ela vinculados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setEmpresaParaExcluir(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarExclusao}
            >
              Excluir Empresa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EmpresaRowProps {
  empresa: EmpresaRow;
  onChanged: () => void;
  onExcluir: () => void;
}

function EmpresaRow({ empresa, onChanged, onExcluir }: EmpresaRowProps) {
  const [editando, setEditando] = useState(false);
  const [cnpj, setCnpj] = useState(formatarCnpj(empresa.cnpj));
  const [razao, setRazao] = useState(empresa.razaoSocial);
  const [codigo, setCodigo] = useState(empresa.empresaCodigo);
  const [saving, setSaving] = useState(false);

  async function salvar() {
    const rawCnpj = cnpj.replace(/\D/g, "");
    if (!rawCnpj || !razao || !codigo) {
      toast.error("Preencha CNPJ, razão social e código");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/empresas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: empresa.id,
        cnpj: rawCnpj,
        razaoSocial: razao,
        empresaCodigo: codigo.trim(),
      }),
    });
    setSaving(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "Erro ao salvar empresa");
      return;
    }
    toast.success("Empresa atualizada com sucesso");
    setEditando(false);
    onChanged();
  }

  if (editando) {
    return (
      <tr className="border-b last:border-0 bg-muted/30">
        <td className="p-2">
          <Input
            value={cnpj}
            onChange={(e) => setCnpj(formatarCnpj(e.target.value))}
            className="h-8 text-xs font-mono"
          />
        </td>
        <td className="p-2">
          <Input
            value={razao}
            onChange={(e) => setRazao(e.target.value)}
            className="h-8 text-xs"
          />
        </td>
        <td className="p-2">
          <Input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="h-8 text-xs font-mono"
          />
        </td>
        <td className="p-2">
          <Badge variant="outline">{empresa.ativa ? "Ativa" : "Inativa"}</Badge>
        </td>
        <td className="p-2 text-right">
          <div className="flex justify-end gap-1">
            <Button size="icon-sm" onClick={salvar} disabled={saving}>
              <Save className="size-3.5" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setEditando(false)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b last:border-0 hover:bg-muted/20">
      <td className="p-3 font-mono font-medium">{formatarCnpj(empresa.cnpj)}</td>
      <td className="p-3 font-semibold text-foreground">{empresa.razaoSocial}</td>
      <td className="p-3 font-mono">
        <Badge variant="secondary" className="font-mono font-bold">
          {empresa.empresaCodigo}
        </Badge>
      </td>
      <td className="p-3">
        <Badge
          variant={empresa.ativa ? "default" : "secondary"}
          className={
            empresa.ativa
              ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
              : ""
          }
        >
          {empresa.ativa ? "Ativa" : "Inativa"}
        </Badge>
      </td>
      <td className="p-3 text-right">
        <div className="flex justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditando(true)}
            className="h-8 gap-1 text-xs"
          >
            <Edit2 className="size-3" />
            Editar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onExcluir}
          >
            <Trash2 className="size-3" />
            Excluir
          </Button>
        </div>
      </td>
    </tr>
  );
}
