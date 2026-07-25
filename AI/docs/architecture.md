# InsaneSpy — Arquitetura

## Visão Geral

O app é um **SPA (Single Page Application)** com shell TanStack Start. O TanStack Router gerencia apenas o root HTML e API routes server-side; todas as páginas rodam via `react-router-dom` dentro do catch-all.

```
Request → TanStack Router (__root.tsx: HTML shell, QueryClientProvider)
       → $.tsx (catch-all, ssr:false) → src/spa/App.tsx (BrowserRouter)
       → src/spa/pages/* (páginas reais)
```

## Stack

| Camada | Tecnologia |
|--------|-----------|
| SSR shell | TanStack Start + Nitro + Vite 8 |
| SPA routing | `react-router-dom` (BrowserRouter) — NÃO TanStack Router para páginas |
| UI | React 19 + Tailwind CSS v4 + `src/spa/components/ui.tsx` (primitivos custom) |
| Charts | Recharts + `src/spa/components/charts.tsx` |
| State | React Context (`StoreProvider` em `src/spa/lib/store.tsx`, 1545 linhas) |
| Data | Supabase JS client (direto, sem TanStack Query no SPA) |
| Auth | Supabase Auth + `@lovable.dev/cloud-auth-js` (Google OAuth) |
| Server ops | `fetch("/api/...")` — NÃO import de server functions |
| Backend | Supabase Postgres + RLS |
| Coletor | `src/lib/collect.server.ts` (server-only, Firecrawl/ScraperAPI) |
| i18n | Custom pt/en/es (`src/lib/i18n.tsx`) |
| Build | `@lovable.dev/vite-tanstack-config` (não adicionar plugins) |
| Deploy | Vercel (auto-deploy push main ~25s) |

## Rotas Reais (react-router-dom em `src/spa/App.tsx`)

| URL | Página | Auth |
|-----|--------|------|
| `/auth` | `Auth.tsx` | público (redirect se logado) |
| `/reset-password` | `ResetPassword.tsx` | público |
| `/` | `Home.tsx` | RequireAuth |
| `/bibliotecas` | `Bibliotecas.tsx` | RequireAuth |
| `/biblioteca/:id` | `BibliotecaDetail.tsx` | RequireAuth |
| `/swipe` | `Swipe.tsx` | RequireAuth |
| `/assinatura` | `Assinatura.tsx` | RequireAuth |
| `/configuracoes` | `Configuracoes.tsx` | RequireAuth |
| `/admin` | `Admin.tsx` | RequireAuth + `useAdminCheck()` |
| `/dashboards*` | → redirect `/configuracoes` | - |
| `/planos`, `/minha-assinatura` | → redirect `/assinatura` | - |
| `/perfil`, `/onboarding` | → redirect `/configuracoes` ou `/` | - |

> ⚠️ A rota admin é `/admin`, NÃO `/painel`. O primeiro tab do Admin chama-se "painel".

## API Routes (TanStack Router server-side, `src/routes/api/`)

| Rota | Método | Auth | Propósito |
|------|--------|------|-----------|
| `/api/collect` | POST | Bearer JWT | Dispara `runCollection()` |
| `/api/admin` | POST | Bearer JWT + admin | Lista contas, bibliotecas, stats |
| `/api/delete-account` | POST | Bearer JWT | Deleta conta (cascade) |
| `/api/collect/diagnostic` | GET | Bearer JWT + admin | Diagnóstico de coleta, `?reset=1` limpa cache |
| `/api/public/hooks/heartbeat-7f3a9b2e8c1d4a6b` | POST | apikey header | Cron webhook (coleta em background) |

## Banco de Dados (Supabase Postgres)

### Tabelas (14)

| Tabela | Propósito |
|--------|-----------|
| `libraries` | Bibliotecas monitoradas (URL, niche, status, created_by) |
| `snapshots` | Capturas periódicas (active_ads_count, scrape_ok, error_message) |
| `creatives` | Criativos individuais por snapshot |
| `niches` | Tags de categoria do usuário |
| `profiles` | Perfis (display_name, avatar_url → auth.users) |
| `user_roles` | RBAC (role = 'admin') |
| `api_keys` | Pool de chaves Firecrawl/ScraperAPI |
| `library_flags` | Flags por biblioteca (favorite, hidden_from_swipe) |
| `dashboards` | Dashboards temáticos (agrupamento de bibliotecas) |
| `dashboard_libraries` | Relação N:N dashboards ↔ libraries |
| `notifications` | Notificações in-app (escalation, renewal, system) |
| `subscriptions` | Plano do usuário (plan_id, status) |
| `payments` | Histórico de pagamentos |
| `swipe_favorites` | Criativos favoritados no Swipe |

### Views (3)

| View | Uso |
|------|-----|
| `library_latest` | Último snapshot por biblioteca |
| `library_trend` | Comparação entre 2 últimos snapshots OK |
| `daily_library_stats` | Stats diários agregados (gráfico evolução) |

### Funções/RPCs (9)

| Função | Uso |
|--------|-----|
| `has_role(user_id, role)` | Gate de admin |
| `purge_old_snapshots(days)` | Retenção (service role) |
| `enforce_library_limit()` | Trigger: bloqueia criação além limite do plano |
| `handle_new_user_profile()` | Trigger: cria profile ao registrar |
| `handle_new_user_subscription()` | Trigger: cria subscription (free) ao registrar |
| `handle_new_user_role()` | Trigger: role padrão |
| `set_library_created_by()` | Trigger: seta created_by = auth.uid() |
| `set_niche_owner()` | Trigger: seta owner do nicho |
| `set_updated_at()` | Trigger: atualiza updated_at |

### RLS

- `snapshots`/`creatives`: escrita apenas via service role
- Leituras scoped por `created_by = auth.uid()`
- Admin via `user_roles.role = 'admin'` + RPC `has_role`

## Supabase Clients

| Arquivo | Client | Uso |
|---------|--------|-----|
| `src/integrations/supabase/client.ts` | Anon/publishable | Browser (auto-gerado Lovable, lazy Proxy) |
| `src/integrations/supabase/client.server.ts` | Service role (`supabaseAdmin`) | **Server only** — bypassa RLS |
| `src/integrations/supabase/auth-middleware.ts` | - | Valida JWT em server functions |

> ⚠️ NUNCA importar `supabaseAdmin` no bundle do cliente.

## Dualidade Scaffold vs SPA

O projeto tem DUAS estruturas paralelas:

| Scaffold Lovable (NÃO usado pelo SPA) | SPA Ativo |
|---------------------------------------|-----------|
| `src/components/` (shadcn/ui, kebab-case) | `src/spa/components/` (PascalCase, `ui.tsx`) |
| `src/hooks/` (TanStack Query hooks) | `src/spa/lib/store.tsx` (Context + fetch) |
| `src/lib/*.functions.ts` (createServerFn) | `src/routes/api/*.tsx` (fetch handlers) |
| `src/components/layout/app-shell.tsx` | `src/spa/components/layout/AppLayout.tsx` |

O SPA importa APENAS de `@/integrations/supabase/client`. Tudo o mais é auto-contido em `src/spa/`.

> Ao trabalhar no app, SEMPRE editar `src/spa/`. Os arquivos em `src/components/` e `src/hooks/` são vestigiais do scaffold.

## Variáveis de Ambiente

| Var | Tipo | Uso |
|-----|------|-----|
| `VITE_SUPABASE_URL` | Build-time | Client Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Build-time | Client anon key |
| `SUPABASE_URL` | Runtime | Server Supabase URL |
| `SUPABASE_PUBLISHABLE_KEY` | Runtime | Server anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Runtime | **Secret** — bypassa RLS |

## Migrações

27 arquivos SQL em `supabase/migrations/`. CLI Supabase não funciona — usar Management API via curl/Python (header `User-Agent: supabase-migrator/1.0`).
