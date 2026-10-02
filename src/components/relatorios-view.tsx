"use client";

import { useState, useMemo } from "react";
import { ReportContext } from "./relatorios/report-context";
import { useRouter } from "next/navigation";
import { ReportToolbar, ReportFilters } from "./relatorios/report-toolbar";
import { FiltroRelatorio } from "./relatorios/filtro-relatorio";
import { erroPeriodo } from "@/lib/periodo";
import { REPORT_DEFINITIONS } from "./relatorios/report-definitions";
import {
  Search,
  X,
  Sparkles,
  Building2,
  Users,
  Percent,
  Layers,
  MapPin,
  CreditCard,
  CalendarDays,
} from "lucide-react";
import type { VendaProduto, VendaComEmpresa } from "@/lib/syspro-api";
import {
  calcularCurvaABC,
  analiseDepartamentos,
  analiseVendedores,
  analiseClientes,
  analiseDescontos,
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
  maioresCrescimentosProdutos,
  analiseClientesNovosRecorrentes,
  analiseContribuicaoVariacao,
  analiseDescontoSemRetorno,
  analiseDriversVendedores,
  classeAPerdendoParticipacao,
  mudancaMixTopProdutos,
  formatarDataInputParaBR,
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
import { toast } from "sonner";
import { resolverEmpresaSelecionada } from "@/lib/empresa-selecao";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricaCard } from "@/components/metrica-card";
import {
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
} from "@/lib/formatters";

// Subcomponentes modulares de abas
import { AbaCurvaABC, ResumoCurvaAbcCard } from "./relatorios/aba-curva-abc";
import { AbaClientes } from "./relatorios/aba-clientes";
import { AbaDescontos } from "./relatorios/aba-descontos";
import { AbaSazonalidade } from "./relatorios/aba-sazonalidade";
import { AbaDepartamentos } from "./relatorios/aba-departamentos";
import { AbaVendedores } from "./relatorios/aba-vendedores";
import { AbaGeografico } from "./relatorios/aba-geografico";
import { AbaFinanceiro } from "./relatorios/aba-financeiro";
import { PanoramaPeriodo } from "./relatorios/panorama-periodo";
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

  // Produtos em alta vs. período anterior (comparáveis nos dois períodos)
  const produtosEmAlta = useMemo(
    () =>
      comparacaoDisponivel
        ? maioresCrescimentosProdutos(vendas, vendasAnteriores, 5)
        : [],
    [vendas, vendasAnteriores, comparacaoDisponivel],
  );

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

  const alertasDesconto = useMemo(
    () =>
      abaAtiva === "descontos" && comparacaoDisponivel
        ? analiseDescontoSemRetorno(vendas, vendasAnteriores)
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
  const [busca, setBusca] = useState("");
  const [filtroClasseAbc, setFiltroClasseAbc] = useState<
    "todas" | "A" | "B" | "C"
  >("todas");
  const [filtroClasseCli, setFiltroClasseCli] = useState<
    "todas" | "A" | "B" | "C"
  >("todas");

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
        faturamentoTotal: 0,
        totalItens: 0,
        resumoA: {
          faturamento: 0,
          itens: 0,
          percentualFaturamento: 0,
          percentualItens: 0,
        },
        resumoB: {
          faturamento: 0,
          itens: 0,
          percentualFaturamento: 0,
          percentualItens: 0,
        },
        resumoC: {
          faturamento: 0,
          itens: 0,
          percentualFaturamento: 0,
          percentualItens: 0,
        },
      };
    }
    return calcularCurvaABC(vendas);
  }, [vendas, abaAtiva]);

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
            vendasAnteriores,
            periodoConsultado,
            periodoAnterior,
            comparacaoDisponivel,
          )
        : null,
    [
      abaAtiva,
      vendasClientes,
      vendasAnteriores,
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
            relatorioABC.itens.map((item) => ({ faturamento: item.total })),
            20,
          )
        : null,
    [abaAtiva, relatorioABC],
  );

  const relatorioDescontos = useMemo(() => {
    if (abaAtiva !== "descontos") {
      return {
        porVendedor: [],
        porDepartamento: [],
        porFormaPagamento: [],
      };
    }
    return analiseDescontos(vendas);
  }, [vendas, abaAtiva]);

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
          item.id.toLowerCase().includes(termo) ||
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

  const metricaContextual = useMemo(() => {
    if (abaAtiva === "curva-abc") {
      return <ResumoCurvaAbcCard relatorioABC={relatorioABC} />;
    }

    if (abaAtiva === "clientes") {
      return null;
    }

    if (abaAtiva === "vendedores") {
      const ativos = relatorioVendedores.filter((item) => item.faturamento > 0).length;
      return (
        <MetricaCard
          rotulo="Vendedores ativos"
          definicao="Quantidade de vendedores com faturamento no período consultado."
          valor={formatarNumero(ativos, 0)}
          icone={Users}
        />
      );
    }

    if (abaAtiva === "departamentos") {
      const ativos = relatorioDeptos.filter((item) => item.faturamento > 0).length;
      return (
        <MetricaCard
          rotulo="Departamentos ativos"
          definicao="Quantidade de departamentos com faturamento no período consultado."
          valor={formatarNumero(ativos, 0)}
          icone={Layers}
        />
      );
    }

    if (abaAtiva === "descontos") {
      const itens = relatorioDescontos.porVendedor;
      const faturamentoLiquido = itens.reduce(
        (total, item) => total + item.faturamentoLiquido,
        0,
      );
      const descontos = itens.reduce((total, item) => total + item.desconto, 0);
      const bruto = faturamentoLiquido + descontos;
      const taxa = bruto > 0 ? (descontos / bruto) * 100 : 0;
      return (
        <MetricaCard
          rotulo="Taxa média de desconto"
          definicao="Desconto total dividido pelo faturamento bruto estimado do período."
          valor={formatarPercentual(taxa, 1)}
          rodape={descontos > 0 ? formatarMoeda(descontos) : undefined}
          icone={Percent}
        />
      );
    }

    if (abaAtiva === "geografico") {
      const cidades = relatorioGeografico.filter((item) => item.faturamento > 0).length;
      const ufs = relatorioUFs.filter((item) => item.faturamento > 0).length;
      return (
        <MetricaCard
          rotulo="Cobertura geográfica"
          definicao="Quantidade de cidades e UFs com vendas no período consultado."
          valor={formatarNumero(cidades, 0)}
          rodape={`${formatarNumero(ufs, 0)} UFs atendidas`}
          icone={MapPin}
        />
      );
    }

    if (abaAtiva === "financeiro") {
      const principal = relatorioFinanceiro.formasPagamento[0];
      return (
        <MetricaCard
          rotulo="Forma predominante"
          definicao="Forma de pagamento com maior faturamento no período consultado."
          valor={principal?.nome ?? "—"}
          rodape={
            principal ? formatarPercentual(principal.percentual, 1) : undefined
          }
          icone={CreditCard}
        />
      );
    }

    if (abaAtiva === "sazonalidade") {
      const melhorDia = [...relatorioSazonalidade.porDiaSemana].sort(
        (a, b) =>
          b.faturamentoMedioPorOcorrencia -
          a.faturamentoMedioPorOcorrencia,
      )[0];
      return (
        <MetricaCard
          rotulo="Melhor dia"
          definicao="Dia da semana com maior faturamento médio por ocorrência no calendário consultado."
          valor={melhorDia?.dia ?? "—"}
          rodape={
            melhorDia
              ? `${formatarMoeda(
                  melhorDia.faturamentoMedioPorOcorrencia,
                )} por ocorrência`
              : undefined
          }
          icone={CalendarDays}
        />
      );
    }

    return null;
  }, [
    abaAtiva,
    relatorioABC,
    relatorioVendedores,
    driversVendedores,
    relatorioDeptos,
    relatorioDescontos,
    relatorioGeografico,
    relatorioUFs,
    relatorioFinanceiro,
    relatorioSazonalidade,
  ]);

  const diagnosticoRelatorio = useMemo(() => {
    if (abaAtiva === "clientes") {
      const top5 = concentracaoTopN(relatorioClientes.itens, 5);
      const top10 = concentracaoTopN(relatorioClientes.itens, 10);
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
            {
              label: "Crescimento por volume",
              value: formatarNumero(porVolume, 0),
              detail: "Receita cresceu com mais pedidos e sem alta de ticket",
            },
            {
              label: "Crescimento por ticket",
              value: formatarNumero(porTicket, 0),
              detail: "Receita cresceu com ticket maior e sem alta de pedidos",
            },
            {
              label: "Receita ↑ com ticket ↓",
              value: formatarNumero(ticketEmQueda.length, 0),
              detail: ticketEmQueda[0]
                ? ticketEmQueda[0].vendedor
                : "Nenhum vendedor sinalizado",
              attention: ticketEmQueda.length > 0,
            },
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

    if (abaAtiva === "curva-abc") {
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

    if (abaAtiva === "descontos" && comparacaoDisponivel) {
      const principal = alertasDesconto[0];
      return (
        <ReportDiagnostics
          titulo="Eficiência do desconto"
          metricas={[
            {
              label: "Desconto maior sem crescimento",
              value: formatarNumero(alertasDesconto.length, 0),
              detail: principal
                ? `${principal.vendedor}: +${formatarNumero(
                    principal.aumentoPp,
                    1,
                  )} p.p. de desconto e ${formatarMoeda(
                    principal.variacaoFaturamento,
                  )} de receita`
                : "Nenhum vendedor sinalizado",
              attention: alertasDesconto.length > 0,
            },
          ]}
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
    relatorioDeptos,
    relatorioGeografico,
    mudancaMix,
    classeAEmQueda,
    alertasDesconto,
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
        <Card className="no-print border-border/60 shadow-sm backdrop-blur-md">
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
                  <CardDescription className="text-xs">
                    {formatarDataInputParaBR(periodoConsultado.inicial)} a{" "}
                    {formatarDataInputParaBR(periodoConsultado.final)}
                    {rotuloPeriodoAnterior
                      ? ` · vs. ${rotuloPeriodoAnterior}`
                      : ""}
                  </CardDescription>
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
            </div>
          </CardHeader>
          <CardContent className="space-y-3 border-t border-border/60 pt-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
              <section className="min-w-0 flex-1 rounded-md border p-2.5" aria-label="Período">
                <div className="mb-2 text-xs font-semibold">Período</div>
                <DateRangeFilter
                    value={periodo}
                    onChange={setPeriodo}
                    onConsultar={consultar}
                    loading={loading}
                    compact
                    persistirCookie={false}
                  />
              </section>
              <section className="min-w-0 rounded-md border p-2.5" aria-label="Comparação">
                <div className="mb-2 text-xs font-semibold">Comparação</div>
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
            <ReportToolbar>
              {abasComBusca.has(abaAtiva) && (
                <div className="relative min-w-[170px] sm:min-w-[210px]">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    aria-label="Buscar registros da análise"
                    placeholder="Pesquisar registros..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="h-8 w-full rounded-md border bg-background pl-8 pr-7 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                  {busca && (
                    <button
                      onClick={() => setBusca("")}
                      aria-label="Limpar busca"
                      className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              )}

              {abaAtiva === "curva-abc" || abaAtiva === "clientes" ? (
                <>
                  <ReportFilters
                    count={
                      (abaAtiva === "clientes"
                        ? filtroClasseCli
                        : filtroClasseAbc) === "todas"
                        ? 0
                        : 1
                    }
                    onClear={() =>
                      abaAtiva === "clientes"
                        ? setFiltroClasseCli("todas")
                        : setFiltroClasseAbc("todas")
                    }
                  >
                    <FiltroRelatorio
                      rotulo="Classe ABC"
                      valor={
                        abaAtiva === "clientes"
                          ? filtroClasseCli
                          : filtroClasseAbc
                      }
                      onChange={(valor) =>
                        abaAtiva === "clientes"
                          ? setFiltroClasseCli(
                              valor as "todas" | "A" | "B" | "C",
                            )
                          : setFiltroClasseAbc(
                              valor as "todas" | "A" | "B" | "C",
                            )
                      }
                      opcoes={["todas", "A", "B", "C"].map((valor) => ({
                        valor,
                        rotulo:
                          valor === "todas"
                            ? "Todas as classes"
                            : `Classe ${valor}`,
                      }))}
                    />
                  </ReportFilters>
                  {(abaAtiva === "clientes"
                    ? filtroClasseCli
                    : filtroClasseAbc) !== "todas" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      aria-label="Remover filtro de classe"
                      onClick={() =>
                        abaAtiva === "clientes"
                          ? setFiltroClasseCli("todas")
                          : setFiltroClasseAbc("todas")
                      }
                    >
                      Classe{" "}
                      {abaAtiva === "clientes"
                        ? filtroClasseCli
                        : filtroClasseAbc}{" "}
                      ×
                    </Button>
                  ) : null}
                </>
              ) : null}
            </ReportToolbar>
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
        <Card className="border-border/60 shadow-sm">
          <CardContent>
            {loading ? (
              <div className="space-y-3 py-4">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-48 w-full rounded-lg" />
              </div>
            ) : vendas.length === 0 &&
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
                {variacoesPeriodo && (
                  <PanoramaPeriodo
                    variacoes={variacoesPeriodo}
                    rotuloPeriodoAnterior={rotuloPeriodoAnterior}
                    compacto
                    mostrarClientes={abaAtiva === "clientes"}
                    metricaExtra={metricaContextual}
                  />
                )}

                {diagnosticoRelatorio}

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
                    itensFiltrados={itensAbcFiltrados}
                    concentracaoTop10={
                      concentracaoProdutosTop20
                        ? concentracaoTopN(
                            relatorioABC.itens.map((item) => ({
                              faturamento: item.total,
                            })),
                            10,
                          )
                        : null
                    }
                    concentracaoTop20={concentracaoProdutosTop20}
                    produtosEmAlta={produtosEmAlta}
                    temPeriodoAnterior={comparacaoDisponivel}
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

                {abaAtiva === "descontos" && (
                  <AbaDescontos relatorioDescontos={relatorioDescontos} />
                )}

                {abaAtiva === "sazonalidade" && (
                  <AbaSazonalidade
                    relatorioSazonalidade={relatorioSazonalidade}
                    relatorioEvolucao={relatorioEvolucao}
                    periodo={periodoConsultado}
                  />
                )}

                {abaAtiva === "departamentos" && (
                  <AbaDepartamentos deptosFiltrados={deptosFiltrados} />
                )}

                {abaAtiva === "vendedores" && (
                  <AbaVendedores
                    vendedoresFiltrados={vendedoresFiltrados}
                    produtosPorVendedor={produtosPorVendedor}
                    notasAgrupadas={notasAgrupadasRelatorio}
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
