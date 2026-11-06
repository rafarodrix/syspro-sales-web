import { describe, expect, it } from "vitest";
import {
  SLA_ENTREGA,
  formatarDuracaoMinutos,
  horaParaMinutos,
  minutosEntre,
  montarLinhaPedido,
  montarLinhasPedido,
  resumirPedidos,
  situacaoPedido,
  type PedidoSyspro,
} from "@/lib/pedidos";

function pedido(parcial: Partial<PedidoSyspro> = {}): PedidoSyspro {
  return {
    numero: "628099",
    cliente: "AUTO MECANICA 4 RODAS",
    dataVenda: "2026-10-27",
    horaVenda: "08:00:00",
    horaSeparacao: null,
    horaConferido: "08:16:00",
    horaSaida: "08:35:00",
    horaFechamento: "09:00:00",
    entregador: "YAGO ARAÚJO ALVES",
    status: "FECHADO",
    status2: "ENTREGUE",
    empresaCodigo: "01",
    ...parcial,
  };
}

describe("pedidos e entregas", () => {
  it("converte horário do Syspro em minutos", () => {
    expect(horaParaMinutos("08:07:15.158")).toBeCloseTo(487.25, 2);
    expect(horaParaMinutos("00:00:00")).toBe(0);
    expect(horaParaMinutos(null)).toBeNull();
    expect(horaParaMinutos("25:00:00")).toBeNull();
  });

  it("calcula o intervalo entre dois horários do mesmo dia", () => {
    expect(minutosEntre("08:00:00", "08:04:00")).toBe(4);
    expect(minutosEntre("08:16:00", "08:35:00")).toBe(19);
    expect(minutosEntre("08:35:00", null)).toBeNull();
    expect(minutosEntre("09:00:00", "08:00:00")).toBeNull();
  });

  it("mede cada etapa separadamente, não o acumulado da venda", () => {
    // exemplo do Rafael: 08:00 venda, 08:04 separação, 08:16 conferido, 08:35 saída
    const linha = montarLinhaPedido(
      pedido({ horaSeparacao: "08:04:00", horaConferido: "08:16:00", horaSaida: "08:35:00" }),
    );
    expect(linha.separacao.minutos).toBe(4);
    expect(linha.separacao.limite).toBe(SLA_ENTREGA.separacaoMinutos);
    expect(linha.separacao.estourou).toBe(false);
    expect(linha.conferencia.minutos).toBe(12);
    expect(linha.conferencia.baseAlternativa).toBe(false);
    expect(linha.saida.minutos).toBe(19);
    expect(linha.saida.estourou).toBe(false);
    expect(linha.fechamento.minutos).toBe(25);
    // total da venda até a saída (J - D)
    expect(linha.totalExpedicao.minutos).toBe(35);
  });

  it("usa a venda como início da conferência quando o Syspro não registra a separação", () => {
    const linha = montarLinhaPedido(pedido({ horaSeparacao: null, horaConferido: "08:16:00" }));
    expect(linha.separacao.minutos).toBeNull();
    expect(linha.conferencia.minutos).toBe(16); // 08:00 -> 08:16
    expect(linha.conferencia.baseAlternativa).toBe(true);
    expect(linha.conferencia.estourou).toBe(true); // passou dos 15 min
  });

  it("marca etapa em andamento e mede até agora", () => {
    const linha = montarLinhaPedido(
      pedido({ horaConferido: "08:16:00", horaSaida: null, horaFechamento: null }),
      { hoje: "2026-10-27", agoraMinutos: 9 * 60 + 20 },
    );
    expect(linha.saida.emAndamento).toBe(true);
    expect(linha.saida.minutos).toBe(64); // 08:16 -> 09:20
    expect(linha.saida.estourou).toBe(true);
  });

  it("não mede em andamento de pedido de outro dia", () => {
    const linha = montarLinhaPedido(
      pedido({ horaConferido: "08:16:00", horaSaida: null, horaFechamento: null }),
      { hoje: "2026-11-06", agoraMinutos: 10 * 60 },
    );
    expect(linha.saida.emAndamento).toBe(false);
    expect(linha.saida.minutos).toBeNull();
  });

  it("classifica a situação do pedido pelo status do Syspro", () => {
    expect(situacaoPedido({ status: "FECHADO", status2: "ENTREGUE" })).toBe("entregue");
    expect(situacaoPedido({ status: "ABERTO", status2: "PENDENTE" })).toBe("pendente");
    expect(situacaoPedido({ status: "FECHADO", status2: "EM ENTREGA" })).toBe("em-rota");
    expect(situacaoPedido({ status: "CANCELADO", status2: "DESISTENCIA" })).toBe("cancelado");
    expect(situacaoPedido({ status: "?", status2: "?" })).toBe("outro");
  });

  it("resume médias, prazos por etapa e desempenho por entregador", () => {
    const linhas = montarLinhasPedido([
      pedido(),
      pedido({ numero: "2", horaConferido: "08:40:00", horaSaida: null, status2: "PENDENTE", status: "ABERTO", entregador: "YAGO ARAÚJO ALVES" }),
      pedido({ numero: "3", status: "CANCELADO", status2: "DESISTENCIA", horaConferido: null, horaSaida: null, horaFechamento: null, entregador: "ILTOMAR FERREIRA" }),
    ]);
    const resumo = resumirPedidos(linhas);
    expect(resumo.total).toBe(3);
    expect(resumo.entregues).toBe(1);
    expect(resumo.pendentes).toBe(1);
    expect(resumo.cancelados).toBe(1);
    // conferência: 16, 40 e 24 min (dois medidos... 16, 40 e null)
    expect(resumo.conferencia.media).toBeCloseTo(28, 1);
    // 16 min e 40 min: os dois estouraram o limite de 15
    expect(resumo.conferencia.fora).toBe(2);
    expect(resumo.conferencia.percentualNoPrazo).toBe(0);
    expect(resumo.porEntregador[0]).toMatchObject({ entregador: "YAGO ARAÚJO ALVES", davs: 2 });
  });

  it("formata duração em minutos para leitura na tela", () => {
    expect(formatarDuracaoMinutos(13.4)).toBe("13.4 min");
    expect(formatarDuracaoMinutos(63)).toBe("1h03");
    expect(formatarDuracaoMinutos(null)).toBe("—");
  });
});
