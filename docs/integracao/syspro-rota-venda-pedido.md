# Rota API — Pedidos de venda (DAV)

Solicitação de nova rota de exportação no SysproServer, para alimentar o acompanhamento
operacional de separação/entrega no SysproERP Reports.

## Por que

Hoje o relatório de entrega lê as tabelas `PEDIDO`, `ENTREGA` e `PARTICIPANTE` pela rota
`/api/dynamic/query` (SQL livre), porque a rota oficial `venda/pedidos` **não devolve**
o horário de separação (`HR_SEPARADO`), o de fechamento (`HR_FECHAMENTO`) nem o separador.

Com a rota dedicada, o produto deixa de depender de SQL livre e passa a usar contrato estável.

## Requisição proposta

```
GET /api/exporta/venda/pedido?dt_inicial=DD/MM/AAAA&dt_final=DD/MM/AAAA[&empresa_codigo=XX]
Authorization: Bearer <token>
Accept: application/json
```

- Período por `PEDIDO.DT_VENDA` (data da venda), inclusivo nas duas pontas.
- `empresa_codigo` opcional; quando ausente, devolve todas as empresas do servidor.
- Resposta em JSON, uma entrada por pedido.

## Campos no retorno

| Campo | Origem | Descrição | Obrigatório |
| --- | --- | --- | --- |
| `numero` | `PEDIDO.NUMERO` | Número do pedido/DAV | sim |
| `empresa_codigo` | `EMPRESA.CD_EMPRESA` | Código da empresa (filial) | sim |
| `tp_pedido` | `PEDIDO.TP_PEDIDO` | `PV` = pedido de venda · `DAV-OR` = orçamento | sim |
| `origem` | `PEDIDO.ORIGEM` | `BALCAO`, `ORCAMENTO`, etc. | sim |
| `participante` | `PEDIDO.PARTICIPANTE_NOME` | Nome do cliente | sim |
| `participante_documento` | `PEDIDO.PARTICIPANTE_DOCUMENTO` | CPF/CNPJ | não |
| `dataVenda` | `PEDIDO.DT_VENDA` | Data da venda (AAAA-MM-DD) | sim |
| `horaVenda` | `PEDIDO.HR_VENDA` | Hora da venda (HH:MM:SS) | sim |
| `horaInicioSeparacao` | **novo** | Hora em que o pedido saiu para separação | sim |
| `horaSeparado` | `PEDIDO.HR_SEPARADO` | Hora em que a separação/conferência terminou | sim |
| `dataSaida` | `ENTREGA.DT_SAIDA` | Data de saída para entrega | não |
| `horaSaida` | `ENTREGA.HR_SAIDA` | Hora de saída para entrega | não |
| `dataEntrega` | `ENTREGA.DT_ENTREGA` | Data da entrega efetiva | não |
| `horaEntrega` | `ENTREGA.HR_ENTREGA` | Hora da entrega efetiva | não |
| `dataFechamento` | `PEDIDO.DT_FECHAMENTO` | Data do fechamento do DAV | não |
| `horaFechamento` | `PEDIDO.HR_FECHAMENTO` | Hora do fechamento do DAV | não |
| `entregador` | `ENTREGA.ID_ENTREGADOR` → `PARTICIPANTE.NOME` | Entregador responsável | não |
| `separador` | `PEDIDO.ID_SEPARADOR` → `USUARIO.NOME` | Separador responsável | não |
| `entrega` | `PEDIDO.ENTREGA` | `SIM` = vai para entrega · `NAO` = balcão/retirada | sim |
| `status` | `PEDIDO.STATUS` | `ABERTO`, `FECHADO`, `CANCELADO`, `LANCANDO` | sim |
| `status2` | `PEDIDO.STATUS2` | `PENDENTE`, `EM SEPARACAO`, `SEPARADO`, `EM ENTREGA`, `ENTREGUE`, `DESISTENCIA`, `NO CAIXA` | sim |
| `valorTotal` | `PEDIDO.VLR_TOTAL` | Valor total do pedido | não |
| `qtdItens` | `PEDIDO_PROD` | Quantidade de itens do pedido | não |
| `qtdPecas` | `PEDIDO_PROD.QTDE` (soma) | Peças separadas (base do reconhecimento por produtividade) | não |
| `motivoCancelamento` | `PEDIDO.MOTIVO_CANCELAMENTO` | Motivo quando cancelado/desistência | não |
| `numeroNf` | `PEDIDO.NFCE` / documento fiscal | Nota emitida | não |

## Regras de retorno (importantes)

1. **`horaInicioSeparacao`** não existe hoje no banco: precisa ser gravado quando o pedido
   entra em separação (`status2 = EM SEPARACAO`). Sem ele, o tempo de separação e o de
   conferência ficam somados num único número.
2. **`horaFechamento` deve ser nula enquanto o pedido está aberto.** Hoje o campo é preenchido
   com o horário da venda, o que gera fechamento falso.
3. **`horaEntrega` deve ser a entrega efetiva** (baixa na entrega). Hoje vem igual ao horário
   da venda e é descartada pelo relatório.
4. **`separador`** precisa ser gravado no pedido (`ID_SEPARADOR`), hoje sempre nulo.
5. Campos de horário devem vir `HH:MM:SS` (ou nulos), e datas em `AAAA-MM-DD`.

## O que o relatório calcula com isso

| Etapa | Fórmula | Limite atual |
| --- | --- | --- |
| Separação | `horaInicioSeparacao − horaVenda` | 5 min |
| Conferência | `horaSeparado − horaInicioSeparacao` | 15 min |
| Saída | `horaSaida − horaSeparado` | 30 min |
| Fechamento | `horaFechamento − horaSaida` | a definir |
| Ciclo total | `horaSaida − horaVenda` | — |

Com `separador` e `qtdPecas` passamos a medir produtividade por separador (DAVs e peças)
e a identificar quem precisa de treinamento — o objetivo do pedido de reconhecimento.
