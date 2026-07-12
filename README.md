# InsaneSpy

> **"Você está sendo observado."** — A Meta Ad Library monitoring dashboard. InsaneSpy tracks Facebook/Instagram ad libraries (competitor ad spy), collects periodic snapshots of active-ad counts and creatives, and surfaces trends, rankings, and per-account admin controls.

Built with **TanStack Start** (React 19, file-based routing, SSR-optional server functions) and **Supabase** (Postgres + Auth + Realtime + Storage), with an external Python/Playwright **collector** that scrapes the Meta Ad Library and writes snapshots via the service-role key.

---

## Tech stack

- **Framework:** TanStack Start (`@tanstack/react-start`, `@tanstack/react-router`, file-based routing in `src/routes`)
- **UI:** React 19, Tailwind CSS v4, shadcn/radix-ui components, Framer Motion, Recharts, lucide-react icons
- **Data/state:** TanStack Query, Supabase JS client (Postgres + Realtime + Auth + Storage)
- **Backend:** Supabase Postgres (RLS-secured tables/views/RPCs), TanStack Start server functions (`createServerFn`) for privileged operations
- **Auth:** Supabase Auth (email/password + Google OAuth via `@lovable.dev/cloud-auth-js`), role-based admin gate (`user_roles` + `has_role` RPC)
- **Collector:** standalone Python script (`collector/collector.py`) using Playwright + `supabase-py`, plus a Firecrawl/LLM-based hybrid scraper embedded server-side (`src/lib/collect.server.ts`)
- **i18n:** custom lightweight i18n (`src/lib/i18n.tsx`) — pt/en/es
- **Build tooling:** Vite 8, Nitro, ESLint, Prettier, TypeScript

---

## package.json

**Scripts**
| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `vite dev` | Start local dev server |
| `build` | `vite build` | Production build |
| `build:dev` | `vite build --mode development` | Dev-mode build |
| `preview` | `vite preview` | Preview production build |
| `lint` | `eslint .` | Lint the codebase |
| `format` | `prettier --write .` | Format the codebase |

**Key dependencies:** `@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/react-query`, `@supabase/supabase-js`, `@lovable.dev/cloud-auth-js`, `react`/`react-dom` 19, `tailwindcss` 4, `recharts`, `framer-motion`, `zod`, `react-hook-form`, `date-fns`, full Radix UI primitive set (accordion, dialog, dropdown, select, tabs, tooltip, etc.), `sonner` (toasts), `cmdk`, `vaul`, `embla-carousel-react`.

**Key devDependencies:** `vite` 8, `@lovable.dev/vite-tanstack-config`, `nitro`, `typescript`, `typescript-eslint`, `eslint` + `eslint-plugin-react-hooks`/`react-refresh`/`prettier`, `@tanstack/router-plugin`.

---

## Project structure

```
src/
  routes/            # file-based routes (TanStack Router)
  components/        # UI components (shadcn/ui in components/ui, custom in components/)
  hooks/             # React Query hooks + auth/realtime hooks
  lib/               # server functions ("*.functions.ts"), collector logic, i18n, utils
  integrations/      # supabase + lovable auth clients
  styles.css, router.tsx, server.ts, start.ts, routeTree.gen.ts (auto-generated)
supabase/
  migrations/        # 25 SQL migrations defining schema, RLS, views, RPCs
  config.toml
collector/
  collector.py       # external Playwright/Supabase scraper skeleton
  README.md
```

---

## Routes (`src/routes`, file-based via TanStack Router)

| File | URL | Description |
| --- | --- | --- |
| `__root.tsx` | (root shell) | App shell: HTML doc, meta/OG tags, `QueryClientProvider`, `ThemeProvider`, `LanguageProvider`, global `Toaster`, 404 and error boundary components. |
| `auth.tsx` | `/auth` | Sign-in/sign-up page. Email+password (Zod-validated) via Supabase Auth, Google OAuth via Lovable Cloud Auth, "forgot password" flow (`resetPasswordForEmail`). Redirects authenticated users to `/`. |
| `reset-password.tsx` | `/reset-password` | Password-recovery landing page; detects Supabase recovery token in URL hash and lets the user set a new password (`supabase.auth.updateUser`), then signs out and redirects to `/auth`. |
| `admin.tsx` | `/admin` | Legacy/simple admin panel: lists all accounts (via `listAccounts`) and their libraries (via `listLibrariesForAccount`), gated by `checkIsAdmin`. Shows 404 to non-admins. |
| `_authenticated/route.tsx` | layout for all authenticated pages | `beforeLoad` guard redirects to `/auth` if no Supabase session; wraps children in `AppShell`, subscribes to auth-state changes (forces redirect on sign-out), and calls `useRealtimeRefresh()`. |
| `_authenticated/index.tsx` | `/` | **Overview/dashboard**: KPI cards (active libraries, total active ads, leader library, collections in last hour), an evolution area chart (7/14/30-day toggle) of daily active-ad sums, "Top 10 most scaled" ranking, and "movers in last hour" list with up/down trend badges. |
| `_authenticated/bibliotecas.tsx` | `/bibliotecas` | **Libraries list**: search/filter (by niche, language, status) and grid/list view of all monitored ad libraries; "Add library" modal; manual "Update now" button that calls `triggerCollection`. |
| `_authenticated/biblioteca.$id.tsx` | `/biblioteca/:id` | **Library detail** (604 lines): per-library charts (active ads over time, hourly trend), snapshot history table, top creatives gallery, edit/refresh actions. |
| `_authenticated/painel.tsx` | `/painel` | **Admin panel** (892 lines, admin-only via `checkIsAdmin`): tabs for *APIs* (Firecrawl/ScraperAPI key pool status, credits, add/remove/toggle keys), *Contas* (per-account usage ranking/date-range stats), *Membros* (list members, grant/revoke admin role, set per-user library limits, ban/unban). |
| `_authenticated/perfil.tsx` | `/perfil` | **Profile page** (320 lines): view/update display name & avatar (Supabase Storage upload), change email/password, delete-account flow (`deleteMyAccount`). |
| `_authenticated/configuracoes.tsx` | `/configuracoes` | **Settings page** (397 lines): niche management (CRUD via `useNiches`/`useCreateNiche`/etc.), demo-data seeding/clearing (`seedDemoData`/`clearDemoData`), manual collection trigger, admin check for privileged actions. |
| `api/public/hooks/heartbeat-7f3a9b2e8c1d4a6b.ts` | `POST /api/public/hooks/heartbeat-7f3a9b2e8c1d4a6b` | **Obscured cron webhook**: authenticated via a static `apikey` header matching `SUPABASE_PUBLISHABLE_KEY`; triggers `runCollection()` in the background (uses `EdgeRuntime.waitUntil` when available) for scheduled/cron-driven scraping (e.g. pg_cron). Returns 404 to any unauthorized/GET request. |

Routing conventions documented in `src/routes/README.md`: file-based routing only, `$param` dynamic segments, `_layout` prefix for pathless layouts, `__root.tsx` app shell, auto-generated `routeTree.gen.ts`.

---

## Components

### Layout
- `src/components/layout/app-shell.tsx` — main authenticated shell: responsive sidebar/mobile sheet navigation (`Visão Geral`, `Bibliotecas`, `Perfil`, `Painel` [admin-only], `Configurações`), theme toggle, language switcher, sign-out, "Add library" quick action, admin-badge check via `checkIsAdmin`.

### Feature components
- `add-library-modal.tsx` — dialog/form to register a new Meta Ad Library URL to monitor (niche, language, notes, baseline).
- `count-up.tsx` — animated numeric counter used for KPI cards.
- `library-card.tsx` — card summarizing a library's stats (active ads, niche, status, last capture) + `HourlyTrendBadge` sub-component showing up/down/flat trend arrows.
- `language-switcher.tsx` — pt/en/es language selector (full and compact variants), backed by `useT`/`useLang` from `src/lib/i18n.tsx`.
- `theme-provider.tsx` — light/dark theme context (app defaults to dark).

### UI primitives (`src/components/ui/`)
shadcn/ui-style wrappers around Radix primitives: `accordion`, `alert`, `alert-dialog`, `aspect-ratio`, `avatar`, `badge`, `breadcrumb`, `button`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `form`, `hover-card`, `input`, `input-otp`, `label`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner` (toaster), `switch`, `table`, `tabs`, `textarea`, `toggle`, `toggle-group`, `tooltip`.

---

## Hooks (`src/hooks/`)

| Hook file | Exports | Description |
| --- | --- | --- |
| `use-auth.ts` | `useAuth()`, `signOut()` | Tracks Supabase session/user via `onAuthStateChange` + `getSession`; `signOut` wraps `supabase.auth.signOut()`. |
| `use-libraries.ts` (343 lines) | `useLibrariesLatest`, `useLibraryTrend`, `useHourlyTrend`, `useDailyStats`, `useDailyStatsForLibrary`, `useLibrary`, `useLibrarySnapshots`, `useLibrarySnapshotsHistory`, `useTopCreatives`, `useNiches`, `useCreateNiche`, `useUpdateNiche`, `useDeleteNiche`, etc. | TanStack Query hooks wrapping reads/writes against Supabase tables/views: `library_latest`, `library_trend`, `snapshots`, `creatives`, `niches`, `daily_library_stats`. Poll on short intervals (1–5 min) and compute hourly deltas client-side. |
| `use-mobile.tsx` | `useIsMobile()` | Media-query hook for responsive breakpoints (drives mobile nav sheet). |
| `use-profile.ts` | `useProfile`, `useUpdateProfile`, `useUploadAvatar` | Query/mutations for the `profiles` table and Supabase Storage `avatars` bucket. |
| `use-realtime-refresh.ts` | `useRealtimeRefresh()` | Subscribes to Supabase Realtime `postgres_changes` on `snapshots` (INSERT), `libraries` (ALL), `creatives` (INSERT), `niches` (ALL) and selectively invalidates the relevant React Query cache keys — enables live-updating dashboards without polling. |

---

## Server functions (`src/lib/*.functions.ts`, TanStack Start `createServerFn`)

All privileged functions are wrapped with the `requireSupabaseAuth` middleware (`src/integrations/supabase/auth-middleware.ts`), which validates a Bearer JWT via `supabase.auth.getClaims()` and injects `{ supabase, userId, claims }` into context. Admin-only functions additionally call `has_role(_user_id, _role: 'admin')` RPC.

- **`collect.functions.ts`** → `triggerCollection` — POST server fn, user-scoped; manually invokes `runCollection()` from `collect.server.ts` for the caller's libraries (or one library by id).
- **`admin.functions.ts`** → `checkIsAdmin`, `listAccounts`, `listLibrariesForAccount` — admin dashboard data: lists all Supabase Auth users (`supabaseAdmin.auth.admin.listUsers`) with per-user library counts, and libraries for a selected account.
- **`admin-keys.functions.ts`** → `getApiPoolStatus`, `getUsageRanking`, `addApiKey`, `deleteApiKey`, `toggleApiKey` — manages a pool of Firecrawl/ScraperAPI keys (env-based `FIRECRAWL_API_KEY[_2..4]`/`SCRAPERAPI_KEY[_2..3]` plus DB-stored custom keys in `api_keys` table), checks credits/latency/working status for failover.
- **`admin-members.functions.ts`** → `listMembers`, `setAdminRole`, `setLibraryLimit`, `banMember`, `unbanMember`, `getUsageRangeStats` — member management: grant/revoke admin (`user_roles`), per-user library quota, ban/unban via Supabase Admin API, usage stats over a date range. Hardcodes an `OWNER_EMAIL` as a protected super-admin.
- **`account.functions.ts`** → `deleteMyAccount` — self-service account deletion: removes owned libraries/niches, avatar storage files, then deletes the `auth.users` row (cascades to `profiles`/`snapshots`/`creatives` via FK).
- **`seed.functions.ts`** → `seedDemoData`, `clearDemoData` — inserts/removes 3 demo libraries with ~14 days of fabricated snapshot/creative history so the dashboard has data before the real collector runs.
- **`collect.server.ts`** (871 lines, server-only, imported dynamically) → `runCollection()` — the core scraping/aggregation engine (see Collector section below). Exports `CollectReport`/`PageBreakdown` types used by the UI.

---

## Backend (Supabase)

### Database schema (from `supabase/migrations/*.sql`, 25 migrations)

**Tables**
| Table | Purpose |
| --- | --- |
| `libraries` | Monitored Meta Ad Library search URLs (search term / page name, niche, language, status: active/paused/archived, baseline, notes, `created_by`, per-user ownership). |
| `snapshots` | Point-in-time capture results per library: `active_ads_count`, `unique_creatives`, `top_creative_*`, `total_results_text`, `scrape_ok`, `error_message`, `captured_at`. Written by the collector using the service-role key (bypasses RLS). |
| `creatives` | Individual ad creatives discovered per snapshot: `ad_archive_id`, `creative_hash`, `media_type`, `preview_url`, `body_text`, `duplicate_count`. |
| `niches` | User-defined niche/category tags for organizing libraries. |
| `profiles` | User profile data (display name, avatar URL) linked to `auth.users`. |
| `user_roles` | Role assignments (e.g. `admin`) used for RBAC. |
| `api_keys` | Custom/pooled Firecrawl & ScraperAPI keys added via the admin panel (label, provider, key, active flag). |

**Views**
- `library_latest` — latest snapshot joined per library (drives the dashboard/list).
- `library_trend` — trend comparison between the two most recent successful snapshots per library.
- `daily_library_stats` — daily-aggregated stats (e.g. `avg_active_ads`) per library/day, used for the evolution chart.

**Database functions (RPC)**
- `has_role(_user_id, _role)` — role-check used for admin gating across all admin server functions.
- `purge_old_snapshots(days)` — retention/cleanup RPC (service-role only) to delete snapshot history older than N days; documented for periodic cron use in `collector/README.md`.

**Row-Level Security & auth**
- Supabase Auth (`auth.users`) is the identity source; `requireSupabaseAuth` middleware validates JWTs server-side for every privileged server function.
- Tables are RLS-protected; `snapshots`/`creatives` are designed to accept writes only from the **service role** (collector and server-side `collect.server.ts`), while user-facing reads go through the anon/publishable key and RLS scoping by `created_by`/`owner_id`.
- Admin capabilities gated by `user_roles` + `has_role` RPC (not a hardcoded flag), with an additional hardcoded owner-email safety net in `admin-members.functions.ts`.
- Password recovery, Google OAuth (via Lovable Cloud Auth `@lovable.dev/cloud-auth-js`), and email/password sign-up/sign-in are all supported (see `auth.tsx`, `reset-password.tsx`).

**Migrations** live in `supabase/migrations/` (25 timestamped SQL files, `20260617...` through `20260620...`), configured via `supabase/config.toml`. They incrementally build the tables/views/RPCs/RLS policies/roles above.

### Supabase client integration (`src/integrations/supabase/`)
- `client.ts` — browser Supabase client (anon/publishable key).
- `client.server.ts` — server-only `supabaseAdmin` client using the service-role key, for privileged operations (user management, cross-account admin reads, storage cleanup).
- `auth-middleware.ts` — `requireSupabaseAuth`, a TanStack Start server middleware validating Bearer JWTs via `getClaims()`.
- `auth-attacher.ts` — attaches the current session's access token to outgoing requests (auto-generated helper).
- `types.ts` — auto-generated database types (`Database`, `Tables`, `TablesInsert`, etc.) from the Supabase schema.
- `src/integrations/lovable/index.ts` — wraps `@lovable.dev/cloud-auth-js` for OAuth (Google/Apple/Microsoft/Lovable) sign-in, syncing tokens into the Supabase client session.

---

## Collector functionality

InsaneSpy has **two** scraping paths:

1. **External standalone collector** — `collector/collector.py`
   - Runs outside the app (local machine, VPS, GitHub Actions, cron).
   - Reads `status = 'active'` rows from `libraries` using the **service role key** (bypasses RLS).
   - Opens each Meta Ad Library URL with Playwright (headless Chromium), calls `parse_library_page()` (a stub/skeleton meant to be adapted to Meta's frequently-changing markup) to extract `active_ads_count`, unique creatives, and top-performing creative.
   - Writes results to `snapshots` (`insert_snapshot`) and `creatives` (`insert_creatives`, batched in chunks of 500).
   - CLI: `python collector.py` (single run) or `python collector.py --loop --hours 4` (continuous loop, min 60s sleep floor).
   - On failure, records `scrape_ok=false` + `error_message` so the dashboard can show a "last collection failed" badge.
   - Requires env vars `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
   - Recommended cron: every 1–4 hours (`0 */4 * * * python collector.py`), plus periodic `select public.purge_old_snapshots(90);` for retention.
   - ⚠️ README notes: respect Meta's Terms of Use/rate limits, use rotating proxies/random delays, and expect to maintain the HTML/JSON parser as Meta's page structure changes.

2. **In-app hybrid collector** — `src/lib/collect.server.ts` (871 lines, server-only)
   - Invoked either manually (`triggerCollection` server fn from the UI) or via the cron webhook `POST /api/public/hooks/heartbeat-7f3a9b2e8c1d4a6b`.
   - Strategy: **Firecrawl** renders the JS-heavy Meta Ad Library page and returns HTML + markdown + an LLM-structured JSON (schema-constrained) describing total active ads, per-page breakdowns (`PageBreakdown[]`), and creatives (Library ID, real duplicate-usage counts, preview URL, direct ad link). Falls back to a regex-based parser if the structured JSON extraction fails.
   - Manages a **pool of Firecrawl/ScraperAPI API keys** (env-configured + DB-stored via `api_keys` table) with credit/latency tracking and failover, administered from the `/painel` admin UI.
   - Produces a `CollectReport` (`libraries_total/ok/failed`, `duration_ms`, per-library `details[]`) surfaced as toast notifications in the UI (`bibliotecas.tsx`, `configuracoes.tsx`).
   - Writes to `snapshots`/`creatives` using the service-role admin client (`getAdmin()` in `collect.server.ts`), keeping the same schema as the external collector.

---

## Notable features

- **Real-time dashboard** — Supabase Realtime subscriptions auto-refresh charts/lists on new snapshots/creatives without polling (`use-realtime-refresh.ts`).
- **Trend detection** — hourly and daily trend computations (up/down/flat badges) comparing consecutive snapshots per library.
- **Multi-provider scraping with failover** — Firecrawl + ScraperAPI key pool with credit/latency monitoring and automatic failover, manageable from an admin UI.
- **Role-based admin console** (`/painel`) — API pool health, per-account usage ranking with custom date ranges, member management (admin grant/revoke, per-user library limits, ban/unban), protected owner account.
- **Demo data seeding** — one-click seed/clear of realistic fake libraries + 14-day snapshot history for showcasing the dashboard without a live collector.
- **i18n** — custom pt/en/es translation system (`src/lib/i18n.tsx`, `LanguageProvider`/`useT`/`useLang`), persisted to `localStorage`.
- **Dark-mode-first UI** with glassmorphism cards, Framer Motion micro-animations, animated count-up KPIs, and Recharts-based area/bar/pie/line charts.
- **Obscured cron endpoint** — the collection webhook uses a randomized, hard-to-guess path plus a shared-secret `apikey` header (rather than a discoverable `/collect` route) to deter unauthorized scraping triggers.
- **Self-service account lifecycle** — avatar upload, profile editing, and full account deletion (cascading cleanup of libraries/niches/storage/auth user).
- **Google OAuth via Lovable Cloud Auth**, layered on top of native Supabase email/password auth and password-recovery flow.
