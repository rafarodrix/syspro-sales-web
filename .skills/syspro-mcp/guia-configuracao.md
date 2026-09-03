# MCP Syspro — Guia de Configuração e Diagnóstico

> Skill resumo: `.skills/syspro-mcp/SKILL.md` (este é o guia detalhado de referência).

Documenta como conectar o **MCP do Syspro ERP** ao Hermes (e a qualquer cliente MCP), os formatos exatos de URL/chave, e o estado validado na homologação (03/09/2026).

---

## 1. Arquitetura do MCP Syspro

```
[Cliente MCP: Hermes/Grok/ChatGPT/Claude]
        │  POST /syspro  (JSON-RPC + SSE)
        ▼
[Ngrok https://<sub>.ngrok-free.dev]   ← túnel público (opcional p/ acesso externo)
        │  injeta header authorization: "Bearer {TOKEN}"  (traffic_policy)
        ▼
[SysproServer.exe — porta 3333]        ← servidor MCP (endpoint /syspro)
        │  valida: transporte (header) + autorização das tools (ERP)
        ▼
[Firebird syspro.fdb]                  ← dados do ERP
```

**Dois formatos de acesso (equivalentes):**
- **Via ngrok** (externo): `https://<sub>.ngrok-free.dev/syspro`
- **Via rede/VPN** (interno): `http://<ip>:3333/syspro` (ex.: Tailscale `100.100.215.70`)

> ⚠️ O IIS (porta 1234, ISAPI) serve o ERP/API — **NÃO** expõe o MCP. O MCP vive no **SysproServer.exe standalone (3333)**, endpoint `/syspro`.

---

## 2. Configuração no servidor (SysproServer.ini)

Em `C:\Syspro\Server\SysproServer.ini` (ANSI/Windows-1252), garantir:

```ini
[SERVICE]
MCP=SIM

[TOKEN]
MCP={SEU-GUID-AQUI}
```

- `MCP=SIM` ativa o serviço MCP no SysproServer.
- O valor de `[TOKEN] MCP=` é o **GUID com chaves `{}`** (ex.: `{5F25CDB3-004E-4160-ACC6-478F06ACFFD5}`).
- Após editar: **reiniciar o SysproServer** (o `.ini` é lido no start). Se roda no IIS, reciclar o app pool.
- Log de sucesso na inicialização (console/arquivo):
  ```
  [SERVER] [] [02/09/2026 10:45:52]
  Port: 3333
  Endpoint: /syspro
  http://localhost:3333/syspro
  ```

---

## 3. Configuração do ngrok (acesso externo, opcional)

`C:\Users\<USUARIO>\AppData\Local\ngrok\ngrok.yml`:

```yaml
version: "3"
agent:
  authtoken: SEU_AUTHTOKEN_NGROK

endpoints:
  - name: MCP3333
    url: seu-subdominio.ngrok-free.dev
    upstream:
      url: 3333
    traffic_policy:
      on_http_request:
        - actions:
            - type: add-headers
              config:
                headers:
                  authorization: "Bearer {SEU-GUID-AQUI}"
```

Instalar como serviço:
```bat
ngrok.exe service install --config "C:\Users\<USUARIO>\AppData\Local\ngrok\ngrok.yml"
sc.exe config ngrok start= auto
Start-Service ngrok
```

---

## 4. Configuração no Hermes

### 4.1 Registro (config.yaml do perfil)

Em `<HERMES_HOME>/config.yaml` (ex.: `C:\Users\trilink\AppData\Local\hermes\profiles\trilink-admin\config.yaml`):

```yaml
mcp_servers:
  syspro:
    url: "http://<ip-ou-host>:3333/syspro"   # ou https://<sub>.ngrok-free.dev/syspro
    headers:
      authorization: "Bearer {SEU-GUID-AQUI}"   # ⚠️ prefixo "Bearer " OBRIGATÓRIO
    timeout: 180
    connect_timeout: 30
```

### 4.2 Reiniciar o gateway (obrigatório)

O MCP é descoberto no **startup** (sem hot-reload):
```bat
hermes gateway restart --profile trilink-admin
```

### 4.3 Verificar

```bash
hermes mcp list          # servidor registrado/habilitado
hermes mcp test syspro   # conecta + descobre tools (esperado: Connected, 21 tools)
```

Após conectar, as tools ficam disponíveis como `mcp__syspro__*`:
`search_empresa`, `search_participante`, `search_produto_*`, `search_pedido_*`,
`search_lancamento_*`, `search_titulos_*`, `send_empresa_email`, `liberar_empresa_licenca_em_confianca`, etc.

---

## 5. Teste manual (curl, sem cliente MCP)

Fluxo completo do protocolo MCP por HTTP (Streamable):

```bash
AUTH="Bearer {SEU-GUID-AQUI}"
URL="http://<ip>:3333/syspro"

# 1. initialize — captura Mcp-Session-Id do header de resposta
SESSION=$(curl -s -D - -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "MCP-Protocol-Version: 2025-11-25" \
  -H "authorization: $AUTH" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"hermes","version":"1.0"}}}' \
  | grep -i "^Mcp-Session-Id:" | cut -d' ' -f2 | tr -d '\r')

# 2. initialized (notificação)
curl -X POST "$URL" -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2025-11-25" -H "authorization: $AUTH" -H "Mcp-Session-Id: $SESSION" \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized"}'

# 3. chamar uma tool
curl -X POST "$URL" -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2025-11-25" -H "authorization: $AUTH" -H "Mcp-Session-Id: $SESSION" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_empresa","arguments":{}}}'
```

**Headers obrigatórios em TODAS as chamadas:** `authorization` (Bearer), `MCP-Protocol-Version` (igual ao do initialize), `Mcp-Session-Id` (da resposta do initialize).

---

## 6. Diagnóstico — estado validado (03/09/2026)

| Teste | Resultado | Observação |
|---|---|---|
| Conexão (initialize) | ✅ 200 | `serverInfo: syspro 1.0.0` |
| `prompts/list`, `resources/list` | ✅ OK | sem auth de ERP |
| `tools/list` | ✅ 21 tools | catálogo completo |
| **Tools de consulta ao ERP** (`search_empresa` etc.) | ❌ **"Token invalido."** | **autorização de nível ERP pendente** |

### Causa provável do "Token invalido."
O transporte MCP valida o header `authorization` (Bearer + GUID) — **funciona**.
As **tools de consulta** validam uma **autorização adicional de nível ERP** (licença/configuração do SysproServer que libera o acesso aos dados via MCP) — **não é o mesmo token do `[TOKEN] MCP=`**.

No manual do cliente, essa é a **"Chave de Configuração MCP fornecida pela equipe Trilink"**, solicitada separadamente. Provável vínculo com:
- Licença do SysproServer (recurso MCP precisa estar habilitado na licença), **ou**
- Registro/liberação no ERP/Portal por empresa.

### Próximos passos sugeridos
1. Verificar com o suporte/fabricante do Syspro: "as tools de consulta retornam 'Token invalido.' com o Bearer {GUID} correto — o que libera as tools? É licença MCP do SysproServer ou chave adicional?"
2. Testar com o **Grok** (que já usa o ngrok): se as tools funcionarem lá, comparar o header exato que o Grok envia.
3. Confirmar se a instância de homologação tem a **licença MCP** ativa no SysproServer.

---

## 7. Armadilhas conhecidas (não repetir)

1. **Bearer é obrigatório**: `authorization: "Bearer {GUID}"` — sem o prefixo `Bearer `, o servidor rejeita ("Unauthorized MCP request") ou valida errado.
2. **GUID com chaves `{}`**: o valor do `[TOKEN] MCP=` e do header inclui as chaves `{...}`.
3. **`MCP-Protocol-Version`**: o servidor valida que o header da chamada bate com o negociado no initialize (erro `Protocol version mismatch` se divergir). Usar o mesmo em todas as chamadas.
4. **Sessão**: cada `initialize` gera um `Mcp-Session-Id` novo; usá-lo nas chamadas seguintes daquela sessão.
5. **`/syspro` é o endpoint**: não é `/mcp` nem `/sse` — o caminho é `/syspro` na porta 3333.
6. **IIS (1234) ≠ MCP (3333)**: numa instalação via IIS, o MCP não sobe sozinho — o SysproServer.exe standalone (ou o serviço que o mantém) é quem expõe a 3333.
7. **`SysproServer.exe` sem serviço roda inerte**: se não houver serviço/atalho iniciando-o, ele não abre porta. Verificar como a instalação o mantém ativo.
8. **Reiniciar após mudar `.ini`**: token novo só vale após restart do SysproServer.
