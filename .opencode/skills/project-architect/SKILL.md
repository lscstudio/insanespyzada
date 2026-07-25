---
name: project-architect
description: Entender e explicar a arquitetura do InsaneSpy — stack, estrutura, fluxo de dados, convenções. Use quando precisar de visão arquitetural antes de planejar uma feature. Esta skill não gera código.
---

## Quando usar

- Antes de planejar feature complexa
- Explicar como parte do sistema funciona
- Avaliar impacto arquitetural de mudança

## Leitura (lazy)

1. `AI/docs/architecture.md` — stack, DB, routing, clients
2. `AI/docs/folder-map.md` — mapa de arquivos
3. `AI/docs/data-flow.md` — fluxo de coleta, auth, realtime

## Decisões Arquiteturais (ver `AI/DECISIONS.md` para detalhes)

- **SPA + react-router-dom** (não TanStack Router para páginas) — D1
- **Context Store** (não TanStack Query) — D2
- **Firecrawl** (não ScraperAPI para facebook.com) — D3
- **Migrations via Management API** (não CLI) — D4
- **Coleta periódica client-side** (não pg_cron) — D5
- **UI primitivos em arquivo único** (`ui.tsx`) — D8

## O que NÃO faço

- Não escrevo código
- Não faço debugging
- Não implemento features

## Restrições Críticas

- `vite.config.ts` usa `@lovable.dev/vite-tanstack-config` — NUNCA duplicar plugins
- `supabaseAdmin` só em `*.server.ts` ou `src/routes/api/`
- `ssr: false` no root — não mudar
- Scaffold `src/components/` e `src/hooks/` não é usado pelo SPA
