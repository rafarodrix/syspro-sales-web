import { dataCompraIso } from "./clientes-frequencia";
import { paraNumero, valorItem, type VendaAgrupada } from "./vendas";

export function produtosDasNotas(notas: VendaAgrupada[], porMes: boolean) {
  const mapa = new Map<
    string,
    {
      cliente: string;
      empresa: string;
      mes: string;
      codigo: string;
      produto: string;
      unidade: string;
      quantidade: number;
      faturamento: number;
      descontos: number;
      notas: Set<string>;
    }
  >();
  for (const nota of notas)
    for (const item of nota.itens) {
      const mes = porMes
        ? (dataCompraIso(nota.emissao)?.slice(0, 7) ?? "Sem data")
        : "";
      const unidade = item.produto_un?.trim() || "—";
      const chave = JSON.stringify([
        nota.empresaId ?? item.empresa_codigo,
        nota.cliente,
        item.produto_id,
        item.produto_descricao,
        unidade,
        mes,
      ]);
      const atual = mapa.get(chave) ?? {
        cliente: nota.cliente,
        empresa: nota.empresaNome ?? item.empresa_codigo,
        mes,
        codigo: item.produto_id,
        produto: item.produto_descricao,
        unidade,
        quantidade: 0,
        faturamento: 0,
        descontos: 0,
        notas: new Set<string>(),
      };
      atual.quantidade += paraNumero(item.produto_qtde);
      atual.faturamento += valorItem(item);
      atual.descontos += paraNumero(item.produto_vlr_desconto);
      atual.notas.add(nota.id);
      mapa.set(chave, atual);
    }
  return [...mapa.entries()]
    .map(([id, { notas, ...item }]) => ({ id, ...item, notas: notas.size }))
    .sort(
      (a, b) =>
        a.mes.localeCompare(b.mes) ||
        b.faturamento - a.faturamento ||
        a.produto.localeCompare(b.produto, "pt-BR"),
    );
}
