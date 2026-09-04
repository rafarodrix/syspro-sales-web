---
name: syspro-api-exporta
description: Use for Syspro export API queries (routes, fields, IIS).
---

# Syspro — API de Exportação (consulta de dados)

API REST do Syspro ERP para **consultar dados** (vendas, estoque, produção, títulos, transporte). Usada pelo `SysproERP Reports` e por análises de suporte. É **leitura** — não emite nem altera nada (emissão é ACBr/e-Frete, ver skill `syspro-erp`).

## URLs — dois formatos (confirmados ao vivo; IIS via DLL)

- **Sem IIS**: `http://servidor:porta/api/exporta/<rota>?dt_inicial=DD/MM/AAAA&dt_final=DD/MM/AAAA`
- **Com IIS**: `http://servidor:porta/sysproserverisapi.dll/api/exporta/<rota>?dt_inicial=DD/MM/AAAA&dt_final=DD/MM/AAAA`
  - ⚠️ Prefixo IIS é **`/sysproserverisapi.dll/api/exporta/...`** — NÃO `/syspro/exporta/api/...` (dá 404).
  - ⚠️ Um mesmo cliente responde **só um** dos formatos — testar os dois (ex.: cliente SUPRA responde apenas SEM IIS; o servidor de dev local com IIS responde via DLL).

## Rotas disponíveis

| Rota | Endpoint | Uso |
|---|---|---|
| Vendas de produto | `produto/venda` | foco do SysproERP Reports |
| Movimentações de estoque | `produto/kardex` | saldo/movimento |
| Produção | `producao` | produzido/previsto |
| Títulos a receber | `receber` | contas a receber |
| Títulos a pagar | `titulo/pagar` | contas a pagar |
| Transporte/rotas | `transporte/rota` | frete |

## Regras
- Datas **DD/MM/AAAA** (não ISO) em `dt_inicial`/`dt_final` — ISO/ano-primeiro → **HTTP 500**.
- Resposta: **JSON array**. Vazio `[]` quando nada no período.
- Datas DENTRO do JSON vêm em **ISO** (`2026-08-01`); valores numéricos como **number**.
- Cada registro traz **`empresa_codigo`** (string: `"1"`, `"2"`, ...) → filtrar por empresa no consumidor. **Não há CNPJ no retorno**; a razão social (`empresa_razao`/`empresa_nome`) pode ser **igual entre empresas** da mesma base.
- **404** = caminho errado (com vs sem IIS). Raiz do site IIS costuma dar **403.14** (sem index — normal).
- **401** no caminho IIS = exige auth Basic (quando o caminho sem IIS é o correto).

## Campos — rota produto/venda (parcial)
`empresa_codigo`, `empresa_razao`, `nf_cd_grupo_documento`, `nf_ds_grupo_documento`, `nf_numero`, `nf_modelo` (55/65), `nf_dt_emissao`, `nf_forma_pagto`, `cliente_nome`, `cliente_cidade`, `cliente_uf`, `produto_id`, `produto_descricao`, `produto_departamento`, `produto_un`, `produto_qtde`, `produto_vlr_item`, `produto_vlr_icms_stb`, `produto_vlr_desconto`, `produto_vlr_frete`, `produto_vlr_seguro`, `produto_vlr_outros`, `produto_vlr_total_item`, `produto_vlr_total_liquido`, `vendedor_nome`.

## Descobrir a configuração do cliente
1. `appcmd list sites` (Windows/IIS) mostra o site (ex.: site "Syspro", porta 1234, physicalPath `C:\Syspro\Server` com `SysproServer.exe`/`SysproServerISAPI.dll`).
2. Testar os dois prefixos e ver qual responde 200.
3. Hostname pode resolver para IPv6 (`fe80::`) — `curl`/PowerShell `Invoke-WebRequest` funcionam; testar também por IP/localhost.
