"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Activity,
  Plus,
  Trash2,
  Edit2,
  Save,
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

export interface EmpresaRow {
  id: string;
  cnpj: string;
  razaoSocial: string;
  empresaCodigo: string;
  ativa: boolean;
  sysproBaseUrl: string;
  sysproUseIis: boolean;
  coberturaCriticaDias: number;
  coberturaAtencaoDias: number;
  coberturaExcessoDias: number;
  coberturaCompraDias: number;
  grupoEstoquePadrao: string;
}

interface Props {
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

function limitesCoberturaValidos(critico: number, atencao: number, excesso: number, compra: number) {
  return [critico, atencao, excesso, compra].every((valor) => Number.isInteger(valor) && valor >= 1 && valor <= 365)
    && critico < atencao
    && atencao < excesso;
}

export function ConfiguracaoClient({ empresas }: Props) {
  const router = useRouter();

  // Cadastro de Nova Empresa
  const [cnpj, setCnpj] = useState("");
  const [razao, setRazao] = useState("");
  const [codigo, setCodigo] = useState("");
  const [baseUrl, setBaseUrl] = useState("http://localhost:8080");
  const [useIis, setUseIis] = useState("false");
  const [coberturaCritica, setCoberturaCritica] = useState(7);
  const [coberturaAtencao, setCoberturaAtencao] = useState(15);
  const [coberturaExcesso, setCoberturaExcesso] = useState(90);
  const [coberturaCompra, setCoberturaCompra] = useState(30);
  const [adicionando, setAdicionando] = useState(false);

  // Edição de Empresa
  const [empresaParaEditar, setEmpresaParaEditar] = useState<EmpresaRow | null>(null);
  const [editCnpj, setEditCnpj] = useState("");
  const [editRazao, setEditRazao] = useState("");
  const [editCodigo, setEditCodigo] = useState("");
  const [editBaseUrl, setEditBaseUrl] = useState("");
  const [editUseIis, setEditUseIis] = useState("false");
  const [editAtiva, setEditAtiva] = useState(true);
  const [editCoberturaCritica, setEditCoberturaCritica] = useState(7);
  const [editCoberturaAtencao, setEditCoberturaAtencao] = useState(15);
  const [editCoberturaExcesso, setEditCoberturaExcesso] = useState(90);
  const [editCoberturaCompra, setEditCoberturaCompra] = useState(30);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Exclusão
  const [empresaParaExcluir, setEmpresaParaExcluir] = useState<EmpresaRow | null>(null);

  // Testes de Conexão
  const [empresaTestandoId, setEmpresaTestandoId] = useState<string | null>(null);
  const [resultadoTestePorEmpresa, setResultadoTestePorEmpresa] = useState<Record<string, TesteResultado>>({});

  async function testarConexaoEmpresa(empresa: { id: string; baseUrl: string; useIis: boolean }) {
    setEmpresaTestandoId(empresa.id);
    try {
      const res = await fetch("/api/configuracao/testar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: empresa.baseUrl,
          useIis: empresa.useIis,
        }),
      });
      const data: TesteResultado = await res.json();
      setResultadoTestePorEmpresa((prev) => ({ ...prev, [empresa.id]: data }));
      if (data.ok) {
        toast.success(`Conexão OK (${data.latencyMs}ms)`, {
          description: data.mensagem,
        });
      } else {
        toast.error("Falha na conexão", {
          description: data.error,
        });
      }
    } catch {
      toast.error("Erro ao disparar teste de conexão");
    } finally {
      setEmpresaTestandoId(null);
    }
  }

  async function adicionarEmpresa() {
    const limpoCnpj = cnpj.replace(/\D/g, "");
    if (limpoCnpj.length !== 14 || !razao.trim() || !codigo.trim()) {
      toast.error("Preencha CNPJ válido, Razão Social e Código Syspro");
      return;
    }
    if (!baseUrl.trim()) {
      toast.error("Informe a URL da API Syspro da empresa");
      return;
    }
    if (!limitesCoberturaValidos(coberturaCritica, coberturaAtencao, coberturaExcesso, coberturaCompra)) {
      toast.error("Revise os limites: crítico < atenção < excesso, entre 1 e 365 dias.");
      return;
    }

    setAdicionando(true);
    const res = await fetch("/api/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cnpj: limpoCnpj,
        razaoSocial: razao.trim(),
        empresaCodigo: codigo.trim(),
        sysproBaseUrl: baseUrl.trim(),
        sysproUseIis: useIis === "true",
        coberturaCriticaDias: coberturaCritica,
        coberturaAtencaoDias: coberturaAtencao,
        coberturaExcessoDias: coberturaExcesso,
        coberturaCompraDias: coberturaCompra,
      }),
    });
    setAdicionando(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "Erro ao cadastrar empresa");
      return;
    }
    toast.success("Empresa cadastrada com sucesso!");
    setCnpj("");
    setRazao("");
    setCodigo("");
    setBaseUrl("http://localhost:8080");
    setUseIis("false");
    setCoberturaCritica(7);
    setCoberturaAtencao(15);
    setCoberturaExcesso(90);
    setCoberturaCompra(30);
    router.refresh();
  }

  function abrirEdicao(empresa: EmpresaRow) {
    setEmpresaParaEditar(empresa);
    setEditCnpj(formatarCnpj(empresa.cnpj));
    setEditRazao(empresa.razaoSocial);
    setEditCodigo(empresa.empresaCodigo);
    setEditBaseUrl(empresa.sysproBaseUrl || "http://localhost:8080");
    setEditUseIis(empresa.sysproUseIis ? "true" : "false");
    setEditAtiva(empresa.ativa);
    setEditCoberturaCritica(empresa.coberturaCriticaDias);
    setEditCoberturaAtencao(empresa.coberturaAtencaoDias);
    setEditCoberturaExcesso(empresa.coberturaExcessoDias);
    setEditCoberturaCompra(empresa.coberturaCompraDias);
  }

  async function salvarEdicao() {
    if (!empresaParaEditar) return;
    const limpoCnpj = editCnpj.replace(/\D/g, "");
    if (limpoCnpj.length !== 14 || !editRazao.trim() || !editCodigo.trim()) {
      toast.error("Preencha CNPJ válido, Razão Social e Código Syspro");
      return;
    }
    if (!limitesCoberturaValidos(editCoberturaCritica, editCoberturaAtencao, editCoberturaExcesso, editCoberturaCompra)) {
      toast.error("Revise os limites: crítico < atenção < excesso, entre 1 e 365 dias.");
      return;
    }
    setSalvandoEdicao(true);
    const res = await fetch("/api/empresas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: empresaParaEditar.id,
        cnpj: limpoCnpj,
        razaoSocial: editRazao.trim(),
        empresaCodigo: editCodigo.trim(),
        sysproBaseUrl: editBaseUrl.trim(),
        sysproUseIis: editUseIis === "true",
        ativa: editAtiva,
        coberturaCriticaDias: editCoberturaCritica,
        coberturaAtencaoDias: editCoberturaAtencao,
        coberturaExcessoDias: editCoberturaExcesso,
        coberturaCompraDias: editCoberturaCompra,
      }),
    });
    setSalvandoEdicao(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "Erro ao salvar alterações da empresa");
      return;
    }
    toast.success("Empresa atualizada com sucesso!");
    setEmpresaParaEditar(null);
    router.refresh();
  }

  async function alternarAtiva(empresa: EmpresaRow) {
    const res = await fetch("/api/empresas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: empresa.id, ativa: !empresa.ativa }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "Erro ao alterar status da empresa");
      return;
    }
    toast.success(empresa.ativa ? "Empresa desativada" : "Empresa ativada");
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
      {/* Resumo Corporativo Multi-Empresa */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="bg-card/80 p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Empresas Cadastradas
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold text-foreground">{empresas.length}</span>
            <span className="text-[11px] text-muted-foreground">instâncias</span>
          </div>
        </Card>

        <Card className="bg-card/80 p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Empresas Ativas
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold text-emerald-500">
              {empresas.filter((e) => e.ativa).length}
            </span>
            <span className="text-[11px] text-muted-foreground">sincronizando</span>
          </div>
        </Card>

        <Card className="bg-card/80 p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Arquitetura Multi-Tenant
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-sm font-extrabold text-primary">Isolada por Empresa</span>
          </div>
        </Card>
      </div>

      {/* Cadastrar Nova Empresa */}
      <Card className="shadow-2xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Plus className="size-5 text-primary" />
            <CardTitle className="text-base font-bold text-foreground">
              Cadastrar Nova Empresa & Conexão Syspro
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Cada cliente/empresa pode ter seu próprio servidor Syspro ERP dedicado com URL e rota independente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label htmlFor="cnpjNovo" className="text-xs font-semibold">
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
              <Label htmlFor="razaoNova" className="text-xs font-semibold">
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
              <Label htmlFor="codigoNovo" className="text-xs font-semibold">
                Cód. Syspro (empresa_codigo)
              </Label>
              <Input
                id="codigoNovo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ex: 1 ou 2"
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="urlNova" className="text-xs font-semibold">
                URL da API Syspro
              </Label>
              <Input
                id="urlNova"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:8080"
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Modo IIS</Label>
              <Select value={useIis} onValueChange={setUseIis}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Sem IIS (/api/exporta)</SelectItem>
                  <SelectItem value="true">Com IIS (/sysproserverisapi.dll)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="mb-3">
              <p className="text-xs font-semibold text-foreground">Parâmetros de cobertura</p>
              <p className="text-[11px] text-muted-foreground">
                Limites usados nas análises de estoque e como alvo inicial de compras.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <CampoDias id="criticoNovo" rotulo="Crítico abaixo de" valor={coberturaCritica} onChange={setCoberturaCritica} />
              <CampoDias id="atencaoNovo" rotulo="Atenção abaixo de" valor={coberturaAtencao} onChange={setCoberturaAtencao} />
              <CampoDias id="excessoNovo" rotulo="Excesso acima de" valor={coberturaExcesso} onChange={setCoberturaExcesso} />
              <CampoDias id="compraNovo" rotulo="Alvo inicial de compras" valor={coberturaCompra} onChange={setCoberturaCompra} />
            </div>
          </div>

          <Button
            onClick={adicionarEmpresa}
            disabled={adicionando}
            className="font-semibold gap-1.5 shadow-xs"
          >
            <Plus className="size-4" />
            {adicionando ? "Cadastrando..." : "Cadastrar Empresa"}
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Empresas e Diagnóstico de Conexão */}
      <Card className="shadow-2xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Empresas & Servidores Conectados
              </CardTitle>
              <CardDescription className="text-xs">
                {empresas.length} empresa(s) cadastrada(s). Teste a conexão individual com cada servidor Syspro.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-y border-border/80 bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3">Empresa / Razão Social</th>
                  <th className="px-4 py-3">CNPJ</th>
                  <th className="px-4 py-3">Cód. Syspro</th>
                  <th className="px-4 py-3">Servidor Syspro (URL)</th>
                  <th className="px-4 py-3">Modo</th>
                  <th className="px-4 py-3">Cobertura</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {empresas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      Nenhuma empresa cadastrada. Adicione uma empresa acima.
                    </td>
                  </tr>
                ) : (
                  empresas.map((empresa) => {
                    const teste = resultadoTestePorEmpresa[empresa.id];
                    const isTestando = empresaTestandoId === empresa.id;

                    return (
                      <tr key={empresa.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {empresa.razaoSocial}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {formatarCnpj(empresa.cnpj)}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-foreground">
                          {empresa.empresaCodigo}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground truncate max-w-[200px]" title={empresa.sysproBaseUrl}>
                          {empresa.sysproBaseUrl || "http://localhost:8080"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {empresa.sysproUseIis ? "IIS" : "Direto"}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-[10px] text-muted-foreground">
                          {empresa.coberturaCriticaDias}/{empresa.coberturaAtencaoDias}/{empresa.coberturaExcessoDias} dias
                          <span className="block">Compra: {empresa.coberturaCompraDias} dias</span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => alternarAtiva(empresa)}
                            className="cursor-pointer transition-opacity hover:opacity-80"
                            title="Clique para ativar/desativar"
                          >
                            {empresa.ativa ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10.5px]">
                                Ativa
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10.5px]">
                                Inativa
                              </Badge>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Botão de Testar Conexão Desta Empresa */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                testarConexaoEmpresa({
                                  id: empresa.id,
                                  baseUrl: empresa.sysproBaseUrl || "http://localhost:8080",
                                  useIis: empresa.sysproUseIis,
                                })
                              }
                              disabled={isTestando}
                              className="h-7 px-2 text-[11px] font-semibold gap-1"
                              title="Testar Conexão do Servidor Syspro desta Empresa"
                            >
                              <Activity className={`size-3.5 ${isTestando ? "animate-spin text-primary" : "text-emerald-500"}`} />
                              <span>{isTestando ? "Testando..." : "Testar"}</span>
                            </Button>

                            {/* Botão Editar */}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => abrirEdicao(empresa)}
                              className="size-7 text-muted-foreground hover:text-foreground"
                              title="Editar Configurações da Empresa"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>

                            {/* Botão Excluir */}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEmpresaParaExcluir(empresa)}
                              className="size-7 text-muted-foreground hover:text-destructive"
                              title="Excluir Empresa"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>

                          {/* Feedback de Teste em Linha */}
                          {teste && (
                            <div className="mt-1 text-[10px] font-mono text-right">
                              {teste.ok ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                  ✓ Online ({teste.latencyMs}ms) • {teste.registrosRetornados ?? 0} reg.
                                </span>
                              ) : (
                                <span className="text-destructive font-semibold" title={teste.error}>
                                  ✕ Falha ({teste.latencyMs}ms)
                                </span>
                              )}
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

      {/* Dialog de Edição de Empresa & Conexão */}
      <Dialog open={Boolean(empresaParaEditar)} onOpenChange={(open) => !open && setEmpresaParaEditar(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Editar Empresa & Conexão Syspro
            </DialogTitle>
            <DialogDescription className="text-xs">
              Altere os dados cadastrais e as configurações de conexão desta empresa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">CNPJ</Label>
              <Input
                value={editCnpj}
                onChange={(e) => setEditCnpj(formatarCnpj(e.target.value))}
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Razão Social</Label>
              <Input
                value={editRazao}
                onChange={(e) => setEditRazao(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Código Syspro (empresa_codigo)</Label>
              <Input
                value={editCodigo}
                onChange={(e) => setEditCodigo(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">URL da API Syspro</Label>
              <Input
                value={editBaseUrl}
                onChange={(e) => setEditBaseUrl(e.target.value)}
                placeholder="http://localhost:8080"
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Modo de Rota (IIS)</Label>
              <Select value={editUseIis} onValueChange={setEditUseIis}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Sem IIS (/api/exporta/produto/venda)</SelectItem>
                  <SelectItem value="true">Com IIS (/sysproserverisapi.dll/...)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="mb-3 text-xs font-semibold text-foreground">Parâmetros de cobertura</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <CampoDias id="criticoEditar" rotulo="Crítico abaixo de" valor={editCoberturaCritica} onChange={setEditCoberturaCritica} />
                <CampoDias id="atencaoEditar" rotulo="Atenção abaixo de" valor={editCoberturaAtencao} onChange={setEditCoberturaAtencao} />
                <CampoDias id="excessoEditar" rotulo="Excesso acima de" valor={editCoberturaExcesso} onChange={setEditCoberturaExcesso} />
                <CampoDias id="compraEditar" rotulo="Alvo inicial de compras" valor={editCoberturaCompra} onChange={setEditCoberturaCompra} />
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Ordem obrigatória: crítico &lt; atenção &lt; excesso. Valores entre 1 e 365 dias.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="editAtiva"
                checked={editAtiva}
                onChange={(e) => setEditAtiva(e.target.checked)}
                className="rounded border-border text-primary size-4 cursor-pointer"
              />
              <Label htmlFor="editAtiva" className="text-xs font-semibold cursor-pointer">
                Empresa Ativa
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEmpresaParaEditar(null)}
              disabled={salvandoEdicao}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={salvarEdicao}
              disabled={salvandoEdicao}
              className="gap-1.5"
            >
              <Save className="size-3.5" />
              {salvandoEdicao ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={Boolean(empresaParaExcluir)} onOpenChange={(open) => !open && setEmpresaParaExcluir(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive">
              Excluir Empresa
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tem certeza que deseja excluir a empresa{" "}
              <strong className="text-foreground">{empresaParaExcluir?.razaoSocial}</strong>? Esta ação é irreversível.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEmpresaParaExcluir(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
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

function CampoDias({
  id,
  rotulo,
  valor,
  onChange,
}: {
  id: string;
  rotulo: string;
  valor: number;
  onChange: (valor: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs font-semibold">{rotulo}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          min={1}
          max={365}
          value={valor}
          onChange={(evento) => onChange(Number(evento.target.value))}
          className="pr-12 font-mono text-xs"
        />
        <span className="pointer-events-none absolute right-3 top-2.5 text-[10px] text-muted-foreground">dias</span>
      </div>
    </div>
  );
}
