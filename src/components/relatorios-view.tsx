"use client";

import { useEffect, useState, useMemo } from "react";
import { ReportContext } from "./relatorios/report-context";
import { useRouter } from "next/navigation";
import { FiltroRelatorio } from "./relatorios/filtro-relatorio";
import { erroPeriodo } from "@/lib/periodo";
import { REPORT_DEFINITIONS } from "./relatorios/report-definitions";
import {
  Sparkles,
  Building2,
  Star,
} from "lucide-react";
import type { VendaProduto, VendaComEmpresa } from "@/lib/syspro-api";
import {
  calcularCurvaABC,
  analiseDepartamentos,
  analiseVendedores,
  analiseClientes,
  analiseEmpresas,
  analiseEvolucaoVendas,
  analiseProdutosPorDimensao,
  analiseSazonalidade,
  analiseGeografica,
  analiseUFs,
  analiseFinanceira,
  agruparVendasPorNota,
  calcularVariacoesPeriodo,
  concentracaoTopN,
  analiseClientesNovosRecorrentes,
  analiseContribuicaoVariacao,
  analiseDriversVendedores,
  classeAPerdendoParticipacao,
  mudancaMixTopProdutos,
  isClienteConsumidorGenerico,
  formatarDataInputParaBR,
  type MetricaCurvaABC,
} from "@/lib/vendas";
import {
  DateRangeFilter,
  periodoMesAtual,
  type Periodo,
} from "@/components/date-range-filter";
import { useConsultaVendas } from "@/hooks/use-consulta-vendas";
import {
  GlossarioRelatorio,
  GUIAS_RELATORIOS,
} from "@/components/relatorio-guia";

import { FeedbackState } from "@/components/feedback-state";
import { DataFilterBar } from "@/components/data-filter-bar";
import { toast } from "sonner";
import { resolverEmpresaSelecionada } from "@/lib/empresa-selecao";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { MetricsStripItem } from "@/components/analytics/metrics-strip";
import {
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
} from "@/lib/formatters";

// Subcomponentes modulares de abas
import { AbaCurvaABC } from "./relatorios/aba-curva-abc";
import { AbaClientes } from "./relatorios/aba-clientes";
import { AbaSazonalidade } from "./relatorios/aba-sazonalidade";
import { AbaDepartamentos } from "./relatorios/aba-departamentos";
import { AbaVendedores } from "./relatorios/aba-vendedores";
import { AbaGeografico } from "./relatorios/aba-geografico";
import { AbaFinanceiro } from "./relatorios/aba-financeiro";
import { PanoramaPeriodo } from "./relatorios/panorama-periodo";
import { StatusRelatorio } from "./relatorios/ui/status-relatorio";
import { ConsolidacaoEmpresas } from "./relatorios/consolidacao-empresas";
import {
  analisarFrequenciaClientes,
  normalizarClientes,
} from "@/lib/clientes-frequencia";
import {
  resolverComparacao,
  rotuloModoComparacao,
  type ModoComparacao,
} from "@/lib/periodo-comparacao";
import { ComparacaoPeriodo } from "./relatorios/comparacao-periodo";
import { ReportDiagnostics } from "./relatorios/report-diagnostics";
import { AbaMargens } from "./relatorios/aba-margens";

interface EmpresaOption {
  id: string;
  cnpj: string;
  razaoSocial: string;
}

interface Props {
  empresas: EmpresaOption[];
  empresaInicial?: string;
  abaInicial?: string;
  initialPeriod?: Periodo;
  initialVendas?: (VendaProduto | VendaComEmpresa)[];
  initialPeriodoAnterior?: { inicial: string; final: string };
  initialModoComparacao?: ModoComparacao;
  initialComparacaoPersonalizada?: Periodo;
  initialVendasAnteriores?: (VendaProduto | VendaComEmpresa)[];
  initialComparacaoDisponivel?: boolean;
  initialError?: string;
  userId: string;
  buscaInicial?: string;
  classeInicial?: string;
  metricaInicial?: string;
  margemInicial?: string;
}

const relatoriosOpcoes = REPORT_DEFINITIONS;
const abasComBusca = new Set([
  "curva-abc",
  "clientes",
  "departamentos",
  "vendedores",
  "geografico",
]);

export function RelatoriosView({
  empresas,
  empresaInicial,
  abaInicial,
  initialPeriod,
  initialVendas = [],
  initialPeriodoAnterior,
  initialModoComparacao = "mes-anterior",
  initialComparacaoPersonalizada,
  initialVendasAnteriores = [],
  initialComparacaoDisponivel = true,
  initialError,
  userId,
  buscaInicial = "",
  classeInicial,
  metricaInicial,
  margemInicial,
}: Props) {
  const [empresaId] = useState(() =>
    resolverEmpresaSelecionada(empresaInicial, empresas),
  );

  const router = useRouter();
  const [periodo, setPeriodo] = useState<Periodo>(
    initialPeriod ?? periodoMesAtual(),
  );
  const [periodoConsultado, setPeriodoConsultado] = useState<Periodo>(
    initialPeriod ?? periodoMesAtual(),
  );
  const [modoComparacao, setModoComparacao] =
    useState<ModoComparacao>(initialModoComparacao);
  const [modoConsultado, setModoConsultado] =
    useState<ModoComparacao>(initialModoComparacao);
  const [comparacaoPersonalizada, setComparacaoPersonalizada] =
    useState<Periodo>(
      initialComparacaoPersonalizada ??
        initialPeriodoAnterior ??
        resolverComparacao(initialPeriod ?? periodoMesAtual(), "mes-anterior"),
    );
  const [periodoAnterior, setPeriodoAnterior] = useState<{
    inicial: string;
    final: string;
  } | null>(
    initialPeriodoAnterior ??
      (initialPeriod
        ? resolverComparacao(initialPeriod, "mes-anterior")
        : null),
  );
  const {
    vendas,
    vendasAnteriores,
    comparacaoDisponivel,
    consultadoEm,
    erro,
    loading,
    consultar: consultarVendas,
  } = useConsultaVendas(
    initialVendas,
    initialError,
    initialVendasAnteriores,
    initialComparacaoDisponivel,
  );
  const [abaAtiva] = useState(abaInicial || "curva-abc");
  const [visaoFavorita, setVisaoFavorita] = useState(false);
  const favoriteKey = `syspro:favorite-report:${userId}:${abaAtiva}`;
  useEffect(() => {
    let ativo = true;
    queueMicrotask(() => {
      if (ativo) setVisaoFavorita(localStorage.getItem(favoriteKey) === "1");
    });
    return () => { ativo = false; };
  }, [favoriteKey]);
  const vendasClientes = useMemo(
    () => (abaAtiva === "clientes" ? normalizarClientes(vendas) : []),
    [vendas, abaAtiva],
  );
  const vendasClientesAnteriores = useMemo(
    () => (abaAtiva === "clientes" ? normalizarClientes(vendasAnteriores) : []),
    [vendasAnteriores, abaAtiva],
  );
  const relatorioAtivo = useMemo(
    () => relatoriosOpcoes.find((relatorio) => relatorio.id === abaAtiva),
    [abaAtiva],
  );

  // Comparativo do período (métricas centrais) — infraestrutura já usada no Dashboard.
  const variacoesPeriodo = useMemo(
    () =>
      comparacaoDisponivel
        ? calcularVariacoesPeriodo(
            abaAtiva === "clientes" ? vendasClientes : vendas,
            abaAtiva === "clientes"
              ? vendasClientesAnteriores
              : vendasAnteriores,
          )
        : null,
    [
      vendas,
      vendasAnteriores,
      vendasClientes,
      vendasClientesAnteriores,
      abaAtiva,
      comparacaoDisponivel,
    ],
  );
  const rotuloPeriodoAnterior = useMemo(() => {
    if (!periodoAnterior?.inicial || !periodoAnterior?.final) return undefined;
    return `${formatarDataInputParaBR(periodoAnterior.inicial)} a ${formatarDataInputParaBR(periodoAnterior.final)}`;
  }, [periodoAnterior]);

  const cicloClientes = useMemo(
    () =>
      abaAtiva === "clientes" && comparacaoDisponivel
        ? analiseClientesNovosRecorrentes(
            vendasClientes,
            vendasClientesAnteriores,
          )
        : null,
    [
      abaAtiva,
      comparacaoDisponivel,
      vendasClientes,
      vendasClientesAnteriores,
    ],
  );

  const contribuicaoAtiva = useMemo(() => {
    if (!comparacaoDisponivel) return null;
    if (abaAtiva === "clientes") {
      return analiseContribuicaoVariacao(
        vendasClientes,
        vendasClientesAnteriores,
        "cliente",
      );
    }
    if (abaAtiva === "vendedores") {
      return analiseContribuicaoVariacao(
        vendas,
        vendasAnteriores,
        "vendedor",
      );
    }
    if (abaAtiva === "departamentos") {
      return analiseContribuicaoVariacao(
        vendas,
        vendasAnteriores,
        "departamento",
      );
    }
    if (abaAtiva === "geografico") {
      return analiseContribuicaoVariacao(vendas, vendasAnteriores, "cidade");
    }
    if (abaAtiva === "curva-abc") {
      return analiseContribuicaoVariacao(vendas, vendasAnteriores, "produto");
    }
    return null;
  }, [
    abaAtiva,
    comparacaoDisponivel,
    vendas,
    vendasAnteriores,
    vendasClientes,
    vendasClientesAnteriores,
  ]);

  const driversVendedores = useMemo(
    () =>
      abaAtiva === "vendedores" && comparacaoDisponivel
        ? analiseDriversVendedores(vendas, vendasAnteriores)
        : [],
    [abaAtiva, comparacaoDisponivel, vendas, vendasAnteriores],
  );

  const classeAEmQueda = useMemo(
    () =>
      abaAtiva === "curva-abc" && comparacaoDisponivel
        ? classeAPerdendoParticipacao(vendas, vendasAnteriores)
        : [],
    [abaAtiva, comparacaoDisponivel, vendas, vendasAnteriores],
  );

  const mudancaMix = useMemo(
    () =>
      abaAtiva === "curva-abc" && comparacaoDisponivel
        ? mudancaMixTopProdutos(vendas, vendasAnteriores, 10)
        : null,
    [abaAtiva, comparacaoDisponivel, vendas, vendasAnteriores],
  );

  // Filtros internos
  const [busca, setBusca] = useState(buscaInicial);
  const [filtroClasseAbc, setFiltroClasseAbc] = useState<
    "todas" | "A" | "B" | "C"
  >(["A", "B", "C"].includes(classeInicial ?? "") ? classeInicial as "A" | "B" | "C" : "todas");
  const [filtroClasseCli, setFiltroClasseCli] = useState<
    "todas" | "A" | "B" | "C"
  >(["A", "B", "C"].includes(classeInicial ?? "") ? classeInicial as "A" | "B" | "C" : "todas");
  const [metricaCurvaABC, setMetricaCurvaABC] =
    useState<MetricaCurvaABC>(
      ["faturamento", "lucro", "quantidade", "custo"].includes(metricaInicial ?? "")
        ? metricaInicial as MetricaCurvaABC
        : "faturamento",
    );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (busca.trim()) params.set("busca", busca.trim());
    else params.delete("busca");
    const classe = abaAtiva === "clientes" ? filtroClasseCli : filtroClasseAbc;
    if ((abaAtiva === "clientes" || abaAtiva === "curva-abc") && classe !== "todas") params.set("classe", classe);
    else params.delete("classe");
    if (abaAtiva === "curva-abc" && metricaCurvaABC !== "faturamento") params.set("metrica", metricaCurvaABC);
    else params.delete("metrica");
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [abaAtiva, busca, filtroClasseAbc, filtroClasseCli, metricaCurvaABC]);

  const empresaAtual = useMemo(
    () => empresas.find((e) => e.id === empresaId),
    [empresas, empresaId],
  );
  const empresasSelecionadas = useMemo(() => {
    const ids =
      empresaId === "todas"
        ? empresas.map((empresa) => empresa.id)
        : empresaId
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean);
    return empresas.filter((empresa) => ids.includes(empresa.id));
  }, [empresaId, empresas]);
  const modoConsolidado = empresasSelecionadas.length > 1;
  const rotuloEmpresa = modoConsolidado
    ? `Consolidado (${empresasSelecionadas.length} empresas)`
    : (empresaAtual?.razaoSocial ?? "Empresa Selecionada");
  const consolidacaoEmpresas = useMemo(() => analiseEmpresas(vendas), [vendas]);

  // Cálculos analíticos otimizados com Lazy Memoization por aba ativa
  const relatorioABC = useMemo(() => {
    if (abaAtiva !== "curva-abc") {
      return {
        itens: [],
        metrica: metricaCurvaABC,
        valorTotal: 0,
        totalItens: 0,
        resumoA: {
          valor: 0,
          itens: 0,
          percentualValor: 0,
          percentualItens: 0,
        },
        resumoB: {
          valor: 0,
          itens: 0,
          percentualValor: 0,
          percentualItens: 0,
        },
        resumoC: {
          valor: 0,
          itens: 0,
          percentualValor: 0,
          percentualItens: 0,
        },
      };
    }
    return calcularCurvaABC(vendas, metricaCurvaABC);
  }, [vendas, abaAtiva, metricaCurvaABC]);

  const relatorioDeptos = useMemo(() => {
    if (abaAtiva !== "departamentos") return [];
    return analiseDepartamentos(vendas);
  }, [vendas, abaAtiva]);

  const relatorioVendedores = useMemo(() => {
    if (abaAtiva !== "vendedores") return [];
    return analiseVendedores(vendas);
  }, [vendas, abaAtiva]);

  const frequenciaClientes = useMemo(
    () =>
      abaAtiva === "clientes"
        ? analisarFrequenciaClientes(
            vendasClientes,
            vendasClientesAnteriores,
            periodoConsultado,
            periodoAnterior,
            comparacaoDisponivel,
          )
        : null,
    [
      abaAtiva,
      vendasClientes,
      vendasClientesAnteriores,
      periodoConsultado,
      periodoAnterior,
      comparacaoDisponivel,
    ],
  );

  // Notas agrupadas por NF — base das visões analíticas (Vendedores, Clientes, Cidades)
  const notasAgrupadasRelatorio = useMemo(() => {
    if (
      abaAtiva !== "vendedores" &&
      abaAtiva !== "clientes" &&
      abaAtiva !== "geografico"
    )
      return [];
    return agruparVendasPorNota(
      abaAtiva === "clientes" ? vendasClientes : vendas,
    );
  }, [vendas, vendasClientes, abaAtiva]);
  const notasClientesAnteriores = useMemo(
    () =>
      abaAtiva === "clientes" && comparacaoDisponivel
        ? agruparVendasPorNota(vendasClientesAnteriores)
        : [],
    [abaAtiva, comparacaoDisponivel, vendasClientesAnteriores],
  );

  const relatorioClientes = useMemo(() => {
    if (abaAtiva !== "clientes") {
      return { itens: [] };
    }
    return analiseClientes(vendasClientes);
  }, [vendasClientes, abaAtiva]);

  // Concentração Top 10/Top 20 de clientes e produtos (Pareto de dependência)
  const concentracaoProdutosTop20 = useMemo(
    () =>
      abaAtiva === "curva-abc"
        ? concentracaoTopN(
            relatorioABC.itens.map((item) => ({ faturamento: item.valorClassificacao })),
            20,
          )
        : null,
    [abaAtiva, relatorioABC],
  );

  const relatorioSazonalidade = useMemo(() => {
    if (abaAtiva !== "sazonalidade") {
      return { porDiaSemana: [], porQuinzena: [] };
    }
    return analiseSazonalidade(vendas, periodoConsultado);
  }, [vendas, abaAtiva, periodoConsultado]);

  const relatorioEvolucao = useMemo(() => {
    if (abaAtiva !== "sazonalidade") return { diario: [], mensal: [] };
    return analiseEvolucaoVendas(vendas);
  }, [vendas, abaAtiva]);

  const produtosPorVendedor = useMemo(() => {
    if (abaAtiva !== "vendedores") return [];
    return analiseProdutosPorDimensao(vendas, "vendedor");
  }, [vendas, abaAtiva]);

  const relatorioGeografico = useMemo(() => {
    if (abaAtiva !== "geografico") return [];
    return analiseGeografica(vendas);
  }, [vendas, abaAtiva]);

  const relatorioUFs = useMemo(() => {
    if (abaAtiva !== "geografico") return [];
    return analiseUFs(vendas);
  }, [vendas, abaAtiva]);

  const relatorioFinanceiro = useMemo(() => {
    if (abaAtiva !== "financeiro") {
      return {
        formasPagamento: [],
        modelosDocumento: [],
      };
    }
    return analiseFinanceira(vendas);
  }, [vendas, abaAtiva]);

  // Itens ABC filtrados
  const itensAbcFiltrados = useMemo(() => {
    return relatorioABC.itens.filter((item) => {
      if (filtroClasseAbc !== "todas" && item.classe !== filtroClasseAbc) {
        return false;
      }
      if (busca.trim()) {
        const termo = busca.toLowerCase().trim();
        return (
          item.produto.toLowerCase().includes(termo) ||
          item.codigoReferencia.toLowerCase().includes(termo) ||
          item.departamento.toLowerCase().includes(termo)
        );
      }
      return true;
    });
  }, [relatorioABC.itens, filtroClasseAbc, busca]);

  // Clientes filtrados
  const clientesFiltrados = useMemo(() => {
    return relatorioClientes.itens.filter((item) => {
      if (filtroClasseCli !== "todas" && item.classe !== filtroClasseCli) {
        return false;
      }
      if (busca.trim()) {
        const termo = busca.toLowerCase().trim();
        return (
          item.nome.toLowerCase().includes(termo) ||
          item.cidade.toLowerCase().includes(termo) ||
          item.uf.toLowerCase().includes(termo)
        );
      }
      return true;
    });
  }, [relatorioClientes.itens, filtroClasseCli, busca]);

  // Vendedores filtrados
  const vendedoresFiltrados = useMemo(() => {
    if (!busca.trim()) return relatorioVendedores;
    const termo = busca.toLowerCase().trim();
    return relatorioVendedores.filter(
      (v) =>
        v.nome.toLowerCase().includes(termo) ||
        (v.principalProduto &&
          v.principalProduto.toLowerCase().includes(termo)),
    );
  }, [relatorioVendedores, busca]);

  // Departamentos filtrados
  const deptosFiltrados = useMemo(() => {
    if (!busca.trim()) return relatorioDeptos;
    const termo = busca.toLowerCase().trim();
    return relatorioDeptos.filter((d) => d.nome.toLowerCase().includes(termo));
  }, [relatorioDeptos, busca]);

  // Cidades filtradas
  const cidadesFiltradas = useMemo(() => {
    if (!busca.trim()) return relatorioGeografico;
    const termo = busca.toLowerCase().trim();
    return relatorioGeografico.filter(
      (c) =>
        c.cidade.toLowerCase().includes(termo) ||
        c.uf.toLowerCase().includes(termo),
    );
  }, [relatorioGeografico, busca]);

  const vendedoresEmQueda = useMemo(() => {
    if (abaAtiva !== "vendedores" || !comparacaoDisponivel) return [];
    return analiseDriversVendedores(vendas, vendasAnteriores)
      .filter((item) => item.diferencaFaturamento < 0)
      .map((item) => item.vendedor);
  }, [abaAtiva, comparacaoDisponivel, vendas, vendasAnteriores]);

  const deptosAnteriores = useMemo(
    () => (comparacaoDisponivel ? analiseDepartamentos(vendasAnteriores) : []),
    [comparacaoDisponivel, vendasAnteriores],
  );

  const ufsAnteriores = useMemo(
    () => (comparacaoDisponivel ? analiseUFs(vendasAnteriores) : []),
    [comparacaoDisponivel, vendasAnteriores],
  );

  const indicadoresContextuais = useMemo<MetricsStripItem[]>(() => {
    if (abaAtiva === "curva-abc") {
      const classes = [
        { rotulo: "Classe A", resumo: relatorioABC.resumoA },
        { rotulo: "Classe B", resumo: relatorioABC.resumoB },
        { rotulo: "Classe C", resumo: relatorioABC.resumoC },
      ];
      const formatar = (valor: number) =>
        relatorioABC.metrica === "quantidade" ? formatarNumero(valor, 2) : formatarMoeda(valor);
      return classes.map(({ rotulo, resumo }) => ({
        rotulo,
        valor: formatar(resumo.valor),
        detalhe: `${formatarPercentual(resumo.percentualValor, 1)} · ${formatarNumero(resumo.itens, 0)} itens`,
        definicao:
          "Faixa da curva ABC: a classe A concentra os itens que respondem pela maior parte da métrica selecionada (Pareto).",
      }));
    }

    if (abaAtiva === "clientes") return [];

    if (abaAtiva === "vendedores") {
      const ativos = relatorioVendedores.filter((item) => item.faturamento > 0);
      const desconto = ativos.reduce((soma, item) => soma + item.descontoConcedido, 0);
      const bruto = ativos.reduce((soma, item) => soma + item.faturamento + item.descontoConcedido, 0);
      const comCusto = ativos.filter((item) => item.coberturaCusto > 0);
      const lucro = comCusto.reduce((soma, item) => soma + item.lucroBruto, 0);
      const receita = comCusto.reduce((soma, item) => soma + item.faturamentoComCusto, 0);
      return [
        {
          rotulo: "Vendedores ativos",
          valor: formatarNumero(ativos.length, 0),
          definicao: "Vendedores com faturamento no período consultado.",
        },
        {
          rotulo: "Desconto concedido",
          valor: formatarMoeda(desconto),
          detalhe: bruto > 0 ? `taxa ${formatarPercentual((desconto / bruto) * 100, 1)} sobre o valor bruto` : undefined,
          definicao:
            "Soma dos descontos aplicados nos itens. A taxa é o desconto dividido pelo valor antes do desconto (faturamento + desconto).",
        },
        {
          rotulo: "Margem da equipe",
          valor: receita > 0 ? formatarPercentual((lucro / receita) * 100, 1) : "—",
          detalhe: receita > 0 ? `lucro ${formatarMoeda(lucro)}` : "sem custo informado",
          definicao:
            "Lucro bruto dividido pela receita dos itens que possuem custo de reposição informado.",
        },
      ];
    }

    if (abaAtiva === "departamentos") {
      const ativos = relatorioDeptos.filter((item) => item.faturamento > 0);
      const desconto = ativos.reduce((soma, item) => soma + item.descontoConcedido, 0);
      const bruto = ativos.reduce((soma, item) => soma + item.faturamento + item.descontoConcedido, 0);
      const top = [...ativos].sort((a, b) => b.faturamento - a.faturamento)[0];
      return [
        {
          rotulo: "Departamentos ativos",
          valor: formatarNumero(ativos.length, 0),
          definicao: "Departamentos com faturamento no período consultado.",
        },
        {
          rotulo: "Desconto concedido",
          valor: formatarMoeda(desconto),
          detalhe: bruto > 0 ? `taxa ${formatarPercentual((desconto / bruto) * 100, 1)}` : undefined,
          definicao:
            "Soma dos descontos dos itens. A taxa é o desconto dividido pelo valor antes do desconto (faturamento + desconto).",
        },
        {
          rotulo: "Maior departamento",
          valor: top?.nome ?? "—",
          detalhe: top ? `${formatarMoeda(top.faturamento)} · ${formatarPercentual(top.percentual, 1)}` : undefined,
          definicao: "Departamento com maior faturamento no período.",
        },
      ];
    }

    if (abaAtiva === "geografico") {
      const cidades = relatorioGeografico.filter((item) => item.faturamento > 0);
      const ufs = relatorioUFs.filter((item) => item.faturamento > 0);
      const top = [...cidades].sort((a, b) => b.faturamento - a.faturamento)[0];
      return [
        {
          rotulo: "Cidades ativas",
          valor: formatarNumero(cidades.length, 0),
          detalhe: `${formatarNumero(ufs.length, 0)} UFs atendidas`,
          definicao: "Cidades e UFs com vendas no período consultado.",
        },
        {
          rotulo: "Maior praça",
          valor: top ? `${top.cidade} / ${top.uf}` : "—",
          detalhe: top ? `${formatarMoeda(top.faturamento)} · ${formatarPercentual(top.percentual, 1)}` : undefined,
          definicao: "Cidade com maior faturamento no período consultado.",
        },
      ];
    }

    if (abaAtiva === "financeiro") {
      const principal = relatorioFinanceiro.formasPagamento[0];
      const desconto = relatorioFinanceiro.formasPagamento.reduce(
        (soma, item) => soma + item.descontoConcedido,
        0,
      );
      const bruto = relatorioFinanceiro.formasPagamento.reduce(
        (soma, item) => soma + item.total + item.descontoConcedido,
        0,
      );
      const aPrazo = relatorioFinanceiro.formasPagamento
        .filter((item) => /prazo|boleto|credi[aá]rio|30|60|90/i.test(item.nome))
        .reduce((soma, item) => soma + item.percentual, 0);
      return [
        {
          rotulo: "Forma predominante",
          valor: principal?.nome ?? "—",
          detalhe: principal ? formatarPercentual(principal.percentual, 1) : undefined,
          definicao: "Forma de pagamento com maior faturamento no período consultado.",
        },
        {
          rotulo: "Desconto concedido",
          valor: formatarMoeda(desconto),
          detalhe: bruto > 0 ? `taxa ${formatarPercentual((desconto / bruto) * 100, 1)}` : undefined,
          definicao:
            "Desconto aplicado nas vendas e sua taxa sobre o valor antes do desconto (faturamento + desconto).",
        },
        {
          rotulo: "Participação a prazo",
          valor: formatarPercentual(aPrazo, 1),
          definicao:
            "Soma da participação das formas de pagamento identificadas como a prazo (boleto, crediário, 30/60/90 dias).",
        },
      ];
    }

    if (abaAtiva === "sazonalidade") {
      const melhorDia = [...relatorioSazonalidade.porDiaSemana].sort(
        (a, b) => b.faturamentoMedioPorOcorrencia - a.faturamentoMedioPorOcorrencia,
      )[0];
      const piorDia = [...relatorioSazonalidade.porDiaSemana].sort(
        (a, b) => a.faturamentoMedioPorOcorrencia - b.faturamentoMedioPorOcorrencia,
      )[0];
      return [
        {
          rotulo: "Melhor dia",
          valor: melhorDia?.dia ?? "—",
          detalhe: melhorDia
            ? `${formatarMoeda(melhorDia.faturamentoMedioPorOcorrencia)} por ocorrência`
            : undefined,
          definicao: "Dia da semana com maior faturamento médio por ocorrência no período consultado.",
        },
        {
          rotulo: "Pior dia",
          valor: piorDia?.dia ?? "—",
          detalhe: piorDia
            ? `${formatarMoeda(piorDia.faturamentoMedioPorOcorrencia)} por ocorrência`
            : undefined,
          definicao: "Dia da semana com menor faturamento médio por ocorrência no período consultado.",
        },
      ];
    }

    return [];
  }, [
    abaAtiva,
    relatorioABC,
    relatorioVendedores,
    relatorioDeptos,
    relatorioGeografico,
    relatorioUFs,
    relatorioFinanceiro,
    relatorioSazonalidade,
  ]);

  const diagnosticoRelatorio = useMemo(() => {
    if (abaAtiva === "clientes") {
      const clientesIdentificados = relatorioClientes.itens.filter(
        (item) => !isClienteConsumidorGenerico(item.nome),
      );
      const top5 = concentracaoTopN(clientesIdentificados, 5);
      const top10 = concentracaoTopN(clientesIdentificados, 10);
      return (
        <ReportDiagnostics
          titulo="Saúde da carteira"
          metricas={[
            ...(cicloClientes
              ? [
                  {
                    label: "Só no período atual",
                    value: formatarNumero(cicloClientes.novos, 0),
                    detail: `${formatarMoeda(cicloClientes.receitaNovos)} · não comprova aquisição`,
                  },
                  {
                    label: "Clientes recorrentes",
                    value: formatarNumero(cicloClientes.recorrentes, 0),
                    detail: `${formatarPercentual(
                      cicloClientes.percentualReceitaRecorrentes,
                      1,
                    )} da receita identificada`,
                  },
                  {
                    label: "Sem compra no atual",
                    value: formatarNumero(cicloClientes.inativos, 0),
                    detail: "Compraram no período comparado",
                    attention: cicloClientes.inativos > 0,
                  },
                ]
              : []),
            {
              label: "Concentração Top 5 / 10",
              value: `${formatarPercentual(
                top5.percentualTop,
                1,
              )} / ${formatarPercentual(top10.percentualTop, 1)}`,
              detail: "Participação na receita identificada",
            },
          ]}
          crescimento={contribuicaoAtiva?.crescimento ?? []}
          queda={contribuicaoAtiva?.queda ?? []}
        />
      );
    }

    if (abaAtiva === "vendedores") {
      const top3 = concentracaoTopN(relatorioVendedores, 3);
      const top5 = concentracaoTopN(relatorioVendedores, 5);
      const porVolume = driversVendedores.filter(
        (item) => item.driver === "volume",
      ).length;
      const porTicket = driversVendedores.filter(
        (item) => item.driver === "ticket",
      ).length;
      const ticketEmQueda = driversVendedores.filter(
        (item) => item.ticketEmQueda,
      );
      return (
        <ReportDiagnostics
          titulo="Diagnóstico da equipe"
          metricas={[
            {
              label: "Concentração Top 3 / 5",
              value: `${formatarPercentual(
                top3.percentualTop,
                1,
              )} / ${formatarPercentual(top5.percentualTop, 1)}`,
              detail: "Participação no faturamento",
            },
            ...(comparacaoDisponivel
              ? [
                  {
                    label: "Crescimento por volume",
                    value: formatarNumero(porVolume, 0),
                    detail:
                      "Receita cresceu com mais pedidos e sem alta de ticket",
                  },
                  {
                    label: "Crescimento por ticket",
                    value: formatarNumero(porTicket, 0),
                    detail:
                      "Receita cresceu com ticket maior e sem alta de pedidos",
                  },
                  {
                    label: "Receita ↑ com ticket ↓",
                    value: formatarNumero(ticketEmQueda.length, 0),
                    detail: ticketEmQueda[0]
                      ? ticketEmQueda[0].vendedor
                      : "Nenhum vendedor sinalizado",
                    attention: ticketEmQueda.length > 0,
                  },
                ]
              : []),
          ]}
          crescimento={contribuicaoAtiva?.crescimento ?? []}
          queda={contribuicaoAtiva?.queda ?? []}
        />
      );
    }

    if (abaAtiva === "departamentos") {
      const top3 = concentracaoTopN(relatorioDeptos, 3);
      return (
        <ReportDiagnostics
          titulo="Diagnóstico do mix por departamento"
          metricas={[
            {
              label: "Concentração Top 3",
              value: formatarPercentual(top3.percentualTop, 1),
              detail: "Receita concentrada nos três maiores departamentos",
            },
          ]}
          crescimento={contribuicaoAtiva?.crescimento ?? []}
          queda={contribuicaoAtiva?.queda ?? []}
        />
      );
    }

    if (abaAtiva === "geografico") {
      const top5 = concentracaoTopN(relatorioGeografico, 5);
      return (
        <ReportDiagnostics
          titulo="Diagnóstico geográfico"
          metricas={[
            {
              label: "Concentração Top 5 cidades",
              value: formatarPercentual(top5.percentualTop, 1),
              detail: "Participação das cinco maiores praças",
            },
          ]}
          crescimento={contribuicaoAtiva?.crescimento ?? []}
          queda={contribuicaoAtiva?.queda ?? []}
        />
      );
    }

    if (abaAtiva === "curva-abc" && comparacaoDisponivel) {
      return (
        <ReportDiagnostics
          titulo="Mudança de mix e contribuição"
          metricas={[
            ...(mudancaMix
              ? [
                  {
                    label: "Renovação do Top 10",
                    value: formatarPercentual(
                      mudancaMix.renovacaoPercentual,
                      1,
                    ),
                    detail: `${mudancaMix.itensNovosNoTop} novos entre os ${mudancaMix.itensAtuais} atuais`,
                  },
                ]
              : []),
            {
              label: "Classe A perdendo participação",
              value: formatarNumero(classeAEmQueda.length, 0),
              detail:
                classeAEmQueda[0]
                  ? `${classeAEmQueda[0].produto}: ${formatarNumero(
                      classeAEmQueda[0].diferencaPp,
                      1,
                    )} p.p.`
                  : "Nenhuma perda comparável",
              attention: classeAEmQueda.length > 0,
            },
          ]}
          crescimento={contribuicaoAtiva?.crescimento ?? []}
          queda={contribuicaoAtiva?.queda ?? []}
        />
      );
    }

    return null;
  }, [
    abaAtiva,
    comparacaoDisponivel,
    cicloClientes,
    contribuicaoAtiva,
    relatorioClientes,
    relatorioVendedores,
    driversVendedores,
    relatorioDeptos,
    relatorioGeografico,
    mudancaMix,
    classeAEmQueda,
  ]);

  async function consultar(proximoPeriodo: Periodo = periodo) {
    try {
      const proximoAnterior = resolverComparacao(
        proximoPeriodo,
        modoComparacao,
        comparacaoPersonalizada,
      );
      await consultarVendas({
        empresaId,
        periodo: proximoPeriodo,
        periodoAnterior: proximoAnterior,
        forcarAtualizacao: true,
      });
      setPeriodoAnterior(proximoAnterior);
      setPeriodoConsultado({ ...proximoPeriodo });
      setModoConsultado(modoComparacao);

      const params = new URLSearchParams(window.location.search);
      params.set("periodoInicial", proximoPeriodo.inicial);
      params.set("periodoFinal", proximoPeriodo.final);
      params.set("comparacao", modoComparacao);
      if (modoComparacao === "personalizado") {
        params.set("comparacaoInicial", comparacaoPersonalizada.inicial);
        params.set("comparacaoFinal", comparacaoPersonalizada.final);
      } else {
        params.delete("comparacaoInicial");
        params.delete("comparacaoFinal");
      }
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}?${params.toString()}`,
      );

      toast.success("Dados de relatórios atualizados com sucesso!");
    } catch (erro) {
      toast.error(
        erro instanceof Error
          ? erro.message
          : "Não foi possível carregar os relatórios.",
      );
    }
  }

  return (
    <ReportContext.Provider
      value={{
        titulo: relatorioAtivo?.label ?? "Relatório",
        preferenceScope: `${userId}:${abaAtiva}`,
        contexto: {
          empresaNome: rotuloEmpresa,
          cnpj: modoConsolidado ? undefined : empresaAtual?.cnpj,
          periodo: periodoConsultado,
          periodoComparacao: periodoAnterior ?? undefined,
          modoComparacao: rotuloModoComparacao(modoConsultado),
        },
      }}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <label className="no-print flex items-center gap-2 text-xs lg:hidden">
          Relatório
          <select
            aria-label="Selecionar relatório"
            value={abaAtiva}
            onChange={(event) =>
              router.push(
                `/relatorios?${new URLSearchParams({
                  aba: event.target.value,
                  empresa: empresaId,
                  periodoInicial: periodoConsultado.inicial,
                  periodoFinal: periodoConsultado.final,
                  comparacao: modoConsultado,
                  ...(modoConsultado === "personalizado"
                    ? {
                        comparacaoInicial: comparacaoPersonalizada.inicial,
                        comparacaoFinal: comparacaoPersonalizada.final,
                      }
                    : {}),
                })}`,
              )
            }
            className="min-w-0 flex-1 rounded-md border bg-background p-2"
          >
            {relatoriosOpcoes.map((opcao) => (
              <option key={opcao.id} value={opcao.id}>
                {opcao.label}
              </option>
            ))}
          </select>
        </label>
        {/* Cabeçalho único: contexto do relatório, período e ações. */}
        <Card className="no-print shadow-xs backdrop-blur-md">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/80 shadow-2xs ${
                    relatorioAtivo?.cor ?? "text-primary"
                  }`}
                >
                  {(() => {
                    const IconeOp = relatorioAtivo?.icone ?? Sparkles;
                    return <IconeOp className="size-4.5" />;
                  })()}
                </div>
                <div className="flex flex-col">
                  <CardTitle className="text-base font-extrabold tracking-tight text-foreground">
                    {relatorioAtivo?.label ?? "Relatório Analítico"}
                  </CardTitle>
                </div>
                {modoConsolidado && (
                  <Badge className="bg-primary/15 text-primary border border-primary/30 text-xs font-bold gap-1 px-2.5 py-0.5">
                    <Building2 className="size-3.5" />
                    <span>
                      Visão Consolidada ({empresasSelecionadas.length} Empresas)
                    </span>
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="no-print h-9 text-xs"
                aria-pressed={visaoFavorita}
                onClick={() => {
                  const proximo = !visaoFavorita;
                  setVisaoFavorita(proximo);
                  if (proximo) localStorage.setItem(favoriteKey, "1");
                  else localStorage.removeItem(favoriteKey);
                  toast.success(proximo ? "Visão adicionada aos favoritos." : "Visão removida dos favoritos.");
                }}
              >
                <Star className={`size-3.5 ${visaoFavorita ? "fill-current text-amber-500" : ""}`} />
                {visaoFavorita ? "Favorita" : "Favoritar visão"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 border-t border-border/40 pt-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
              <section className="min-w-0 flex-1 rounded-lg bg-muted/25 p-2.5" aria-label="Período">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Período</div>
                <DateRangeFilter
                    value={periodo}
                    onChange={setPeriodo}
                    onConsultar={consultar}
                    loading={loading}
                    compact
                    persistirCookie={false}
                  />
              </section>
              <section className="min-w-0 rounded-lg bg-muted/25 p-2.5" aria-label="Comparação">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Comparação</div>
                <ComparacaoPeriodo
                  periodo={periodo}
                  modo={modoComparacao}
                  personalizado={comparacaoPersonalizada}
                  onModo={setModoComparacao}
                  onPersonalizado={setComparacaoPersonalizada}
                  loading={loading}
                />
              </section>
              <Button
                size="sm"
                disabled={loading || !!erroPeriodo(periodo)}
                onClick={() => consultar()}
              >
                {loading ? "Consultando..." : "Consultar"}
              </Button>
            </div>
            {periodo.inicial !== periodoConsultado.inicial ||
            periodo.final !== periodoConsultado.final ||
            modoComparacao !== modoConsultado ||
            (modoComparacao === "personalizado" &&
              (comparacaoPersonalizada.inicial !== periodoAnterior?.inicial ||
                comparacaoPersonalizada.final !== periodoAnterior?.final)) ? (
              <p role="status" className="text-xs text-muted-foreground">
                Alterações pendentes. Clique em Consultar para aplicar.
              </p>
            ) : null}
            {!comparacaoDisponivel && (
              <p
                className="text-xs text-amber-700 dark:text-amber-400"
                role="status"
              >
                Comparativo indisponível; os dados do período atual seguem
                disponíveis.
              </p>
            )}
            {abasComBusca.has(abaAtiva) || abaAtiva === "curva-abc" || abaAtiva === "clientes" ? (
              <DataFilterBar
                busca={busca}
                onBuscaChange={setBusca}
                placeholder="Pesquisar registros desta visão..."
                temFiltrosAtivos={Boolean(busca) || (abaAtiva === "clientes" ? filtroClasseCli : filtroClasseAbc) !== "todas"}
                onLimpar={() => {
                  setBusca("");
                  if (abaAtiva === "clientes") setFiltroClasseCli("todas");
                  if (abaAtiva === "curva-abc") setFiltroClasseAbc("todas");
                }}
              >
                {abaAtiva === "curva-abc" || abaAtiva === "clientes" ? (
                  <FiltroRelatorio
                    rotulo="Classe ABC"
                    valor={abaAtiva === "clientes" ? filtroClasseCli : filtroClasseAbc}
                    onChange={(valor) => abaAtiva === "clientes"
                      ? setFiltroClasseCli(valor as "todas" | "A" | "B" | "C")
                      : setFiltroClasseAbc(valor as "todas" | "A" | "B" | "C")}
                    opcoes={["todas", "A", "B", "C"].map((valor) => ({
                      valor,
                      rotulo: valor === "todas" ? "Todas as classes" : `Classe ${valor}`,
                    }))}
                  />
                ) : null}
              </DataFilterBar>
            ) : null}
            <StatusRelatorio
              itens={[
                {
                  rotulo: "Universo",
                  valor: `${formatarNumero(vendas.length, 0)} item(ns) de venda · ${modoConsolidado ? `${empresasSelecionadas.length} empresas` : rotuloEmpresa}`,
                  definicao: "Itens de venda retornados pela API do Syspro para o período e a empresa consultados.",
                },
                {
                  rotulo: "Período",
                  valor: `${formatarDataInputParaBR(periodoConsultado.inicial)} a ${formatarDataInputParaBR(periodoConsultado.final)}${rotuloPeriodoAnterior ? ` · vs. ${rotuloPeriodoAnterior}` : ""}${consultadoEm ? ` · atualizado às ${consultadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}`,
                  definicao: "Período consultado, janela de comparação equivalente e horário da última consulta.",
                },
                {
                  rotulo: "Filtros ativos",
                  valor: formatarNumero((busca.trim() ? 1 : 0) + ((abaAtiva === "clientes" ? filtroClasseCli : filtroClasseAbc) !== "todas" && (abaAtiva === "clientes" || abaAtiva === "curva-abc") ? 1 : 0), 0),
                  destaque: true,
                  definicao: "Conta a busca textual e o filtro de classe ABC aplicados nesta aba.",
                },
              ]}
            />
          </CardContent>
        </Card>

        {erro ? (
          <FeedbackState
            variant="error"
            title="Não foi possível atualizar os relatórios"
            description={erro}
            onRetry={() => consultar()}
          />
        ) : null}

        {/* Card Principal do Relatório Executivo */}
        <Card className="shadow-2xs">
          <CardContent>
            {loading ? (
              <div className="space-y-3 py-4">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-48 w-full rounded-lg" />
              </div>
            ) : abaAtiva !== "margens" && vendas.length === 0 &&
              !(
                abaAtiva === "clientes" &&
                comparacaoDisponivel &&
                vendasAnteriores.length > 0
              ) ? (
              <FeedbackState
                variant="empty"
                title="Nenhuma venda encontrada"
                description="Ajuste o período ou selecione outra empresa para consultar os relatórios."
                onRetry={() => consultar()}
                retryLabel="Consultar novamente"
              />
            ) : (
              <>
                {/* Panorama do período: variações vs. período anterior (métricas explicadas) */}
                {abaAtiva !== "margens" && variacoesPeriodo && (
                  <PanoramaPeriodo
                    variacoes={variacoesPeriodo}
                    rotuloPeriodoAnterior={rotuloPeriodoAnterior}
                    compacto
                    mostrarClientes={abaAtiva === "clientes"}
                    itensExtra={indicadoresContextuais}
                  />
                )}

                {abaAtiva !== "margens" ? diagnosticoRelatorio : null}

                {modoConsolidado && consolidacaoEmpresas.length > 1 ? (
                  <ConsolidacaoEmpresas
                    empresas={consolidacaoEmpresas}
                    abaAtiva={abaAtiva}
                  />
                ) : null}

                <div className="border-t border-border/60" />

                {/* Renderização condicional da aba ativa através de componentes modulares */}
                {abaAtiva === "curva-abc" && (
                  <AbaCurvaABC
                    relatorioABC={relatorioABC}
                    metrica={metricaCurvaABC}
                    onMetricaChange={setMetricaCurvaABC}
                    itensFiltrados={itensAbcFiltrados}
                    concentracaoTop10={
                      concentracaoProdutosTop20
                        ? concentracaoTopN(
                            relatorioABC.itens.map((item) => ({
                              faturamento: item.valorClassificacao,
                            })),
                            10,
                          )
                        : null
                    }
                    concentracaoTop20={concentracaoProdutosTop20}
                  />
                )}

                {abaAtiva === "clientes" && frequenciaClientes && (
                  <AbaClientes
                    key={`${periodoConsultado.inicial}-${periodoConsultado.final}`}
                    clientesFiltrados={clientesFiltrados}
                    notasAgrupadas={notasAgrupadasRelatorio}
                    notasAnteriores={notasClientesAnteriores}
                    intervaloAnterior={periodoAnterior}
                    frequencia={frequenciaClientes}
                    busca={busca}
                    classe={filtroClasseCli}
                    contexto={{
                      empresaNome: rotuloEmpresa,
                      cnpj: modoConsolidado ? undefined : empresaAtual?.cnpj,
                      periodo: periodoConsultado,
                      periodoComparacao: periodoAnterior ?? undefined,
                      modoComparacao: rotuloModoComparacao(modoConsultado),
                    }}
                    periodoAnterior={rotuloPeriodoAnterior}
                  />
                )}

                {abaAtiva === "margens" && (
                  <AbaMargens
                    empresaId={empresaId}
                    periodo={periodoConsultado}
                    busca={busca}
                    onBuscaChange={setBusca}
                    situacaoInicial={margemInicial}
                  />
                )}

                {abaAtiva === "sazonalidade" && (
                  <AbaSazonalidade
                    relatorioSazonalidade={relatorioSazonalidade}
                    relatorioEvolucao={relatorioEvolucao}
                    periodo={periodoConsultado}
                  />
                )}

                {abaAtiva === "departamentos" && (
                  <AbaDepartamentos
                    deptosFiltrados={deptosFiltrados}
                    deptosAnteriores={deptosAnteriores}
                    comparacaoDisponivel={comparacaoDisponivel}
                    rotuloPeriodoAnterior={rotuloPeriodoAnterior}
                  />
                )}

                {abaAtiva === "vendedores" && (
                  <AbaVendedores
                    vendedoresFiltrados={vendedoresFiltrados}
                    produtosPorVendedor={produtosPorVendedor}
                    notasAgrupadas={notasAgrupadasRelatorio}
                    vendedoresEmQueda={vendedoresEmQueda}
                  />
                )}

                {abaAtiva === "geografico" && (
                  <AbaGeografico
                    cidadesFiltradas={cidadesFiltradas}
                    ufsFiltradas={relatorioUFs.filter(
                      (item) =>
                        !busca.trim() ||
                        item.uf
                          .toLowerCase()
                          .includes(busca.toLowerCase().trim()),
                    )}
                    notasAgrupadas={notasAgrupadasRelatorio}
                    ufsAnteriores={ufsAnteriores}
                    comparacaoDisponivel={comparacaoDisponivel}
                    rotuloPeriodoAnterior={rotuloPeriodoAnterior}
                  />
                )}

                {abaAtiva === "financeiro" && (
                  <AbaFinanceiro relatorioFinanceiro={relatorioFinanceiro} />
                )}

                {/* Ajuda consolidada no final do relatório ativo */}
                {GUIAS_RELATORIOS[abaAtiva] ? (
                  <GlossarioRelatorio
                    itens={GUIAS_RELATORIOS[abaAtiva].glossario ?? []}
                    guia={GUIAS_RELATORIOS[abaAtiva]}
                    relatorioLabel={relatorioAtivo?.label ?? ""}
                  />
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ReportContext.Provider>
  );
}
