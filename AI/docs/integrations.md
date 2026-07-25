# InsaneSpy — Integrações Externas

## Supabase

- **Projeto**: `yigyythppceqyjhxzsav` (SP, sa-east-1, free plan)
- **Painel**: https://supabase.com/dashboard/project/yigyythppceqyjhxzsav
- **Auth**: email/senha (autoconfirm=true), Google OAuth pendente
- **Realtime**: 11 tabelas subscritas (snapshots, libraries, creatives, niches, library_flags, dashboards, dashboard_libraries, notifications, subscriptions, payments, swipe_favorites)
- **Storage**: bucket `avatars`
- **Migrations**: via Management API (CLI não funciona). Header `User-Agent: supabase-migrator/1.0`. Token em `.env.local.secrets`

## Vercel

- **URL**: https://insanespyzada.vercel.app
- **Deploy**: automático push `main` (~25s)
- **Env vars**: 5 vars Supabase (production + development). Preview sem vars.
- **CLI**: logado como `davizink`

## GitHub

- **Repo**: https://github.com/lscstudio/insanespyzada (branch `main`)
- **CLI**: `gh` logado como `lscstudio`
- **Regra Lovable**: nunca force push/rebase/amend de commits pushados

## Firecrawl

- Scraper principal para Meta Ad Library (renderiza JS, extrai JSON via LLM)
- Pool em tabela `api_keys` + env vars `FIRECRAWL_API_KEY[_2..4]`
- Gerenciado em `/admin` → tab "keys"
- ⚠️ Usuário precisa cadastrar chave válida (pendência)

## ScraperAPI

- **NÃO funciona para facebook.com** (bloqueio TOS, HTTP 403)
- Fallback para domínios não-Facebook
- "URL not allowed" = erro definitivo, sem retry
- Keys: env `SCRAPERAPI_KEY[_2..3]` + tabela `api_keys`

## Lovable Cloud Auth

- `@lovable.dev/cloud-auth-js` — Google OAuth (e potencialmente Apple/Microsoft)
- Sincroniza tokens OAuth com sessão Supabase
- Botão "Entrar com Google" em `src/spa/pages/Auth.tsx`
- Configuração pendente: Google Cloud Console + `external_google_enabled` no Supabase

## Lovable Platform

- Projeto conectado a Lovable (https://lovable.dev)
- `src/integrations/lovable/` — auto-gerado
- `vite.config.ts` usa `@lovable.dev/vite-tanstack-config`
- Commits em `main` sincronizam para o editor

## Python Collector (externo)

- `collector/collector.py` — Playwright + supabase-py
- Requer `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- `playwright install chromium` na primeira instalação
- Cron: `0 */4 * * * python collector.py`
