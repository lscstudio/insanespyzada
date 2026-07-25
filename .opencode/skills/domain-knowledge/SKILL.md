---
name: domain-knowledge
description: Conceitos de negócio e termos técnicos do InsaneSpy. Use quando precisar entender Library, Snapshot, Creative, Plano, Swipe, Diamond, Escalação, Score, Coleta, Pool de Chaves.
---

## Conceitos

### Library (Biblioteca)
URL da Meta Ad Library monitorada. Entidade central.
- Status: active/paused/archived
- Limite por plano: Free=5, Pro=10, Unlimited=∞

### Snapshot
Captura pontual: `active_ads_count`, `scrape_ok`, `error_message`.
View `library_latest` = último OK por biblioteca.

### Creative (Criativo)
Anúncio individual. `duplicate_count` = métrica de escalação.

### Escalação
Anunciante aumentando investimento. `isEscalating` + `escalationScore` via delta de snapshots.

### Swipe
Descoberta de criativos em modo Tinder. Rota `/swipe`. Free: sem acesso, Pro: parcial, DIAMOND: total.

### Assinatura
Página `/assinatura`. Planos, pagamentos, credit packs.

### Admin
Rota `/admin` (NÃO `/painel`). 5 tabs: painel, contas, membros, keys, nichos.
Gate: `useAdminCheck()` em `src/spa/lib/admin.ts`.

### Planos
| Codename | ID | Limite | Swipe |
|----------|----|--------|-------|
| RECON | free | 5 | none |
| OPERATIVE | pro | 10 | partial |
| DIAMOND | unlimited | ∞ | full |

### Coleta
- In-app: `collect.server.ts` (Firecrawl → ScraperAPI fallback)
- Periódica: client-side `fetch("/api/collect")` a cada `pushIntervalMin`
- Pool: `DYN_CACHE` (30s), `EXHAUSTED` (10min), idempotência 45min

## Mapeamento Código

| Conceito | Arquivo |
|---------|---------|
| Store/State | `src/spa/lib/store.tsx` — `StoreProvider`, `bootstrap()` |
| Tipos | `src/spa/lib/types.ts` |
| Planos | `src/spa/lib/plans.ts` — `PLANS` |
| Admin | `src/spa/lib/admin.ts` — `useAdminCheck()` |
| Coletor | `src/lib/collect.server.ts` — `runCollection()` |
| Realtime | `src/spa/lib/store.tsx` — 11 tabelas subscritas |

## Termos que Confundem

| Termo = Significado |
|---------------------|
| "biblioteca" = ad library monitorada (não lib npm) |
| "snapshot" = captura pontual (não git) |
| "coletor" = scraper da Meta Ad Library |
| "painel" = tab do Admin (rota é `/admin`) |
| "DIAMOND" = plano Unlimited |
| "RECON/OPERATIVE" = Free/Pro |
