import { describe, expect, it } from "vitest";
import {
  SLA_ENTREGA,
  formatarDuracaoMinutos,
  horaParaMinutos,
  minutosEntre,
  montarLinhaPedido,
  montarLinhasPedido,
  emLancamento,
  passaFiltroAtendimento,
  passaFiltroLegenda,
  passaFiltroStatus,
  passaFiltroDocumento,
  passaFiltroSituacao,
  fechamentoConfiavel,
  resumirPedidos,
  situacaoPedido,
  tipoDocumento,
  type PedidoSyspro,
} from "@/lib/pedidos";

function pedido(parcial: Partial<PedidoSyspro> = {}): PedidoSyspro {
  return {
    numero: "628099",
    tipoPedido: "PV",
    origem: "BALCAO",
    entrega: true,
    valor: 150,
    cliente: "AUTO MECANICA 4 RODAS",
    dataVenda: "2026-10-27",
    horaVenda: "08:00:00",
    horaSeparacao: null,
    horaConferido: "08:10:00",
    horaSaida: "08:30:00",
    horaFechamento: "09:00:00",
    entregador: "YAGO ARAÚJO ALVES",
    status: "FECHADO",
    status2: "ENTREGUE",
    empresaCodigo: "01",
    ...parcial,
  };
}

describe("análise de entrega", () => {
  it("converte horário do Syspro em minutos", () => {
    expect(horaParaMinutos("08:07:15.158")).toBeCloseTo(487.25, 2);
    expect(horaParaMinutos(null)).toBeNull();
    expect(horaParaMinutos("25:00:00")).toBeNull();
  });

  it("calcula o intervalo entre dois horários do mesmo dia", () => {
    expect(minutosEntre("08:00:00", "08:10:00")).toBe(10);
    expect(minutosEntre("08:10:00", "08:30:00")).toBe(20);
    expect(minutosEntre("08:30:00", null)).toBeNull();
    expect(minutosEntre("09:00:00", "08:00:00")).toBeNull();
  });

  it("mede cada etapa a partir do marco anterior, não da venda", () => {
    const linha = montarLinhaPedido(pedido());
    expect(linha.separacao.minutos).toBe(10); // venda -> separado
    expect(linha.separacao.limite).toBe(SLA_ENTREGA.separacaoMinutos);
    expect(linha.saida.minutos).toBe(20); // separado -> saída
    expect(linha.saida.limite).toBe(SLA_ENTREGA.saidaMinutos);
    expect(linha.fechamento.minutos).toBe(30); // saída -> fechamento
    expect(linha.totalExpedicao.minutos).toBe(30); // venda -> saída
  });

  it("marca estouro apenas na etapa que passou do limite", () => {
    const linha = montarLinhaPedido(
      pedido({ horaConferido: "08:40:00", horaSaida: "08:50:00", horaFechamento: "09:00:00" }),
    );
    expect(linha.separacao.minutos).toBe(40);
    expect(linha.separacao.estourou).toBe(true); // > 15
    expect(linha.saida.minutos).toBe(10);
    expect(linha.saida.estourou).toBe(false);
    expect(linha.fechamento.minutos).toBe(10);
    expect(linha.fechamento.estourou).toBe(false);
  });

  it("marca etapa em andamento e mede até agora", () => {
    const linha = montarLinhaPedido(
      pedido({ horaConferido: "08:10:00", horaSaida: null, horaFechamento: null }),
      { hoje: "2026-10-27", agoraMinutos: 9 * 60 + 20 },
    );
    expect(linha.saida.emAndamento).toBe(true);
    expect(linha.saida.minutos).toBe(70); // 08:10 -> 09:20
    expect(linha.saida.estourou).toBe(true);
  });

  it("não mede em andamento de pedido de outro dia", () => {
    const linha = montarLinhaPedido(
      pedido({ horaSaida: null, horaFechamento: null }),
      { hoje: "2026-11-06", agoraMinutos: 10 * 60 },
    );
    expect(linha.saida.emAndamento).toBe(false);
    expect(linha.saida.minutos).toBeNull();
  });

  it("classifica a situação e o filtro padrão exclui entregues e cancelados", () => {
    expect(situacaoPedido({ status: "FECHADO", status2: "ENTREGUE" })).toBe("entregue");
    expect(situacaoPedido({ status: "ABERTO", status2: "PENDENTE" })).toBe("pendente");
    expect(situacaoPedido({ status: "FECHADO", status2: "EM ENTREGA" })).toBe("em-rota");
    expect(situacaoPedido({ status: "CANCELADO", status2: "DESISTENCIA" })).toBe("cancelado");

    const entregue = { status: "FECHADO", status2: "ENTREGUE" };
    const pendente = { status: "ABERTO", status2: "PENDENTE" };
    const cancelado = { status: "CANCELADO", status2: "DESISTENCIA" };
    expect(passaFiltroSituacao(entregue, "em-aberto")).toBe(false);
    expect(passaFiltroSituacao(cancelado, "em-aberto")).toBe(false);
    expect(passaFiltroSituacao(pendente, "em-aberto")).toBe(true);
    expect(passaFiltroSituacao(entregue, "todas")).toBe(true);
    expect(passaFiltroSituacao(entregue, "entregue")).toBe(true);
  });

  it("resume médias, prazos, atrasados e desempenho por entregador", () => {
    const linhas = montarLinhasPedido([
      pedido(),
      pedido({
        numero: "2",
        horaConferido: "08:40:00",
        horaSaida: null,
        horaFechamento: null,
        status2: "PENDENTE",
        status: "ABERTO",
      }),
      pedido({
        numero: "3",
        status: "CANCELADO",
        status2: "DESISTENCIA",
        horaConferido: null,
        horaSaida: null,
        horaFechamento: null,
        entregador: "ILTOMAR FERREIRA",
      }),
    ]);
    const resumo = resumirPedidos(linhas);
    expect(resumo.total).toBe(3);
    expect(resumo.entregues).toBe(1);
    expect(resumo.pendentes).toBe(1);
    expect(resumo.cancelados).toBe(1);
    // separação: 10 e 40 min -> média 25, um fora do limite
    expect(resumo.separacao.media).toBeCloseTo(25, 5);
    expect(resumo.separacao.fora).toBe(1);
    expect(resumo.separacao.percentualNoPrazo).toBeCloseTo(50, 5);
    // atrasados consideram só pedidos em aberto
    expect(resumo.atrasados).toBe(1);
    expect(resumo.maiorEsperaMinutos).toBe(30);
    expect(resumo.porEntregador[0]).toMatchObject({ entregador: "YAGO ARAÚJO ALVES", davs: 2 });
  });

  it("distingue pedido de venda de orçamento pelo TP_PEDIDO", () => {
    expect(tipoDocumento({ tipoPedido: "PV", origem: "BALCAO" })).toBe("pedido");
    expect(tipoDocumento({ tipoPedido: "DAV-OR", origem: "ORCAMENTO" })).toBe("orcamento");
    expect(tipoDocumento({ tipoPedido: "DAV-OR", origem: "BALCAO" })).toBe("orcamento");
    // pedido que veio de orçamento continua sendo pedido
    expect(tipoDocumento({ tipoPedido: "PV", origem: "ORCAMENTO" })).toBe("pedido");
    expect(tipoDocumento({ tipoPedido: "", origem: "ORCAMENTO" })).toBe("orcamento");
    expect(tipoDocumento({ tipoPedido: "XX", origem: "BALCAO" })).toBe("outro");

    const orcamento = { tipoPedido: "DAV-OR", origem: "ORCAMENTO" };
    const venda = { tipoPedido: "PV", origem: "BALCAO" };
    expect(passaFiltroDocumento(orcamento, "pedido")).toBe(false);
    expect(passaFiltroDocumento(venda, "pedido")).toBe(true);
    expect(passaFiltroDocumento(orcamento, "orcamento")).toBe(true);
    expect(passaFiltroDocumento(orcamento, "todos")).toBe(true);
  });

  it("trata número 0 como lançamento", () => {
    expect(emLancamento({ numero: "0" })).toBe(true);
    expect(emLancamento({ numero: "" })).toBe(true);
    expect(emLancamento({ numero: "630517" })).toBe(false);
  });

  it("filtra por status (aberto = nem cancelado nem fechado) e por legenda", () => {
    const aberto = { status: "ABERTO", status2: "PENDENTE" };
    const fechado = { status: "FECHADO", status2: "ENTREGUE" };
    const cancelado = { status: "CANCELADO", status2: "DESISTENCIA" };
    expect(passaFiltroStatus(aberto, "aberto")).toBe(true);
    expect(passaFiltroStatus(fechado, "aberto")).toBe(false);
    expect(passaFiltroStatus(cancelado, "aberto")).toBe(false);
    expect(passaFiltroStatus(fechado, "fechado")).toBe(true);
    expect(passaFiltroStatus(cancelado, "cancelado")).toBe(true);
    expect(passaFiltroStatus(cancelado, "todos")).toBe(true);

    expect(passaFiltroLegenda(fechado, "todas")).toBe(true);
    expect(passaFiltroLegenda(fechado, "ENTREGUE")).toBe(true);
    expect(passaFiltroLegenda(fechado, "PENDENTE")).toBe(false);
  });

  it("separa entrega de balcão pelo campo ENTREGA", () => {
    expect(passaFiltroAtendimento({ entrega: true }, "entrega")).toBe(true);
    expect(passaFiltroAtendimento({ entrega: true }, "balcao")).toBe(false);
    expect(passaFiltroAtendimento({ entrega: false }, "balcao")).toBe(true);
    expect(passaFiltroAtendimento({ entrega: false }, "todos")).toBe(true);
  });

  it("mede viagem perdida e registro incompleto", () => {
    const linhas = montarLinhasPedido([
      // saiu e desistiu -> viagem perdida
      pedido({ numero: "1", status: "FECHADO", status2: "DESISTENCIA", valor: 200 }),
      // entregue com saída -> normal
      pedido({ numero: "2", valor: 100 }),
      // entregue sem saída -> registro incompleto
      pedido({ numero: "3", horaSaida: null, valor: 50 }),
      // em aberto de entrega -> valor em jogo
      pedido({ numero: "4", status: "ABERTO", status2: "PENDENTE", horaConferido: null, horaSaida: null, horaFechamento: null, valor: 80 }),
    ]);
    const r = resumirPedidos(linhas);
    expect(r.desistenciasComSaida).toBe(1);
    expect(r.valorPerdido).toBe(200);
    expect(r.entreguesSemSaida).toBe(1);
    expect(r.entregasEmAberto).toBe(1);
    expect(r.valorEmAberto).toBe(80);
    expect(r.taxaDesistencia).toBeCloseTo(50, 5); // 1 de 2 que saíram
  });

  it("ignora fechamento igual à venda (padrão do Syspro em pedido aberto)", () => {
    expect(fechamentoConfiavel("08:00:00", "08:00:00")).toBeNull();
    expect(fechamentoConfiavel("08:00:00", "09:00:00")).toBe("09:00:00");
    expect(fechamentoConfiavel("08:00:00", null)).toBeNull();
  });

  it("formata duração em minutos para leitura na tela", () => {
    expect(formatarDuracaoMinutos(13.4)).toBe("13.4 min");
    expect(formatarDuracaoMinutos(63)).toBe("1h03");
    expect(formatarDuracaoMinutos(null)).toBe("—");
  });
});
