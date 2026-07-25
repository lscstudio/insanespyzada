# DECISIONS — Log de Decisões Arquiteturais

> Cada decisão registrada aqui NÃO deve ser desfeita sem discussão explícita com o usuário.
> Evita que futuras IAs proponham refazer trabalho ou reverter decisões importantes.

## D1 — SPA ao invés de file-based routing (TanStack Router)

- **Data**: ~Jun 2026
- **Problema**: App precisa de client-side routing com auth guards e state compartilhado
- **Alternativas**: TanStack Router file-based (`src/routes/_authenticated/`) vs react-router-dom SPA
- **Decisão**: SPA com react-router-dom em `src/spa/App.tsx`, montado via catch-all (`$.tsx`)
- **Motivo**: O app foi originalmente construído como SPA pela Lovable. Migrar para file-based exigiria reescrever todas as páginas, guards e layout.
- **Impacto**: `ssr: false` no root. TanStack Router só gerencia shell HTML + API routes.
- **Trade-off**: Perde SSR/SSG para páginas, mas ganha simplicidade. SEO não é prioridade (app autenticado).

## D2 — Context Store ao invés de TanStack Query

- **Data**: ~Jun 2026
- **Problema**: Gerenciamento de state client-side
- **Alternativas**: TanStack Query (hooks em `src/hooks/`) vs React Context central
- **Decisão**: `StoreProvider` em `src/spa/lib/store.tsx` (Context + useState + fetch direto)
- **Motivo**: O SPA precisa de state compartilhado entre páginas (theme, toasts, session, libraries). Context centraliza tudo. Realtime invalida via sync functions internas.
- **Impacto**: `src/hooks/` (TanStack Query) ficou como scaffold não usado
- **Trade-off**: Perde cache automático do TanStack Query, mas ganha controle total do state

## D3 — Firecrawl ao invés de ScraperAPI para Meta Ad Library

- **Data**: 25 Jul 2026
- **Problema**: ScraperAPI bloqueia facebook.com por TOS (HTTP 403 "Scraping this url is not allowed")
- **Alternativas**: ScraperAPI, Firecrawl, Playwright direto
- **Decisão**: Firecrawl como scraper principal (renderiza JS + extrai JSON via LLM)
- **Motivo**: Meta Ad Library é JS-heavy. Firecrawl renderiza e extrai dados estruturados. ScraperAPI definitivamente não funciona para facebook.com.
- **Impacto**: ScraperAPI mantido como fallback para domínios não-Facebook apenas
- **Trade-off**: Firecrawl custa mais, mas é a única opção que funciona

## D4 — Migrations via Management API (não CLI Supabase)

- **Data**: 25 Jul 2026
- **Problema**: `supabase db push` conectava no projeto antigo, não no atual
- **Alternativas**: CLI Supabase, Management API via curl/Python
- **Decisão**: Management API com header `User-Agent: supabase-migrator/1.0` (bypassa WAF Cloudflare 1010)
- **Motivo**: CLI não funcionava linkada ao projeto correto
- **Impacto**: Migrations aplicadas via script, não CLI
- **Trade-off**: Menos ergonomia, mas funciona

## D5 — Coleta periódica client-side

- **Data**: ~Jul 2026
- **Problema**: pg_cron não roda no Supabase free plan
- **Alternativas**: pg_cron, webhook cron externo, client-side interval
- **Decisão**: O próprio navegador dispara `fetch("/api/collect")` a cada `pushIntervalMin`
- **Motivo**: Free plan não tem pg_cron. Webhook obscurecido existe como backup.
- **Impacto**: Coleta só roda se usuário tem aba aberta
- **Trade-off**: Simplicidade vs confiabilidade. Aceitável para estágio atual.

## D6 — Webhook cron com caminho obscurecido

- **Data**: ~Jun 2026
- **Problema**: Endpoint de coleta cron precisa ser protegido
- **Alternativas**: API key simples, caminho obscuro + apikey header
- **Decisão**: Caminho randomizado (`/api/public/hooks/heartbeat-7f3a9b2e8c1d4a6b`) + header `apikey` = `SUPABASE_PUBLISHABLE_KEY`
- **Motivo**: Caminho obscuro adiciona camada extra de proteção além da key
- **Trade-off**: Segurança por obscuridade não é ideal, mas é suficiente para o caso

## D7 — OWNER_EMAIL hardcoded como super-admin

- **Data**: ~Jun 2026
- **Problema**: Proteger conta principal contra auto-ban ou perda de admin
- **Alternativas**: Apenas `has_role` no DB, flag hardcoded extra
- **Decisão**: `OWNER_EMAIL` hardcoded em `admin-members.functions.ts` como proteção extra
- **Motivo**: Garantia de que o owner nunca perde acesso, mesmo se DB for modificado
- **Trade-off**: Email hardcoded no código (não é ideal, mas é segurança)

## D8 — UI primitivos em arquivo único (ui.tsx)

- **Data**: ~Jun 2026
- **Problema**: shadcn/ui gera 37+ arquivos de componentes, muito contexto
- **Alternativas**: shadcn directory (`src/components/ui/`), arquivo único custom
- **Decisão**: `src/spa/components/ui.tsx` com todos os primitivos (Badge, Button, Card, etc.)
- **Motivo**: SPA tem design system próprio, não precisa do shadcn completo
- **Impacto**: `src/components/ui/` (shadcn) ficou como scaffold não usado
- **Trade-off**: Arquivo maior, mas muito menos arquivos para manter
