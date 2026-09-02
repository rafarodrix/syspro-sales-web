---
name: web-code-quality
description: Use for syspro-sales-web dev flow (question, plan, code, review).
---

# Fluxo de Desenvolvimento (Next.js/TS/Prisma local)

Padrão de qualidade para desenvolver no `syspro-sales-web` (e apps locais semelhantes). Método em 4 etapas — adaptado de boas práticas usadas em outros projetos da equipe, sem acoplar a domínios de terceiros.

## ETAPA 1 — Questionar antes de codar
Nunca aceite a tarefa sem entender o "porquê":
1. Ambiguidades, lacunas, falhas lógicas do pedido.
2. Riscos: performance (a API do Syspro devolve **muitos itens** — ex.: 1.7k itens/mês, 8k+/ano — cuidado com payload e render), segurança (RBAC por CNPJ), escalabilidade.
3. Faça perguntas cirúrgicas OU declare premissas explicitamente quando o usuário quer velocidade.

## ETAPA 2 — Arquitetar (onde colocar)
- **Tela** (server component) → `app/<rota>/page.tsx`: busca dados + passa props.
- **Interatividade** → `components/<nome>-client.tsx` ("use client").
- **Regra de acesso/consulta externa** → `app/api/<recurso>/route.ts` (rota autenticada).
- **Chamada à API do Syspro** → `lib/syspro-api.ts` (tipos + funções). **Nunca** no client.
- **Mudança de schema** → `prisma/schema.prisma` + migration.
- Validações de negócio no backend (rota), não só na UI.

## ETAPA 3 — Implementar
- TypeScript estrito; sem `any` solto.
- Erros tratados (rota devolve status correto; client mostra toast).
- Comentários só para decisões não óbvias.
- Respeite as armadilhas da skill `syspro-sales-web` (datas DD/MM/AAAA, Suspense, Prisma 7 adapter...).

## ETAPA 4 — Revisar antes de entregar
- `npx tsc --noEmit` limpo (ignorar ruído de lint de node_modules quando roda por arquivo).
- `npm run build` passa (prerender OK).
- Teste manual do fluxo real (login + chamada) — **não** apenas "compilou".
- Commit pequeno e descritivo; push para `github.com/rafarodrix/syspro-sales-web`.

## Checklists rápidos
- **Rota nova**: autenticada? admin vs user? valida input? erro claro?
- **Tela nova**: Suspense se usar useSearchParams; dados via server component quando possível.
- **Schema novo**: `prisma migrate dev` + `prisma generate` + seed atualizado se precisar.
- **Data**: sempre DD/MM/AAAA na API do Syspro.
