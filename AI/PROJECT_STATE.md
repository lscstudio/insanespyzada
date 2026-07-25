# PROJECT_STATE — Estado do InsaneSpy

> Atualizado automaticamente a cada mudança relevante. Última atualização: 25 Jul 2026.

## Arquitetura Atual

- SPA em `src/spa/` com react-router-dom
- Shell TanStack Start (SSR desligado, `ssr: false`)
- State central: `StoreProvider` em `src/spa/lib/store.tsx` (1545 linhas)
- Backend: Supabase Postgres (14 tabelas, 3 views, 9 RPCs)
- Deploy: Vercel (push main → live em ~25s)

## Módulos Concluídos

- ✅ Auth (email/senha, autoconfirm, signup → session imediata)
- ✅ Dashboard/Home (KPIs, charts, top 10, movers)
- ✅ Bibliotecas (lista, filtro, adicionar, detalhe)
- ✅ Coleta via Firecrawl (pool de chaves, failover, idempotência)
- ✅ Realtime (11 tabelas subscritas → sync automático)
- ✅ Admin (5 tabs: painel, contas, membros, keys, nichos)
- ✅ Swipe (página existe e está implementada)
- ✅ Assinatura (planos, pagamentos, credit packs)
- ✅ Configurações (perfil, nichos CRUD, demo data, coleta manual)
- ✅ i18n pt/en/es
- ✅ Diagnóstico de coleta (`/api/collect/diagnostic` com `?reset=1`)
- ✅ Coleta periódica automática (client-side, baseada no plano)
- ✅ Dark mode first
- ✅ Delete account (cascade cleanup)

## Em Desenvolvimento / Pendente

- ⏳ Google OAuth (botão existe em Auth.tsx, configs não finalizadas)
- ⏳ Firecrawl: usuário precisa cadastrar chave válida no Admin → keys
- ⏳ Vercel Preview environment sem env vars

## Features Planejadas (não iniciadas)

- 🔲 Extração de vídeo MP4 real (plano DIAMOND)
- 🔲 Dashboards temáticos UI (tabelas existem, UI não implementada)
- 🔲 MCP (mencionado como feature futura)

## Refatorações Pendentes

- 🔲 `src/components/` e `src/hooks/` são scaffold não usado — considerar remover
- 🔲 `src/lib/*.functions.ts` não usados pelo SPA — avaliar se podem ser removidos
- 🔲 ~211 erros TS pré-existentes (tipos SPA não gerados no `Database`)
- 🔲 `uri_allow_list` do Supabase Auth concatenada (sem separadores)

## Problemas Conhecidos

Ver `AI/KNOWN_ISSUES.md` para lista completa.

## Prioridades Atuais

1. Usuário cadastrar Firecrawl válida → validar coleta real
2. Limpar bibliotecas de teste duplicadas (`4932...` e `b438...` = mesma URL)
3. Google OAuth quando usuário retomar

## Histórico de Deploy

- Repo: https://github.com/lscstudio/insanespyzada
- URL: https://insanespyzada.vercel.app
- Supabase: `yigyythppceqyjhxzsav` (SP, sa-east-1)
