"use client";

import { useState } from "react";
import type { VendaProduto } from "@/lib/syspro-api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EmpresaOption {
  id: string;
  cnpj: string;
  razaoSocial: string;
  empresaCodigo: string;
}

interface Props {
  empresas: EmpresaOption[];
}

interface Resumo {
  totalVendido: number;
  itens: number;
  notas: number;
}

const fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function num(v: number | string | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}

export function VendasClient({ empresas }: Props) {
  const [empresaId, setEmpresaId] = useState<string>(
    empresas.length === 1 ? empresas[0].id : "",
  );
  const [dtInicial, setDtInicial] = useState("");
  const [dtFinal, setDtFinal] = useState("");
  const [loading, setLoading] = useState(false);
  const [vendas, setVendas] = useState<VendaProduto[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function handleConsultar() {
    if (!empresaId || !dtInicial || !dtFinal) {
      toast.error("Preencha empresa e período");
      return;
    }
    const empresa = empresas.find((e) => e.id === empresaId);
    if (!empresa) return;

    setLoading(true);
    setErro(null);
    try {
      // input type=date entrega AAAA-MM-DD -> converte para DD/MM/AAAA
      const [a, m, d] = dtInicial.split("-");
      const [a2, m2, d2] = dtFinal.split("-");
      const res = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          dtInicial: `${d}/${m}/${a}`,
          dtFinal: `${d2}/${m2}/${a2}`,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? "Erro ao consultar as vendas.");
      }
      const filtradas = json.vendas as VendaProduto[];

      setVendas(filtradas);
      const total = filtradas.reduce(
        (s, v) => s + num(v.produto_vlr_total_item),
        0,
      );
      const itens = filtradas.reduce(
        (s, v) => s + num(v.produto_qtde),
        0,
      );
      const notas = new Set(filtradas.map((v) => v.nf_numero)).size;
      setResumo({ totalVendido: total, itens, notas });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Erro ao consultar as vendas.";
      setErro(msg);
      setVendas([]);
      setResumo(null);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>CNPJ / Empresa</Label>
              <Select value={empresaId} onValueChange={setEmpresaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.razaoSocial} ({e.cnpj})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dtInicial">Data inicial</Label>
              <Input
                id="dtInicial"
                type="date"
                value={dtInicial}
                onChange={(e) => setDtInicial(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dtFinal">Data final</Label>
              <Input
                id="dtFinal"
                type="date"
                value={dtFinal}
                onChange={(e) => setDtFinal(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleConsultar} disabled={loading}>
                {loading ? "Consultando..." : "Consultar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {erro && (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-sm text-destructive">
            {erro}
          </CardContent>
        </Card>
      )}

      {resumo && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Total vendido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {fmt.format(resumo.totalVendido)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Quantidade de itens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{resumo.itens}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Ticket médio / notas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {resumo.notas
                  ? fmt.format(resumo.totalVendido / resumo.notas)
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {resumo.notas} nota(s)
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {vendas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Vendas ({vendas.length} itens)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NF</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Total item</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendas.map((v, i) => (
                  <TableRow key={i}>
                    <TableCell>{v.nf_numero}</TableCell>
                    <TableCell>{v.nf_dt_emissao}</TableCell>
                    <TableCell>{v.cliente_nome}</TableCell>
                    <TableCell className="max-w-[220px] truncate">
                      {v.produto_descricao}
                    </TableCell>
                    <TableCell className="text-right">
                      {num(v.produto_qtde).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmt.format(num(v.produto_vlr_total_item))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
