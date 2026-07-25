# InsaneSpy — Integrações Externas

## Supabase

- **Projeto**: `yigyythppceqyjhxzsav` (SP, sa-east-1, free plan)
- **Painel**: https://supabase.com/dashboard/project/yigyythppceqyjhxzsav
- **Auth**: email/senha (autoconfirm=true), Google OAuth pendente
- **Realtime**: subscriptions em `snapshots`, `libraries`, `creatives`, `niches`
- **Storage**: bucket `avatars` para fotos de perfil
- **Management API**: para aplicar migrations (CLI não funciona neste projeto)
  - Requer `SUPABASE_ACCESS_TOKEN` (salvo em `.env.local.secrets`, gitignored)
  - Header `User-Agent: supabase-migrator/1.0` (bypassa WAF Cloudflare 1010)

## Vercel

- **Projeto**: `davizinks-projects/insanespyzada`
- **URL**: https://insanespyzada.vercel.app
- **Deploy**: automático a cada push em `main` (~25s)
- **Env vars configuradas** (production + development): 5 vars do Supabase
- **Preview**: sem env vars — necessário popular se usar PRs
- **CLI**: `vercel` logado como `davizink`

## GitHub

- **Repo**: https://github.com/lscstudio/insanespyzada
- **Branch**: `main`
- **CLI**: `gh` logado como `lscstudio`
- **Regra Lovable**: nunca force push, rebase ou amend de commits já pushados

## Firecrawl

- **Papel**: scraper principal para Meta Ad Library (JS-heavy)
- **Por quê**: renderiza JS, extrai JSON estruturado via LLM, funciona com facebook.com
- **API keys**: pool em tabela `api_keys` + env vars `FIRECRAWL_API_KEY[_2..4]`
- **Gerenciamento**: painel Admin → aba APIs
- **⚠️ Ação pendente**: usuário precisa cadastrar chave Firecrawl válida

## ScraperAPI

- **Status**: NÃO funciona para facebook.com (bloqueio TOS, HTTP 403)
- **Uso atual**: fallback para domínios não-Facebook (se houver)
- **Tratamento**: "ScraperAPI URL not allowed" = erro definitivo, sem retry
- **Keys**: env `SCRAPERAPI_KEY[_2..3]` + tabela `api_keys`

## Lovable Cloud Auth (`@lovable.dev/cloud-auth-js`)

- Gerencia Google OAuth (e potencialmente Apple/Microsoft)
- Sincroniza tokens OAuth com sessão Supabase
- Botão "Entrar com Google" em `src/spa/pages/Auth.tsx` já existe
- Configuração pendente: Google Cloud Console + `external_google_enabled` no Supabase

## Lovable Platform

- Projeto conectado a Lovable (https://lovable.dev)
- `src/integrations/lovable/` — auto-gerado
- Commits em `main` sincronizam para o editor Lovable
- **NUNCA** force push ou rebase de commits publicados

## py Collector (Externo)

- `supabase-py`, `playwright`, `python-dateutil`
- Requer `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- `playwright install chromium` na primeira instalação
- Endpoint de diagnóstico: `GET /api/collect/diagnostic` (com `?reset=1` para limpar caches)
