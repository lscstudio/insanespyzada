# InsaneSpy — Fluxo de Dados

## Fluxo de Coleta

```
[Trigger]
  ├── Usuário clica "Coletar agora" → fetch("/api/collect")
  ├── Coleta periódica automática → fetch("/api/collect") a cada pushIntervalMin
  ├── Cron webhook → POST /api/public/hooks/heartbeat-7f3a9b2e8c1d4a6b
  └── Externo → python collector.py

  ↓
POST /api/collect (valida Bearer JWT)
  ↓
runCollection({ libraryId?, userId }) em collect.server.ts
  ↓
  Lê libraries ativas (service role)
  ↓
  Pool de chaves API (DYN_CACHE, 30s TTL)
  ↓
  Firecrawl → JSON LLM (active_ads, creatives[])
  ↓ (fallback se não-Facebook)
  ScraperAPI → regex parser
  ↓
  INSERT snapshots + creatives (service role, batch 500)
  ↓
  Realtime postgres_changes → store.tsx syncLibraries()
  → UI atualiza automaticamente
```

## Fluxo de Auth

```
Signup/Login → supabase.auth.signInWithPassword() ou signUp()
  ↓
  Session → localStorage (padrão Supabase)
  ↓
  DB Triggers automáticos:
    handle_new_user_profile() → INSERT profiles
    handle_new_user_subscription() → INSERT subscriptions (free)
    handle_new_user_role() → INSERT user_roles (role padrão)
  ↓
  src/spa/App.tsx: RequireAuth component
    useStore().session → sem sessão: Navigate to /auth?next=...
    com sessão: renderiza AppLayout + página
  ↓
  onAuthStateChange no store: sign-out → limpa state → redirect /auth
```

## Fluxo de Leitura (Dashboard)

```
Home.tsx monta
  ↓
  useStore() → dados já carregados por bootstrap()
  ↓
  bootstrap() roda 10 queries:
    library_latest, library_trend, daily_library_stats,
    niches, library_flags, dashboards, notifications,
    subscriptions, payments, swipe_favorites
  ↓
  KPIs calculados: total libs ativas, total anúncios, leader, coletas/hora
  Charts: área (evolução diária via daily_library_stats)
  Rankings: top 10 escalados (via library_trend)
  ↓
  Realtime: INSERT em snapshots → syncLibraries() → re-render
```

## Realtime → Store Sync

```
Supabase Realtime WebSocket (em store.tsx)
  ├── snapshots INSERT    → syncLibraries()
  ├── libraries *         → syncLibraries()
  ├── creatives INSERT    → syncLibraries()
  ├── niches *            → syncNiches()
  ├── library_flags *     → syncFlags()
  ├── dashboards *        → syncDashboards()
  ├── dashboard_libraries * → syncDashboards()
  ├── notifications *     → syncNotifications()
  ├── subscriptions *     → syncSubscription()
  ├── payments *          → syncSubscription()
  └── swipe_favorites *   → syncSwipeFavorites()
```

## Fluxo Admin

```
Admin.tsx (/admin)
  ↓
  useAdminCheck() → verifica role via /api/admin
  ├── Tab "painel": stats gerais, diagnósticos
  ├── Tab "contas": lista usuários + bibliotecas
  ├── Tab "membros": grant/revoke admin, limites, ban
  ├── Tab "keys": pool Firecrawl/ScraperAPI (add/remove/toggle)
  └── Tab "nichos": CRUD de nichos globais
```

## Estado de Coleta por Biblioteca

```
library.lastCollection.status:
  "running"  → primeira coleta em andamento (sem snapshot OK)
  "success"  → último scrape_ok = true
  "error"    → último scrape_ok = false (exibe error_message)
```

## Coleta Periódica (client-side)

```
store.tsx useEffect:
  if (session) {
    setTimeout(tick, 30s)  // primeira coleta após 30s
    setInterval(tick, pushIntervalMin * 60000)  // recursivo
  }
  
tick():
  fetch("/api/collect", { method: "POST", body: {} })
  → collector ignora libs com snapshot < 45min (idempotência)
```
