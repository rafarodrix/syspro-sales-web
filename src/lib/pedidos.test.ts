import { describe, expect, it } from "vitest";
import {
  SLA_PEDIDO,
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
    horaVenda: "08:04:37.291",
    horaSeparacao: null,
    horaConferido: "08:07:15.158",
    horaSaida: "08:17:13.831",
    horaFechamento: "09:02:35.707",
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
    expect(horaParaMinutos("xx")).toBeNull();
  });

  it("calcula o intervalo entre a venda e cada etapa", () => {
    expect(minutosEntre("08:04:37", "08:07:15")).toBeCloseTo(2.6, 1);
    expect(minutosEntre("08:04:37", "08:17:13")).toBeCloseTo(12.6, 1);
    expect(minutosEntre("08:04:37", "09:02:35")).toBeCloseTo(58, 0);
    // horário ausente ou anterior ao início não gera tempo
    expect(minutosEntre("08:04:37", null)).toBeNull();
    expect(minutosEntre("09:00:00", "08:00:00")).toBeNull();
  });

  it("marca alerta quando a etapa passa do limite", () => {
    const linha = montarLinhaPedido(pedido());
    expect(linha.alertaConferencia.limite).toBe(SLA_PEDIDO.conferenciaMinutos);
    expect(linha.alertaConferencia.estourou).toBe(false);
    expect(linha.alertaSaida.minutos).toBeCloseTo(12.6, 1);
    expect(linha.alertaSaida.estourou).toBe(false);
    expect(linha.alertaFechamento.minutos).toBeGreaterThan(SLA_PEDIDO.fechamentoMinutos);
    expect(linha.alertaFechamento.estourou).toBe(true);
    // sem o horário de separação não há alerta de separação
    expect(linha.alertaSeparacao.minutos).toBeNull();
    expect(linha.alertaSeparacao.estourou).toBe(false);
  });

  it("classifica a situação do pedido pelo status do Syspro", () => {
    expect(situacaoPedido({ status: "FECHADO", status2: "ENTREGUE" })).toBe("entregue");
    expect(situacaoPedido({ status: "ABERTO", status2: "PENDENTE" })).toBe("pendente");
    expect(situacaoPedido({ status: "FECHADO", status2: "EM ENTREGA" })).toBe("em-rota");
    expect(situacaoPedido({ status: "CANCELADO", status2: "DESISTENCIA" })).toBe("cancelado");
    expect(situacaoPedido({ status: "LANCANDO", status2: "SEPARADO" })).toBe("pendente");
    expect(situacaoPedido({ status: "?", status2: "?" })).toBe("outro");
  });

  it("resume contagens e médias do período", () => {
    const linhas = montarLinhasPedido([
      pedido(),
      pedido({ numero: "2", horaConferido: "08:40:00", horaSaida: null, horaFechamento: "08:45:00", status2: "PENDENTE", status: "ABERTO" }),
      pedido({ numero: "3", status: "CANCELADO", status2: "DESISTENCIA", horaConferido: null, horaSaida: null, horaFechamento: null }),
    ]);
    const resumo = resumirPedidos(linhas);
    expect(resumo.total).toBe(3);
    expect(resumo.entregues).toBe(1);
    expect(resumo.pendentes).toBe(1);
    expect(resumo.cancelados).toBe(1);
    // média considera apenas quem tem horário
    expect(resumo.mediaSaida).toBeCloseTo(12.6, 1);
    expect(resumo.foraDaConferencia).toBe(1);
  });

  it("formata duração em minutos para leitura na tela", () => {
    expect(formatarDuracaoMinutos(13.4)).toBe("13.4 min");
    expect(formatarDuracaoMinutos(63)).toBe("1h03");
    expect(formatarDuracaoMinutos(null)).toBe("—");
  });
});
