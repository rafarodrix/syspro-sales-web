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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export function ConfiguracaoClient({ configuracao, empresas }: Props) {
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState(configuracao.sysproBaseUrl);
  const [useIis, setUseIis] = useState(
    configuracao.sysproUseIis === "true" ? "true" : "false",
  );
  const [salvando, setSalvando] = useState(false);

  // campos da nova empresa
  const [cnpj, setCnpj] = useState("");
  const [razao, setRazao] = useState("");
  const [codigo, setCodigo] = useState("");
  const [adicionando, setAdicionando] = useState(false);

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
    toast.success("Conexão salva");
    router.refresh();
  }

  async function adicionarEmpresa() {
    if (!cnpj || !razao || !codigo) {
      toast.error("Preencha CNPJ, razão social e código da empresa");
      return;
    }
    setAdicionando(true);
    const res = await fetch("/api/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cnpj: cnpj.replace(/\D/g, ""),
        razaoSocial: razao,
        empresaCodigo: codigo,
      }),
    });
    setAdicionando(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "Erro ao adicionar empresa");
      return;
    }
    toast.success("Empresa adicionada");
    setCnpj("");
    setRazao("");
    setCodigo("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Conexão com a API do Syspro</CardTitle>
          <CardDescription>
            URL e caminho da API de exportação (com ou sem IIS).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="baseUrl">URL / porta (ex.: http://localhost:1234)</Label>
            <Input
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:1234"
            />
          </div>
          <div className="space-y-2">
            <Label>Caminho</Label>
            <Select value={useIis} onValueChange={setUseIis}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">
                  Sem IIS (/api/exporta/...)
                </SelectItem>
                <SelectItem value="true">
                  Com IIS (/sysproserverisapi.dll/api/exporta/...)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={salvarConexao} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar conexão"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Empresas (CNPJ ↔ código)</CardTitle>
          <CardDescription>
            Cadastra a relação CNPJ → empresa_codigo usada na consulta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="CNPJ (somente números)"
            />
            <Input
              value={razao}
              onChange={(e) => setRazao(e.target.value)}
              placeholder="Razão social"
            />
            <Input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Código na API"
            />
          </div>
          <Button
            onClick={adicionarEmpresa}
            disabled={adicionando}
            variant="secondary"
          >
            {adicionando ? "Adicionando..." : "+ Adicionar empresa"}
          </Button>

          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2 font-medium">CNPJ</th>
                  <th className="p-2 font-medium">Razão social</th>
                  <th className="p-2 font-medium">Código API</th>
                  <th className="p-2 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {empresas.length === 0 && (
                  <tr>
                    <td className="p-2 text-muted-foreground" colSpan={4}>
                      Nenhuma empresa cadastrada.
                    </td>
                  </tr>
                )}
                {empresas.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="p-2">{e.cnpj}</td>
                    <td className="p-2">{e.razaoSocial}</td>
                    <td className="p-2">{e.empresaCodigo}</td>
                    <td className="p-2">
                      {e.ativa ? (
                        <span className="text-green-600">Ativa</span>
                      ) : (
                        <span className="text-muted-foreground">Inativa</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
