import type { VendaProduto } from "@/lib/syspro-api";
import {
  analiseContribuicaoVariacao,
  analiseDescontoSemRetorno,
  analiseDriversVendedores,
  classeAPerdendoParticipacao,
  mudancaMixTopProdutos,
  produtosMaisVendidos,
  resumirMargens,
} from "@/lib/vendas";

export type NivelAlertaGerencial = "atencao" | "informativo";

export interface AlertaGerencial {
  id: string;
  titulo: string;
  detalhe: string;
  nivel: NivelAlertaGerencial;
  relatorio: "clientes" | "vendedores" | "curva-abc";
}

export function gerarAlertasGerenciais(
  vendasAtuais: VendaProduto[],
  vendasAnteriores: VendaProduto[],
): AlertaGerencial[] {
  const alertas: AlertaGerencial[] = [];

  const resumo = resumirMargens(vendasAtuais);
  if (vendasAtuais.length && resumo.coberturaCusto < 100) {
    alertas.push({
      id: "custo-incompleto",
      titulo: "Cobertura de custo incompleta",
      detalhe: `${resumo.coberturaCusto.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do faturamento possui custo de reposição informado.`,
      nivel: "atencao",
      relatorio: "vendedores",
    });
  }

  const produtos = produtosMaisVendidos(
    vendasAtuais,
    Number.MAX_SAFE_INTEGER,
    "faturamento",
  );
  const negativos = produtos.filter(
    (item) => item.coberturaCusto > 0 && item.lucroBruto < 0,
  );
  if (negativos.length) {
    const prejuizo = negativos.reduce((total, item) => total + item.lucroBruto, 0);
    alertas.push({
      id: "produtos-margem-negativa",
      titulo: `${negativos.length} produto${negativos.length === 1 ? "" : "s"} com margem negativa`,
      detalhe: `Prejuízo bruto coberto de ${Math.abs(prejuizo).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
      nivel: "atencao",
      relatorio: "curva-abc",
    });
  }

  const faturamentoMedio = produtos.length
    ? produtos.reduce((total, item) => total + item.faturamento, 0) / produtos.length
    : 0;
  const altoVolumeBaixaMargem = produtos.filter(
    (item) => item.faturamento >= faturamentoMedio && item.coberturaCusto >= 90 && item.margemBruta < 10,
  );
  if (altoVolumeBaixaMargem.length) {
    alertas.push({
      id: "alto-volume-baixa-margem",
      titulo: `${altoVolumeBaixaMargem.length} produto${altoVolumeBaixaMargem.length === 1 ? "" : "s"} de alto volume com margem abaixo de 10%`,
      detalhe: `Maior faturamento no grupo: ${altoVolumeBaixaMargem[0].produto}.`,
      nivel: "atencao",
      relatorio: "curva-abc",
    });
  }

  if (!vendasAnteriores.length) return alertas;

  const clientes = analiseContribuicaoVariacao(
    vendasAtuais,
    vendasAnteriores,
    "cliente",
    3,
  );
  if (clientes.queda.length) {
    const impacto = clientes.queda.reduce(
      (total, item) => total + item.diferenca,
      0,
    );
    alertas.push({
      id: "clientes-queda",
      titulo: `${clientes.queda.length} cliente${clientes.queda.length === 1 ? "" : "s"} entre os maiores impactos negativos`,
      detalhe: `Contribuição conjunta de ${impacto.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })} na variação de receita.`,
      nivel: "atencao",
      relatorio: "clientes",
    });
  }

  const descontos = analiseDescontoSemRetorno(
    vendasAtuais,
    vendasAnteriores,
    5,
  );
  if (descontos.length) {
    alertas.push({
      id: "desconto-sem-retorno",
      titulo: `${descontos.length} vendedor${descontos.length === 1 ? "" : "es"} com desconto maior sem crescimento de receita`,
      detalhe: `Maior sinal: ${descontos[0].vendedor}, +${descontos[0].aumentoPp.toLocaleString(
        "pt-BR",
        { maximumFractionDigits: 1 },
      )} p.p. de desconto.`,
      nivel: "atencao",
      relatorio: "vendedores",
    });
  }

  const drivers = analiseDriversVendedores(vendasAtuais, vendasAnteriores);
  const ticketEmQueda = drivers.filter((item) => item.ticketEmQueda);
  if (ticketEmQueda.length) {
    alertas.push({
      id: "ticket-em-queda",
      titulo: `${ticketEmQueda.length} vendedor${ticketEmQueda.length === 1 ? "" : "es"} crescendo com ticket em queda`,
      detalhe: `Maior crescimento: ${ticketEmQueda[0].vendedor}.`,
      nivel: "informativo",
      relatorio: "vendedores",
    });
  }

  const classeA = classeAPerdendoParticipacao(
    vendasAtuais,
    vendasAnteriores,
    5,
  );
  if (classeA.length) {
    alertas.push({
      id: "classe-a-perda",
      titulo: `${classeA.length} produto${classeA.length === 1 ? "" : "s"} Classe A perdendo participação`,
      detalhe: `Maior perda: ${classeA[0].produto}, ${classeA[0].diferencaPp.toLocaleString(
        "pt-BR",
        { maximumFractionDigits: 1 },
      )} p.p.`,
      nivel: "atencao",
      relatorio: "curva-abc",
    });
  }

  const mix = mudancaMixTopProdutos(vendasAtuais, vendasAnteriores, 10);
  if (mix.itensNovosNoTop > 0) {
    alertas.push({
      id: "renovacao-mix",
      titulo: `Top 10 teve ${mix.renovacaoPercentual.toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
      })}% de renovação`,
      detalhe: `${mix.itensNovosNoTop} produto${mix.itensNovosNoTop === 1 ? "" : "s"} entrou${mix.itensNovosNoTop === 1 ? "" : "aram"} no Top 10.`,
      nivel: "informativo",
      relatorio: "curva-abc",
    });
  }

  return alertas;
}
