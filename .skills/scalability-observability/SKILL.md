---
name: scalability-observability
description: Use ao alterar consultas Syspro, cache, concorrência, SQLite, PM2, logs ou ao avaliar Postgres e serviços Nest.
---

# Escalabilidade e observabilidade

## Modelo atual

O produto roda localmente em uma instância Next/PM2, perto do Syspro. Otimize primeiro esse modelo.

- Consultas idênticas simultâneas compartilham a mesma Promise; cache tem chave empresa+período, TTL e limite de entradas.
- Toda fan-out para filiais tem concorrência explícita. Não use `Promise.all` sem limite para número variável de empresas.
- Logue evento, duração, sucesso, rota e identificador interno da empresa. Não registre CNPJ, senha, token ou payload de vendas.
- Cache e rate limit em `Map` são por processo. Não configure múltiplas instâncias PM2 supondo consistência compartilhada.
- SQLite continua adequado enquanto houver uma instância e poucas escritas. Use timeout de lock, migrations, backup e restore testado.

## Critérios de evolução

Considere PostgreSQL/cache compartilhado quando houver múltiplos processos, escrita concorrente relevante ou necessidade de alta disponibilidade. Considere Nest somente para API independente, filas/workers, vários consumidores ou deploy separado do frontend. Não introduza essas camadas apenas por crescimento de arquivos.

Monitore latência Syspro, divisões adaptativas, cache hit/miss, chamadas compartilhadas, erros por rota e tamanho dos resultados antes de decidir.
