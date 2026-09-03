---
name: syspro-mcp
description: Use for Syspro MCP setup (config, auth Bearer GUID, endpoint).
---

# MCP Syspro — Conexão com clientes de IA (Hermes, Grok, ChatGPT)

Como conectar o **MCP do Syspro ERP** (endpoint `/syspro` na porta 3333 do SysproServer.exe) a clientes MCP. Guia completo de configuração, teste manual e diagnóstico: `.skills/syspro-mcp/guia-configuracao.md`.

## Resumo rápido (validado 03/09/2026)

- **Endpoint**: `http://<host>:3333/syspro` (rede/VPN) ou `https://<sub>.ngrok-free.dev/syspro` (externo). O IIS (1234) **não** expõe MCP.
- **Auth**: header `authorization: "Bearer {GUID}"` — **Bearer obrigatório**, GUID **com chaves `{}`**, igual ao `[TOKEN] MCP=` do `SysproServer.ini`.
- **Protocolo**: Streamable HTTP. Todas as chamadas exigem `MCP-Protocol-Version` (consistente) + `Mcp-Session-Id` (da resposta do initialize).
- **No Hermes**: config em `mcp_servers.syspro` no `config.yaml` do perfil → `hermes gateway restart` → tools `mcp__syspro__*` (21 tools).
- **Estado**: transporte/conexão ✅ OK; tools de consulta ao ERP retornam **"Token invalido."** — autorização de nível ERP (licença/chave fornecida pela Trilink) pendente, distinta do token de transporte.

## Armadilhas
1. `authorization` precisa do prefixo `Bearer ` (sem ele: rejeita).
2. GUID com `{}` (formato do `.ini`).
3. `/syspro` é o endpoint (não `/mcp` nem `/sse`).
4. Reiniciar SysproServer após mudar `.ini` (token lido no start).
5. SysproServer.exe sem serviço/atalho roda inerte (não abre a 3333).
