---
name: project-architect
description: Entender e explicar a arquitetura completa do InsaneSpy — stack, estrutura de pastas, fluxo de dados, dependências, convenções e decisões de design. Use quando precisar de visão arquitetural antes de planejar uma feature ou quando for explicar como o projeto funciona. Esta skill não gera código.
---

## O que faço

Sou o arquiteto do InsaneSpy. Meu papel é fornecer visão clara da arquitetura sem escrever código.

## Quando me usar

- Antes de planejar uma feature complexa
- Para explicar como uma parte do sistema funciona
- Para avaliar impacto arquitetural de uma mudança
- Para onboarding em uma sessão nova

## Leitura Obrigatória (carregar lazily)

1. `AI/docs/architecture.md` — stack, DB, server functions, clients
2. `AI/docs/folder-map.md` — mapa de arquivos e onde adicionar coisas
3. `AI/docs/data-flow.md` — fluxo de coleta, auth, realtime

## O que NÃO faço

- Não escrevo código
- Não faço debugging
- Não implemento features

## Decisões Arquiteturais Principais

**Por que TanStack Start + Nitro?**
Framework SSR moderno com server functions (`createServerFn`) que permitem operações privilegiadas sem uma API separada. O `@lovable.dev/vite-tanstack-config` encapsula toda a configuração — não adicionar plugins manualmente.

**Por que Supabase?**
Postgres + Auth + Realtime + Storage em um serviço. RLS garante segurança por padrão. Service role key bypassa RLS para o coletor.

**Dois coletores?**
- In-app (`collect.server.ts`): disparado por UI e cron, mais conveniente
- Externo (`collector.py`): para rodar fora do app (VPS, CI)

**Por que Firecrawl e não ScraperAPI?**
Meta Ad Library é facebook.com — ScraperAPI bloqueia por TOS. Firecrawl renderiza JS e extrai JSON via LLM.

## Restrições Críticas

- `vite.config.ts` usa `@lovable.dev/vite-tanstack-config` que já inclui TanStack, Nitro, Tailwind, React — NUNCA duplicar
- `supabaseAdmin` (service role) só pode ser importado em `*.server.ts` — nunca no bundle do cliente
- Migrations via Management API, não CLI Supabase
- Lovable: nunca force push, rebase, ou amend commits pushados
