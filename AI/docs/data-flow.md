# InsaneSpy — Fluxo de Dados

## Fluxo de Coleta (Caminho Principal)

```
[Trigger]
  ↓
  Usuário clica "Coletar agora" → POST /api/collect → triggerCollection (server fn)
  OU
  pg_cron → POST /api/public/hooks/heartbeat-7f3a9b2e8c1d4a6b (apikey header)
  OU
  python collector.py (externo)

  ↓
runCollection({ libraryId?, userId })
  ↓
  Lê libraries ativas do Supabase (service role)
  ↓
  Para cada lib: busca pool de chaves API (DYN_CACHE, 30s TTL)
  ↓
  Firecrawl request → extrai JSON LLM (active_ads, creatives[])
  ↓ (se falhar)
  ScraperAPI → regex parser (só domínios não-Facebook)
  ↓
  Grava snapshots (INSERT, service role) + creatives (upsert por ad_archive_id)
  ↓
  Retorna CollectReport { ok, failed, duration_ms, details[] }
  ↓
  Toast no cliente via useQuery invalidation + Realtime
```

## Fluxo de Leitura (Dashboard)

```
Usuário acessa / → _authenticated/index.tsx carrega
  ↓
  useLibrariesLatest() → SELECT * FROM library_latest
  useDailyStats() → SELECT * FROM daily_library_stats (últimos 30 dias)
  useHourlyTrend() → calcula delta entre últimos snapshots
  ↓
  KPIs: total libs ativas, total anúncios, leader, coletas última hora
  Charts: área (evolução diária), ranking top 10, movers última hora
  ↓
  useRealtimeRefresh() → subscription postgres_changes
  → invalida queryKeys específicos quando INSERT em snapshots/libraries/creatives
```

## Fluxo de Auth

```
POST /auth (email+senha) → supabase.auth.signInWithPassword()
  ↓
  Session → access_token armazenado no localStorage (Supabase padrão)
  ↓
  _authenticated/route.tsx: beforeLoad → supabase.auth.getSession()
  → sem sessão: redirect /auth
  → com sessão: renderiza layout + chama useRealtimeRefresh()
  ↓
  onAuthStateChange: sign-out → redirect /auth automaticamente
```

## Fluxo de Server Function (com Auth)

```
Cliente → useMutation → chama server fn via RPC
  ↓
  TanStack Start transmite via POST interno
  ↓
  requireSupabaseAuth middleware:
    1. Extrai Bearer token
    2. supabase.auth.getClaims(token) → valida JWT
    3. Injeta { supabase, userId, claims } no context
  ↓
  Handler da server fn recebe context autenticado
  → operações privilegiadas com supabase (anon key, mas userId validado)
  → ou supabaseAdmin para operações que precisam bypassar RLS
```

## Realtime → Cache Invalidation

```
Supabase Realtime WebSocket
  → postgres_changes INSERT snapshots → invalidate ["libraries-latest", "library-snapshots"]
  → postgres_changes ALL libraries → invalidate ["libraries-latest"]
  → postgres_changes INSERT creatives → invalidate ["top-creatives"]
  → postgres_changes ALL niches → invalidate ["niches"]
```

## Fluxo de Admin — Gerenciar API Keys

```
Admin acessa /painel → aba APIs
  ↓
  getApiPoolStatus() → lê api_keys + testa chaves (créditos, latência)
  ↓
  addApiKey(provider, key, label) → INSERT api_keys
  toggleApiKey(id, active) → UPDATE api_keys
  deleteApiKey(id) → DELETE api_keys
  ↓
  collect.server.ts: DYN_CACHE invalidado na próxima coleta (cache 30s)
```

## Fluxo de Conta — Novo Usuário

```
Signup → supabase.auth.signUp()
  ↓
  DB Trigger: INSERT auth.users → INSERT profiles + INSERT subscriptions (plano free)
  ↓
  Usuário logado imediatamente (mailer_autoconfirm=true)
```

## Estado de Coleta por Biblioteca

```
library.lastCollection.status:
  "running"  → primeira coleta em andamento (sem snapshot válido)
  "success"  → último scrape_ok = true (snapshot válido existe)
  "error"    → último scrape_ok = false (exibe error_message)
```
