# InsaneSpy — Arquitetura

## Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework SSR | TanStack Start | ^1.167 |
| Roteamento | TanStack Router (file-based) | ^1.168 |
| Runtime server | Nitro | 3.0.260603-beta |
| Build | Vite + `@lovable.dev/vite-tanstack-config` | 8.x |
| UI | React 19 + Tailwind CSS v4 | 19.x / 4.x |
| Componentes | shadcn/ui (Radix UI primitives) | - |
| Animação | Framer Motion | ^12 |
| Charts | Recharts | ^2.15 |
| Data fetching | TanStack Query | ^5.83 |
| Backend/DB | Supabase Postgres + RLS | ^2.108 |
| Auth | Supabase Auth + Lovable Cloud Auth | - |
| Formulários | react-hook-form + zod | ^7 / ^3.24 |
| i18n | Custom (pt/en/es) | - |
| Deploy | Vercel (auto-deploy via push main) | - |
| Linguagem | TypeScript 5.8 strict | - |

## Estrutura de Roteamento

```
src/routes/
├── __root.tsx              # App shell (HTML, Providers, 404)
├── auth.tsx                → /auth
├── reset-password.tsx      → /reset-password
├── admin.tsx               → /admin (legacy)
├── _authenticated/         # Layout guard (requer sessão Supabase)
│   ├── route.tsx           # beforeLoad → redireciona se sem sessão
│   ├── index.tsx           → / (Overview/Dashboard)
│   ├── bibliotecas.tsx     → /bibliotecas
│   ├── biblioteca.$id.tsx  → /biblioteca/:id
│   ├── painel.tsx          → /painel (admin-only)
│   ├── perfil.tsx          → /perfil
│   └── configuracoes.tsx   → /configuracoes
└── api/
    ├── collect.tsx         → POST /api/collect
    ├── admin.tsx           → /api/admin
    ├── delete-account.tsx  → /api/delete-account
    ├── collect/
    │   └── diagnostic.tsx  → GET /api/collect/diagnostic
    └── public/hooks/
        └── heartbeat-7f3a9b2e8c1d4a6b.ts  → POST (cron webhook obscurecido)
```

## Banco de Dados (Supabase Postgres)

### Tabelas Principais

| Tabela | Propósito |
|--------|-----------|
| `libraries` | Bibliotecas de anúncios monitoradas (URL, niche, status, created_by) |
| `snapshots` | Capturas periódicas (active_ads_count, scrape_ok, error_message) |
| `creatives` | Criativos individuais por snapshot |
| `niches` | Tags de categoria definidas pelo usuário |
| `profiles` | Perfis (display_name, avatar_url → auth.users) |
| `user_roles` | RBAC (role = 'admin') |
| `api_keys` | Pool de chaves Firecrawl/ScraperAPI |

### Views

| View | Uso |
|------|-----|
| `library_latest` | Último snapshot por biblioteca — drive do dashboard |
| `library_trend` | Comparação entre 2 últimos snapshots OK |
| `daily_library_stats` | Stats diários agregados (gráfico de evolução) |

### RPCs / Funções DB

| Função | Uso |
|--------|-----|
| `has_role(user_id, role)` | Gate de admin em todas as server functions |
| `purge_old_snapshots(days)` | Retenção — service-role apenas |

### RLS

- `snapshots`/`creatives`: somente service role pode escrever
- Leituras scoped por `created_by`/`owner_id`
- Admin gated por `user_roles.role = 'admin'` via RPC `has_role`

## Server Functions (TanStack Start `createServerFn`)

Todas usam middleware `requireSupabaseAuth` (valida Bearer JWT, injeta `{ supabase, userId, claims }`).

| Arquivo | Exports |
|---------|---------|
| `collect.functions.ts` | `triggerCollection` |
| `admin.functions.ts` | `checkIsAdmin`, `listAccounts`, `listLibrariesForAccount` |
| `admin-keys.functions.ts` | `getApiPoolStatus`, `addApiKey`, `deleteApiKey`, `toggleApiKey`, `getUsageRanking` |
| `admin-members.functions.ts` | `listMembers`, `setAdminRole`, `setLibraryLimit`, `banMember`, `unbanMember` |
| `account.functions.ts` | `deleteMyAccount` |
| `seed.functions.ts` | `seedDemoData`, `clearDemoData` |

## Supabase Clients

| Arquivo | Client | Uso |
|---------|--------|-----|
| `src/integrations/supabase/client.ts` | Anon/publishable | Browser (auto-gerado pela Lovable, lazy Proxy) |
| `src/integrations/supabase/client.server.ts` | Service role (`supabaseAdmin`) | **Server only** — bypassa RLS |
| `src/integrations/supabase/auth-middleware.ts` | - | Valida JWT em server functions |

> ⚠️ NUNCA importar `supabaseAdmin` no bundle do cliente.

## Variáveis de Ambiente

| Var | Tipo | Uso |
|-----|------|-----|
| `VITE_SUPABASE_URL` | Build-time | Client Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Build-time | Client anon key |
| `SUPABASE_URL` | Runtime | Server Supabase URL |
| `SUPABASE_PUBLISHABLE_KEY` | Runtime | Server anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Runtime | **Secret** — bypassa RLS |

## Dois Coletores

### 1. In-app (`src/lib/collect.server.ts`)
- 871 linhas, server-only
- Disparado por: `triggerCollection` server fn OU cron webhook
- Estratégia: Firecrawl (JSON LLM) → fallback regex
- Pool de chaves com failover e round-robin
- Escreve em `snapshots`/`creatives` via service role

### 2. Externo (`collector/collector.py`)
- Playwright + supabase-py
- Roda standalone (VPS, cron, GitHub Actions)
- Loop: `python collector.py --loop --hours 4`

## Migrações

27 arquivos SQL em `supabase/migrations/` (20260617 → 20260719).
**CLI Supabase não funciona** para este projeto — usar Management API via curl/Python.
