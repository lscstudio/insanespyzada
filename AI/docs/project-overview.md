# InsaneSpy — Visão Geral

**Propósito**: Dashboard SaaS para monitorar bibliotecas de anúncios da Meta Ad Library. Espiona concorrentes, coleta snapshots, detecta escalação, exibe trends.

**Tagline**: "Você está sendo observado."

## Arquitetura

SPA (react-router-dom) com shell TanStack Start. State central via React Context (`StoreProvider`). Backend Supabase (Postgres + Auth + Realtime). Deploy Vercel.

## Modelo de Negócio

- **Planos**: Free (RECON, 5 libs), Pro (OPERATIVE, 10 libs, R$47/mês), Unlimited (DIAMOND, ∞ libs, R$247/trimestre)
- **RBAC**: admin (via `user_roles` + `has_role`) + user comum. Owner hardcoded via `OWNER_EMAIL`
- **Coleta**: pool Firecrawl + ScraperAPI gerenciado em `/admin` → tab "keys"

## Páginas

| Rota | Página | Descrição |
|------|--------|-----------|
| `/` | Home | Dashboard: KPIs, charts, rankings |
| `/bibliotecas` | Bibliotecas | Lista, filtro, adicionar |
| `/biblioteca/:id` | BibliotecaDetail | Detalhe, charts, creatives |
| `/swipe` | Swipe | Descoberta de criativos (Tinder-style) |
| `/assinatura` | Assinatura | Planos, pagamentos |
| `/configuracoes` | Configuracoes | Perfil, nichos, demo data |
| `/admin` | Admin | Painel admin (5 tabs) |
| `/auth` | Auth | Login/signup |

## Estado Atual

Ver `AI/PROJECT_STATE.md` para estado detalhado e `HANDOFF.md` para sessão atual.
