import { ReportTableFrame } from "./report-table";
import { useMemo, useState } from "react";
import { ArrowLeft, FileText, PackageSearch, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TablePagination } from "@/components/table-pagination";
import { formatarMoeda, formatarNumero } from "@/lib/formatters";
import { formatarDataInputParaBR, type VendaAgrupada } from "@/lib/vendas";
import { produtosDasNotas } from "@/lib/clientes-produtos";
import {
  dataCompraIso,
  type FrequenciaCliente,
} from "@/lib/clientes-frequencia";
import type { Periodo } from "@/lib/periodo";
import { ExportarVisao, type ContextoExportacao } from "./exportar-visao";
import { ReportViewSelector } from "./report-view-toggle";
import { SeletorMultiplo } from "./seletor-multiplo";
import { FiltroRelatorio } from "./filtro-relatorio";
import { VisaoAnaliticaNotas } from "./visao-analitica-notas";

export function DetalhamentoClientes({
  notas,
  anteriores,
  clientes,
  selecionados,
  onSelecionados,
  mes,
  onMes,
  janela,
  onJanela,
  contexto,
  periodoAnterior,
  comparacaoDisponivel,
  onVoltar,
  rotuloVoltar,
}: {
  notas: VendaAgrupada[];
  anteriores: VendaAgrupada[];
  clientes: FrequenciaCliente[];
  selecionados: string[];
  onSelecionados: (nomes: string[]) => void;
  mes: string;
  onMes: (mes: string) => void;
  janela: "atual" | "anterior";
  onJanela: (janela: "atual" | "anterior") => void;
  contexto: ContextoExportacao;
  periodoAnterior: Periodo | null;
  comparacaoDisponivel: boolean;
  onVoltar: () => void;
  rotuloVoltar: string;
}) {
  const [visao, setVisao] = useState<"notas" | "produtos" | "mensal">("notas");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(25);
  const fonte = janela === "anterior" ? anteriores : notas;
  const periodo =
    janela === "anterior" && periodoAnterior
      ? periodoAnterior
      : contexto.periodo;
  const contextoVisao = { ...contexto, periodo };
  const nomes = useMemo(
    () =>
      [...new Set([...notas, ...anteriores].map((nota) => nota.cliente))].sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [notas, anteriores],
  );
  const meses = useMemo(() => {
    const resultado: string[] = [];
    const data = new Date(`${periodo.inicial.slice(0, 7)}-01T00:00:00Z`);
    while (data.toISOString().slice(0, 7) <= periodo.final.slice(0, 7)) {
      resultado.push(data.toISOString().slice(0, 7));
      data.setUTCMonth(data.getUTCMonth() + 1);
    }
    return resultado;
  }, [periodo]);
  const filtradas = useMemo(() => {
    const conjunto = new Set(selecionados);
    return fonte.filter(
      (nota) =>
        (!conjunto.size || conjunto.has(nota.cliente)) &&
        (!mes || dataCompraIso(nota.emissao)?.startsWith(mes)),
    );
  }, [fonte, selecionados, mes]);
  const produtos = useMemo(
    () => produtosDasNotas(filtradas, visao === "mensal"),
    [filtradas, visao],
  );
  const paginaSegura = Math.min(
    pagina,
    Math.max(1, Math.ceil(produtos.length / porPagina)),
  );
  const exibidos = produtos.slice(
    (paginaSegura - 1) * porPagina,
    paginaSegura * porPagina,
  );
  const cliente =
    selecionados.length === 1
      ? clientes.find((item) => item.nome === selecionados[0])
      : undefined;
  const colunas = [
    "Cliente",
    "Empresa",
    ...(visao === "mensal" ? ["Mês"] : []),
    "Código",
    "Produto",
    "Quantidade",
    "Unidade",
    "Notas",
    "Descontos",
    "Faturamento",
  ];
  const linhas = produtos.map((item) => [
    item.cliente,
    item.empresa,
    ...(visao === "mensal" ? [item.mes] : []),
    item.codigo,
    item.produto,
    formatarNumero(item.quantidade, 2),
    item.unidade,
    item.notas,
    formatarMoeda(item.descontos),
    formatarMoeda(item.faturamento),
  ]);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onVoltar}>
          <ArrowLeft data-icon="inline-start" />
          {rotuloVoltar}
        </Button>
        <SeletorMultiplo
          valores={nomes}
          selecionados={selecionados}
          onChange={(nomes) => {
            onSelecionados(nomes);
            setPagina(1);
          }}
          rotulo="Cliente"
        />
        <FiltroRelatorio
          rotulo="Dados do detalhamento"
          valor={janela}
          onChange={(valor) => {
            onJanela(valor as "atual" | "anterior");
            onMes("");
            setPagina(1);
          }}
          opcoes={[
            { valor: "atual", rotulo: "Período atual" },
            {
              valor: "anterior",
              rotulo: "Período comparado",
              disabled: !comparacaoDisponivel,
            },
          ]}
        />
        <FiltroRelatorio
          rotulo="Mês do detalhamento"
          valor={mes || "todos"}
          onChange={(valor) => {
            onMes(valor === "todos" ? "" : valor);
            setPagina(1);
          }}
          opcoes={[
            { valor: "todos", rotulo: "Todos os meses" },
            ...meses.map((mes) => ({
              valor: mes,
              rotulo: `${mes.slice(5)}/${mes.slice(0, 4)}`,
            })),
          ]}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {selecionados.length === 1
          ? selecionados[0]
          : `${selecionados.length || nomes.length} clientes`}{" "}
        · {formatarDataInputParaBR(periodo.inicial)} a{" "}
        {formatarDataInputParaBR(periodo.final)}
        {mes ? ` · Mês: ${mes.slice(5)}/${mes.slice(0, 4)}` : ""}
      </p>
      {cliente ? (
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            Faturamento atual: {formatarMoeda(cliente.faturamento)}
          </Badge>
          <Badge variant="outline">
            Comparado:{" "}
            {cliente.faturamentoAnterior === null
              ? "—"
              : formatarMoeda(cliente.faturamentoAnterior)}
          </Badge>
          <Badge variant="outline">
            Dias com compra: {cliente.diasComCompra} · comparado:{" "}
            {cliente.diasAnteriores ?? "—"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Totais das janelas completas.
          </span>
        </div>
      ) : null}
      <ReportViewSelector
        view={visao}
        onViewChange={(valor) => {
          setVisao(valor);
          setPagina(1);
        }}
        options={[
          { value: "notas", label: "Notas", icon: FileText },
          {
            value: "produtos",
            label: "Produtos consolidados",
            icon: PackageSearch,
          },
          { value: "mensal", label: "Produtos por mês", icon: CalendarDays },
        ]}
        ariaLabel="Visão do detalhamento"
      />
      <div hidden={visao !== "notas"}>
        <VisaoAnaliticaNotas
          key={`${selecionados.join("|")}-${mes}-${janela}`}
          notas={filtradas}
          dimensaoChave="cliente"
          dimensaoRotulo="Cliente"
          selecionados={[]}
          onSelecionadosChange={() => {}}
          onVoltar={onVoltar}
          dimensaoTemColunaPropria
          contextoExportacao={contextoVisao}
          ocultarNavegacao
          expandirItens
        />
      </div>
      {visao !== "notas" ? (
        <>
          <div className="flex justify-end">
            <ExportarVisao
              titulo={`Clientes - ${visao === "mensal" ? "Produtos por mês" : "Produtos consolidados"}`}
              contexto={contextoVisao}
              colunas={colunas}
              linhas={linhas}
              observacoes={mes ? `Mês filtrado: ${mes}` : undefined}
            />
          </div>
          <ReportTableFrame>
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  {colunas.map((coluna) => (
                    <th key={coluna} className="whitespace-nowrap p-3">
                      {coluna}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exibidos.length ? (
                  exibidos.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="p-3">{item.cliente}</td>
                      <td className="p-3">{item.empresa}</td>
                      {visao === "mensal" ? (
                        <td className="whitespace-nowrap p-3">
                          {item.mes === "Sem data"
                            ? item.mes
                            : `${item.mes.slice(5)}/${item.mes.slice(0, 4)}`}
                        </td>
                      ) : null}
                      <td className="p-3">{item.codigo}</td>
                      <td className="min-w-40 p-3">{item.produto}</td>
                      <td className="p-3 text-right">
                        {formatarNumero(item.quantidade, 2)}
                      </td>
                      <td className="p-3">{item.unidade}</td>
                      <td className="p-3 text-right">{item.notas}</td>
                      <td className="whitespace-nowrap p-3 text-right">
                        {formatarMoeda(item.descontos)}
                      </td>
                      <td className="whitespace-nowrap p-3 text-right">
                        {formatarMoeda(item.faturamento)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={colunas.length}
                      className="p-8 text-center text-muted-foreground"
                    >
                      Nenhum produto neste recorte.
                    </td>
                  </tr>
                )}
              </tbody>
            </ReportTableFrame>
          <TablePagination
            paginaAtual={paginaSegura}
            totalItens={produtos.length}
            itensPorPagina={porPagina}
            onPaginaChange={setPagina}
            onItensPorPaginaChange={(valor) => {
              setPorPagina(valor);
              setPagina(1);
            }}
            labelItens="produtos"
          />
        </>
      ) : null}
    </div>
  );
}
