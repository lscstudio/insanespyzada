# InsaneSpy — Domínio e Conceitos

## O Problema

Gestores de tráfego espiam anúncios de concorrentes no Facebook/Instagram via Meta Ad Library. InsaneSpy automatiza: cadastra bibliotecas, coleta snapshots periódicos, detecta escalação, mostra trends em dashboard real-time.

## Entidades

### Library (Biblioteca)
URL da Meta Ad Library monitorada. Entidade central do sistema.
- `pageName`, `niche`, `url`, `status` (active/paused/archived)
- `created_by` = userId do dono
- Limite por plano: Free=5, Pro=10, Unlimited=∞
- `escalationScore` e `isEscalating` calculados via delta de snapshots

### Snapshot
Captura pontal de uma biblioteca.
- `active_ads_count`, `unique_creatives`, `scrape_ok`, `error_message`, `captured_at`
- View `library_latest` = último snapshot OK por biblioteca
- View `library_trend` = delta entre 2 últimos snapshots OK

### Creative (Criativo)
Anúncio individual por snapshot.
- `ad_archive_id`, `creative_hash`, `media_type` (video|image), `preview_url`
- `duplicate_count` = métrica de escalação

### Library Flag
Flags por biblioteca: `favorite`, `hidden_from_swipe`. Tabela `library_flags`.

### Niche (Nicho)
Tag de categoria criada pelo usuário. Ex: "E-commerce", "Saúde".

### Dashboard (Thematic Dashboard)
Agrupamento de bibliotecas por tema. Tabelas `dashboards` + `dashboard_libraries` (N:N).

### Notification
Notificação in-app. Tipos: `escalating`, `renewal`, `collection`, `system`.

### Subscription
Plano do usuário. `plan_id` (free|pro|unlimited), `status`. Criada por trigger ao registrar.

### Payment
Histórico de pagamentos. `amount`, `method` (card|pix), `status` (paid|scheduled).

### Swipe Favorite
Criativos favoritados no Swipe. Tabela `swipe_favorites`.

## Planos

| Codename | ID | Limite | Intervalo | Histórico | Swipe |
|----------|----|--------|-----------|-----------|-------|
| RECON | free | 5 | 60min | 2 dias | none |
| OPERATIVE | pro | 10 | 45min | 30 dias | partial |
| DIAMOND | unlimited | ∞ | 45min | 90 dias | full |

DIAMOND: apenas trimestral. Pix R$237, cartão R$247. Tem 5 slots ocultos + extração de vídeo.

## Páginas e Features

| Página | Rota | Feature |
|--------|------|---------|
| Home | `/` | Dashboard: KPIs, evolução, top 10, movers |
| Bibliotecas | `/bibliotecas` | Lista, filtro, adicionar, coletar agora |
| Biblioteca Detail | `/biblioteca/:id` | Charts, snapshots, creatives, editar |
| Swipe | `/swipe` | Descoberta de criativos (modo Tinder) |
| Assinatura | `/assinatura` | Planos, pagamentos, credit packs |
| Configurações | `/configuracoes` | Perfil, nichos, demo data, coleta manual |
| Admin | `/admin` | Painel admin (5 tabs: painel/contas/membros/keys/nichos) |

> Rota admin = `/admin`. O primeiro tab chama-se "painel". Não confundir.

## Escalação

Quando anunciante aumenta investimento agressivamente.
- Delta positivo entre snapshots consecutivos
- `isEscalating` + `escalationScore` no Library
- Badge "escalando" no LibraryCard
- Ranking "Top 10 mais escalados" no Home

## Coleta

### In-app (`src/lib/collect.server.ts`)
- Disparada por: `POST /api/collect` (UI ou coleta periódica automática) OU cron webhook
- Firecrawl (prioridade) → ScraperAPI (fallback)
- Pool de chaves com round-robin + failover
- `DYN_CACHE` (30s TTL), `EXHAUSTED` (10min TTL)
- Idempotência: pula libs com snapshot OK nos últimos 45min
- Lock 10min por lib via `collection_started_at`

### Externo (`collector/collector.py`)
- Playwright + supabase-py, standalone

### Coleta Periódica Automática
O próprio navegador dispara `fetch("/api/collect")` a cada `pushIntervalMin` (baseado no plano). O collector ignora libs com snapshot recente (janela 45min).

## Termos que Confundem

| Termo | Significado |
|-------|-------------|
| "biblioteca" | Ad library do Facebook monitorada (NÃO lib npm) |
| "snapshot" | Captura pontual de dados (NÃO git snapshot) |
| "coletor" | Sistema que scrapeia Meta Ad Library |
| "painel" | Tab do Admin (`/admin`), NÃO rota `/painel` |
| "DIAMOND" | Codename do plano Unlimited |
| "running" | Status de coleta em andamento |
| "RECON/OPERATIVE" | Codenames dos planos Free/Pro |

## Mapeamento Código → Conceito

| Conceito | Arquivo |
|---------|---------|
| Store central | `src/spa/lib/store.tsx` — `StoreProvider`, `bootstrap()`, `mapLibrary()` |
| Tipos | `src/spa/lib/types.ts` — `Library`, `Snapshot`, `Creative`, `Plan` |
| Planos | `src/spa/lib/plans.ts` — `PLANS`, `CREDIT_PACKS` |
| Admin check | `src/spa/lib/admin.ts` — `callAdmin()`, `useAdminCheck()` |
| Coletor | `src/lib/collect.server.ts` — `runCollection()`, `DYN_CACHE`, `EXHAUSTED` |
| Realtime | `src/spa/lib/store.tsx` — channel em `snapshots`, `libraries`, `creatives`, `niches`, `library_flags`, `dashboards`, `notifications`, `subscriptions`, `payments`, `swipe_favorites` |
