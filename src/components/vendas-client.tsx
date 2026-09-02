"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  FileText,
  Package,
  Search,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import type { VendaProduto } from "@/lib/syspro-api";
import {
  agruparVendasPorNota,
  dataInputParaSyspro,
  dadosPorMetrica,
  type MetricaDeVendas,
  paraNumero,
  produtosMaisVendidos,
} from "@/lib/vendas";
import { GraficoFaturamento, GraficoProdutos } from "@/components/sales-charts";
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
}
interface Props {
  empresas: EmpresaOption[];
}

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function VendasClient({ empresas }: Props) {
  const [empresaId, setEmpresaId] = useState(
    empresas.length === 1 ? empresas[0].id : "",
  );
  const [dtInicial, setDtInicial] = useState("");
  const [dtFinal, setDtFinal] = useState("");
  const [loading, setLoading] = useState(false);
  const [vendas, setVendas] = useState<VendaProduto[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [notaAberta, setNotaAberta] = useState<string | null>(null);
  const [metrica, setMetrica] = useState<MetricaDeVendas>("faturamento");

  const notas = useMemo(() => agruparVendasPorNota(vendas), [vendas]);
  const totalVendido = useMemo(
    () =>
      vendas.reduce(
        (total, venda) => total + paraNumero(venda.produto_vlr_total_item),
        0,
      ),
    [vendas],
  );
  const quantidadeItens = useMemo(
    () =>
      vendas.reduce(
        (total, venda) => total + paraNumero(venda.produto_qtde),
        0,
      ),
    [vendas],
  );
  const serieDaMetrica = useMemo(
    () => dadosPorMetrica(vendas, metrica),
    [metrica, vendas],
  );
  const topProdutos = useMemo(() => produtosMaisVendidos(vendas), [vendas]);

  async function consultar() {
    if (!empresaId || !dtInicial || !dtFinal) {
      toast.error("Preencha empresa e período");
      return;
    }
    if (dtInicial > dtFinal) {
      toast.error("A data inicial deve ser anterior à data final");
      return;
    }
    setLoading(true);
    setErro(null);
    setNotaAberta(null);
    try {
      const resposta = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          dtInicial: dataInputParaSyspro(dtInicial),
          dtFinal: dataInputParaSyspro(dtFinal),
        }),
      });
      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok)
        throw new Error(json.error ?? "Erro ao consultar as vendas.");
      setVendas(json.vendas as VendaProduto[]);
    } catch (causa) {
      const mensagem =
        causa instanceof Error ? causa.message : "Erro ao consultar as vendas.";
      setErro(mensagem);
      setVendas([]);
      toast.error(mensagem);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Escolha uma empresa e o período para analisar as notas fiscais.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <Campo label="CNPJ / Empresa">
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((empresa) => (
                  <SelectItem key={empresa.id} value={empresa.id}>
                    {empresa.razaoSocial} ({empresa.cnpj})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="Data inicial" htmlFor="dt-inicial">
            <Input
              id="dt-inicial"
              type="date"
              value={dtInicial}
              onChange={(evento) => setDtInicial(evento.target.value)}
            />
          </Campo>
          <Campo label="Data final" htmlFor="dt-final">
            <Input
              id="dt-final"
              type="date"
              value={dtFinal}
              onChange={(evento) => setDtFinal(evento.target.value)}
            />
          </Campo>
          <Button onClick={consultar} disabled={loading}>
            <Search data-icon="inline-start" />
            {loading ? "Consultando..." : "Consultar"}
          </Button>
        </CardContent>
      </Card>
      {erro ? (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-sm text-destructive">
            {erro}
          </CardContent>
        </Card>
      ) : null}
      {vendas.length > 0 ? (
        <>
          <section
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Resumo de vendas"
          >
            <Indicador
              titulo="Total vendido"
              valor={moeda.format(totalVendido)}
              icone={TrendingUp}
            />
            <Indicador
              titulo="Notas fiscais"
              valor={numero.format(notas.length)}
              descricao="notas no período"
              icone={FileText}
            />
            <Indicador
              titulo="Quantidade de itens"
              valor={numero.format(quantidadeItens)}
              icone={Package}
            />
            <Indicador
              titulo="Ticket médio"
              valor={
                notas.length ? moeda.format(totalVendido / notas.length) : "—"
              }
              descricao="por nota fiscal"
              icone={ShoppingCart}
            />
          </section>
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base">
                    {tituloDaMetrica(metrica)} por dia
                  </CardTitle>
                  <SeletorDeMetrica metrica={metrica} onChange={setMetrica} />
                </div>
                <CardDescription>
                  Acompanhe a métrica selecionada ao longo do período.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GraficoFaturamento
                  dados={serieDaMetrica}
                  formato={metrica === "faturamento" ? "moeda" : "numero"}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Produtos com maior faturamento
                </CardTitle>
                <CardDescription>Top 5 do período consultado.</CardDescription>
              </CardHeader>
              <CardContent>
                <GraficoProdutos dados={topProdutos} />
              </CardContent>
            </Card>
          </section>
          <Card>
            <CardHeader>
              <CardTitle>Vendas por nota fiscal</CardTitle>
              <CardDescription>
                {notas.length} notas encontradas. Clique em uma venda para
                visualizar os itens.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>NF</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Itens</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notas.map((nota) => (
                    <NotaRow
                      key={nota.id}
                      nota={nota}
                      aberta={notaAberta === nota.id}
                      onToggle={() =>
                        setNotaAberta((aberta) =>
                          aberta === nota.id ? null : nota.id,
                        )
                      }
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : !loading && !erro ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <BarChart3 className="size-8 text-muted-foreground" />
            <p className="font-medium">
              Consulte um período para montar seu dashboard.
            </p>
            <p className="text-sm text-muted-foreground">
              Os indicadores e as vendas agrupadas aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Campo({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
function Indicador({
  titulo,
  valor,
  descricao,
  icone: Icone,
}: {
  titulo: string;
  valor: string;
  descricao?: string;
  icone: typeof TrendingUp;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 pt-6">
        <span className="rounded-md bg-muted p-2 text-muted-foreground">
          <Icone className="size-5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{titulo}</p>
          <p className="text-2xl font-semibold tracking-tight">{valor}</p>
          {descricao ? (
            <p className="text-xs text-muted-foreground">{descricao}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function SeletorDeMetrica({
  metrica,
  onChange,
}: {
  metrica: MetricaDeVendas;
  onChange: (metrica: MetricaDeVendas) => void;
}) {
  const opcoes: { valor: MetricaDeVendas; rotulo: string }[] = [
    { valor: "faturamento", rotulo: "Faturamento" },
    { valor: "itens", rotulo: "Itens" },
    { valor: "notas", rotulo: "Notas" },
  ];

  return (
    <div
      aria-label="Métrica exibida no gráfico"
      className="inline-flex rounded-lg border bg-muted p-1"
      role="group"
    >
      {opcoes.map((opcao) => (
        <Button
          aria-pressed={metrica === opcao.valor}
          className="h-7 px-2.5 text-xs"
          key={opcao.valor}
          onClick={() => onChange(opcao.valor)}
          size="sm"
          type="button"
          variant={metrica === opcao.valor ? "secondary" : "ghost"}
        >
          {opcao.rotulo}
        </Button>
      ))}
    </div>
  );
}

function tituloDaMetrica(metrica: MetricaDeVendas) {
  return {
    faturamento: "Faturamento",
    itens: "Itens vendidos",
    notas: "Notas fiscais",
  }[metrica];
}

function NotaRow({
  nota,
  aberta,
  onToggle,
}: {
  nota: ReturnType<typeof agruparVendasPorNota>[number];
  aberta: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow data-state={aberta ? "selected" : undefined}>
        <TableCell>
          <Button
            aria-expanded={aberta}
            aria-label={`${aberta ? "Ocultar" : "Mostrar"} itens da nota ${nota.numero}`}
            onClick={onToggle}
            size="icon-sm"
            variant="ghost"
          >
            {aberta ? <ChevronDown /> : <ChevronRight />}
          </Button>
        </TableCell>
        <TableCell className="font-medium">{nota.numero}</TableCell>
        <TableCell>{nota.emissao}</TableCell>
        <TableCell>
          <div>{nota.cliente}</div>
          {nota.cidade || nota.uf ? (
            <div className="text-xs text-muted-foreground">
              {[nota.cidade, nota.uf].filter(Boolean).join(" · ")}
            </div>
          ) : null}
        </TableCell>
        <TableCell className="text-right">
          {numero.format(nota.quantidadeItens)}
        </TableCell>
        <TableCell className="text-right font-medium">
          {moeda.format(nota.total)}
        </TableCell>
      </TableRow>
      {aberta ? (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30 p-4">
            <TabelaItens itens={nota.itens} />
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
function TabelaItens({ itens }: { itens: VendaProduto[] }) {
  return (
    <div className="overflow-x-auto rounded-md border bg-background">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left text-muted-foreground">
          <tr>
            <th className="p-2 font-medium">Produto</th>
            <th className="p-2 font-medium">Código</th>
            <th className="p-2 text-right font-medium">Qtd.</th>
            <th className="p-2 text-right font-medium">Unitário</th>
            <th className="p-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, indice) => (
            <tr
              key={`${item.produto_id}-${indice}`}
              className="border-b last:border-0"
            >
              <td className="p-2">{item.produto_descricao}</td>
              <td className="p-2 text-muted-foreground">{item.produto_id}</td>
              <td className="p-2 text-right">
                {numero.format(paraNumero(item.produto_qtde))}
              </td>
              <td className="p-2 text-right">
                {moeda.format(paraNumero(item.produto_vlr_item))}
              </td>
              <td className="p-2 text-right font-medium">
                {moeda.format(paraNumero(item.produto_vlr_total_item))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
