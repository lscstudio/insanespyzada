# InsaneSpy — Domínio e Conceitos

## Entidades Centrais

### Library (Biblioteca)
Uma URL da Meta Ad Library (página de anunciante no Facebook/Instagram) que o usuário quer monitorar. A entidade mais importante do sistema.

- Tem `pageName`, `niche`, `url`, `status` (active/paused/archived)
- `created_by` = userId do dono
- `escalation_score`: calculado a partir de snapshots — mede quão "agressivo" está escalando
- `isEscalating`: flag boolean derivada do score
- **Ciclo**: usuário cria → coletor roda → snapshots acumulam → trends aparecem

### Snapshot
Captura pontual de uma biblioteca em determinado momento.
- `active_ads_count`: quantidade de anúncios ativos no momento da coleta
- `unique_creatives`: criativos únicos detectados
- `scrape_ok`: boolean — coleta bem-sucedida?
- Gerado pelo coletor (interno ou externo) com service role
- Snapshot mais recente com `scrape_ok=true` = "última coleta válida"

### Creative (Criativo)
Anúncio individual descoberto durante uma coleta.
- `ad_archive_id`: ID único na Meta
- `creative_hash`: hash para deduplicação
- `media_type`: video | image
- `preview_url`: thumbnail
- `duplicate_count`: quantas vezes esse criativo foi visto (métrica de escalação)
- `daysActive`: calculado no cliente

### Niche (Nicho)
Tag de category criada pelo usuário para organizar bibliotecas. Ex: "E-commerce", "Financeiro", "Saúde".

### Plan (Plano)
| ID | Codename | Limite libs | Intervalo | Histórico | Swipe |
|----|----------|------------|-----------|-----------|-------|
| `free` | RECON | 5 | 60min | 2 dias | none |
| `pro` | OPERATIVE | 10 | 45min | 30 dias | partial |
| `unlimited` | DIAMOND | ∞ | 45min | 90 dias | full |

### Swipe
Feature premium que mostra criativos de várias bibliotecas em modo "swipe" (como Tinder). Disponível parcialmente no Pro, totalmente no Unlimited/DIAMOND.

### Escalação / Escalation Score
Métrica derivada: indica se o anunciante está aumentando agressivamente o investimento em anúncios. Calculado por comparação de snapshots consecutivos. `isEscalating = score > threshold`.

### Dashboard (Thematic Dashboard)
Agrupamento personalizado de bibliotecas por tema. Entidade no schema mas ainda não implementada no UI.

### Score
Métrica de performance de uma biblioteca ou criativo. Usado no ranking "Top 10 mais escalados".

### Feed / Realtime
O dashboard atualiza em tempo real via Supabase Realtime (`postgres_changes`). Hook `use-realtime-refresh.ts` invalida cache do TanStack Query automaticamente.

### Scheduler / Cron
Coleta automática disparada por:
1. `POST /api/public/hooks/heartbeat-7f3a9b2e8c1d4a6b` (webhook obscurecido, autenticado via `apikey` header)
2. Manualmente pelo usuário clicando "Coletar agora"
3. Externamente pelo `collector.py` rodando em cron

### Retry / Failover
O coletor interno (`collect.server.ts`) gerencia um pool de chaves API:
- Firecrawl (prioridade 1) → ScraperAPI (fallback)
- Chaves esgotadas (quota 402): `EXHAUSTED`, TTL 10min
- ScraperAPI 401/403 em conta nova: transiente, não marca esgotada
- ScraperAPI em facebook.com: **definitivamente bloqueado por TOS** — usar Firecrawl
- `?reset=1` no endpoint `/api/collect/diagnostic` limpa cache EXHAUSTED

### MCP
Não implementado. Mencionado em features futuras. O projeto usa um webhook obscurecido como alternativa ao cron.

### Admin
Usuário com `user_roles.role = 'admin'`. Acesso ao `/painel`:
- Gerenciar pool de API keys (Firecrawl/ScraperAPI)
- Ver ranking de uso por conta
- Gerenciar membros (grant/revoke admin, limites, ban)

### Diamond (Unlimited)
Codinome do plano mais alto. Acesso total: bibliotecas ilimitadas, swipe completo, 5 slots ocultos, extração de vídeo MP4.

### Histórico
Snapshots acumulados ao longo do tempo. View `daily_library_stats` agrega em dias. Retidos por N dias (`purge_old_snapshots(days)` via service role). Limites: Free=2d, Pro=30d, DIAMOND=90d.

## Fluxo de Negócio

```
Usuário cria conta → plano Free aplicado automaticamente (trigger DB)
→ Cadastra bibliotecas (URLs da Meta Ad Library)
→ Coletor roda (Firecrawl) → grava snapshots/creatives
→ Dashboard mostra trends, ranking, KPIs em tempo real
→ Usuário identifica anunciantes escalando → decisão de negócio
```

## Termos Internos no Código

| Termo | Arquivo | Significado |
|-------|---------|-------------|
| `DYN_CACHE` | `collect.server.ts` | Cache in-memory das chaves API |
| `EXHAUSTED` | `collect.server.ts` | Set de chaves com quota esgotada |
| `runCollection` | `collect.server.ts` | Função principal de coleta |
| `CollectReport` | `collect.server.ts` | Resultado: ok/failed/duration |
| `PageBreakdown` | `collect.server.ts` | Resultado por página/biblioteca |
| `mapLibrary` | `store.tsx` | Mapeia DB → tipo Library (sem mock) |
| `bootstrap()` | `store.tsx` | Inicia app (10 queries, try/catch) |
| `requireSupabaseAuth` | `auth-middleware.ts` | Middleware JWT para server fns |
| `supabaseAdmin` | `client.server.ts` | Client service role (server only) |
| `OWNER_EMAIL` | `admin-members.functions.ts` | Super-admin hardcoded |
