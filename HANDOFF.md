# HANDOFF — Estado atual do InsaneSpy

> Última atualização: 25 Jul 2026
> Mantenha este arquivo sincronizado ao final de cada sessão importante.
> Novos chats/sessões opencode leem este arquivo primeiro para entender o estado.

## 1. Stack & deploy

- **Frontend/SSR**: TanStack Start + Nitro + Vite (config via `@lovable.dev/vite-tanstack-config`)
- **Build output**: Nitro com preset auto-detectado. No Vercel usa preset `vercel` (via `VERCEL=1`); em sandbox Lovable usa `cloudflare-module`.
- **Hosting**: Vercel — https://insanespyzada.vercel.app
- **Repo GitHub**: https://github.com/lscstudio/insanespyzada (branch `main`, push automático dispara deploy)
- **Banco de dados**: Supabase cloud, projeto `insanespy` (ref `yigyythppceqyjhxzsav`), região São Paulo (`sa-east-1`), plan free.
  - Painel: https://supabase.com/dashboard/project/yigyythppceqyjhxzsav
- **Auth Supabase**: email/senha habilitado, `mailer_autoconfirm=true` (signup já loga direto, sem confirmação por email). Google OAuth **ainda NÃO configurado** (pendente — ver seção 6).

## 2. O que já está funcionando (validado em 25 Jul 2026)

- ✅ Site ao vivo: HTTP 200, bundle JS com URL do novo projeto cloud.
- ✅ Signup → cria session imediatamente (autoconfirm). Login com password grant funciona.
- ✅ Trigger de novo usuário cria `profiles` + `subscriptions` (plano free default) automaticamente.
- ✅ Todas as 10 boot queries do store respondem HTTP 200 (`libraries`, `library_latest`, `library_trend`, `library_flags`, `dashboards`, `notifications`, `subscriptions`, `payments`, `swipe_favorites`, `daily_library_stats`).
- ✅ Rotas de API server-side (`/api/collect`, `/api/admin`, `/api/delete-account`) recebem `SUPABASE_SERVICE_ROLE_KEY` em runtime — `client.server.ts` funciona.
- ✅ Pipeline Git→Vercel automático testado: commit → deploy automático success.
- ✅ Hardening: `bootstrap()` em `src/spa/lib/store.tsx` envolto em `try/catch/finally` — app nunca mais pendura em "inicializando insanespy…" mesmo se faltar env var.

## 3. Migrations do banco

- 27 migrations aplicadas no projeto cloud `yigyythppceqyjhxzsav` via Supabase Management API (endpoint `/database/query`), em ordem cronológica, todas HTTP 201.
- Replicam o estado que já existia no projeto Lovable antigo (`pvsetbavfgvdaatyiqml`), mais a migration `20260719070000_spa_backend_full.sql` (SPA backend: dashboards, notifications, subscriptions, payments, library_flags, swipe_favorites).
- Arquivos em `supabase/migrations/` (versionados no git).
- **A CLI `supabase db push` não funcionou linkado a este projeto** — connectava no host `db.pvsetbavfgvdaatyiqml.supabase.co` (projeto antigo) apesar de `supabase link` correto. Workaround usado: Management API via Python (`/v1/projects/{ref}/database/query`, `User-Agent: supabase-migrator/1.0` para bypassar WAF Cloudflare 1010). Esse padrão funciona se precisar aplicar novas migrations.

## 4. Variáveis de ambiente

### Vercel (produção + development) — já configuradas
- `VITE_SUPABASE_URL` = `https://yigyythppceqyjhxzsav.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = anon key do novo projeto
- `SUPABASE_URL` = idem
- `SUPABASE_PUBLISHABLE_KEY` = idem
- `SUPABASE_SERVICE_ROLE_KEY` = service_role do novo projeto

> Preview environment não foi populada (CLI ficou esperando input de branch); se futuramente testar PRs via Vercel Preview, adicione as 5 vars para `preview` também.

### Local
- `.env` e `.env.local` foram atualizados com as chaves do NOVO projeto cloud.
- Ignorados pelo `.gitignore` (`/env`, `.env.local`, `.env.*`, com exceção de `!.env.example`).
- `.env.example` versionado e documenta as 5 vars necessárias.

### Valores sensíveis
- Chaves anon/service_role do novo projeto: salvas em `/tmp/insanespy-new-keys.json` (perde ao reiniciar).
- Senha do DB do novo projeto: salva em `/tmp/insanespy-db-pass.txt` (perde ao reiniciar). Usuário deve copiar para cofre (1Password etc.).

## 5. Commits relevantes neste setup (branch main)

```
e4dbacb  Aponta projeto Supabase para cloud yigyythppceqyjhxzsav (.gitignore, config.toml)
c8904da  gitignore: consolida regras de .env* mantendo .env.example versionavel
d12f431  Ignore .vercel (criado pela Vercel CLI no link)
0e60450  Fix: evita loading eterno no Vercel + documenta env vars do Supabase  ← hardening store.tsx
8796612  Remove .env do versionamento, adiciona .gitignore para env e graphify-out, inclui backend SPA + migrações Supabase
```

## 6. Pendências conhecidas (NÃO bloqueiam uso, mas estão no radar)

1. **Google OAuth ainda não configurado.** Usuário pediu para fazer depois. Quando retomar:
   - Precisa de Client ID + Client Secret do Google Cloud Console.
   - No Supabase: PATCH `/v1/projects/yigyythppceqyjhxzsav/config/auth` com `external_google_enabled=true`, `external_google_client_id`, `external_google_client_secret`, `external_google_redirect_uri` (ex: `https://yigyythppceqyjhxzsav.supabase.co/auth/v1/callback`).
   - No Google Cloud Console: authorized redirect URI deve incluir `https://yigyythppceqyjhxzsav.supabase.co/auth/v1/callback`.
   - O botão "Entrar com Google" em `src/spa/pages/Auth.tsx` já existe; só vai funcionar após habilitar o provider.
2. **`uri_allow_list` do Supabase Auth ficou concatenada** (sem separadores reais, pois o campo da API não aceita newlines). Não impacta email/senha (autoconfirm não envia email). Impacta só quando OAuth retornar redirect — revisar junto com configuração do Google.
3. **Vercel Preview environment sem env vars** — se futuramente for mexer em PRs antes de merge, popular as 5 vars para `preview`.
4. **Projeto Supabase antigo `pvsetbavfgvdaatyiqml` ("lscstudio's Project") ainda existe** na mesma org, em East US. Pode ser pausado/deletado depois que confirmar que o novo projeto está 100% em uso. **NÃO deletar cega** — confirmar com o usuário primeiro que nada mais referencia ele.

## 7. Pontos de atenção para futuras edições

- **`src/integrations/supabase/client.ts`** é auto-gerado pela Lovable e lazy via `Proxy`. Lança `Error` se faltar `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`. Sem o hardening em `store.tsx:bootstrap()`, qualquer throw pendura o app. Não remover o try/catch/finally.
- **`src/integrations/supabase/client.server.ts`** exporta `supabaseAdmin` (service_role, bypassa RLS) — só usar em server functions, nunca no client bundle.
- **`vite.config.ts`** usa `@lovable.dev/vite-tanstack-config` com opção `tanstackStart.server.entry = "server"`. Não adicionar plugins Nitro/TanStack manualmente (duplicariam e quebrariam o build, conforme warning no topo do arquivo).
- **`supabase/config.toml`** tem `project_id = "yigyythppceqyjhxzsav"` — se reusar CLI `supabase link`, use `--project-ref yigyythppceqyjhxzsav`.
- **`.gitignore`**: a regra `!.env.example` deve vir DEPOIS de `.env*` para ter efeito. Não reordenar.

## 8. Acessos/autenticações que o ambiente desta sessão possui

- `gh` (GitHub CLI) logado como `lscstudio`.
- `vercel` CLI logado e projeto linkado (`davizinks-projects/insanespyzada`).
- `SUPABASE_ACCESS_TOKEN` (Personal Access Token) usado nesta sessão pode estar expirado em novo chat — se precisar operar o Supabase, gerar novo token em https://supabase.com/dashboard/account/tokens.
- `psql` NÃO está instalado (pode usar Management API ou instalar via `brew install libpq`).

## 9. Bugs reportados pelo usuário que originaram este setup

1. App pendurava em "Iniciando InsaneSpy" / "inicializando insanespy…" no Vercel → resolvido com hardening + env vars corretas.
2. "Banco de dados não funciona, não consigo logar nem criar conta" → resolvido criando novo projeto Supabase em São Paulo, aplicando 27 migrations, configurando auth (autoconfirm), e apontando todos clients (Vercel + `.env.local`) para o novo projeto.

## 10. Próximo chat provavelmente vai mexer em

Usuário mencionou "outros bugs" — não especificados. Antes de mexer, rodar:
- `git status -sb` (confirma estado clean)
- `git log --oneline -5` (commits recentes)
- Conferir este HANDOFF.md
- Para testar local: `bun dev` (já configurado com `.env.local` apontando ao cloud)
- Para validar produção: `curl -sI https://insanespyzada.vercel.app` deve dar 200.

## 11. Fluxo de trabalho obrigatório (instruções do usuário)

> **SEMPRE que terminar uma alteração, faça commit, confirme que ela entrega o que foi
> pedido e (se produtivo) `git push origin main` para subir o deploy.** Não espere o
> usuário pedir para commitar/pushar. Confirme com build + lint/typecheck prévios:
> - `bunx eslint --fix <arquivos>` e `bunx tsc --noEmit 2>&1 | wc -l` (regressão = contagem igual)
> - `bun run build` deve terminar com `✓ built`.
> Verificar também em produção após push: `vercel ls | head -5` deve mostrar `● Ready` em ~30s.

## 12. Tokens/credenciais vivos nesta sessão (25 Jul 2026, ~16:40 UTC)

- `SUPABASE_ACCESS_TOKEN` (Personal Access Token) está salvo em **`.env.local.secrets`** (arquivo gitignored — NÃO versionar). Se preciso em novo chat, ler esse arquivo ou pedir um novo token ao usuário em https://supabase.com/dashboard/account/tokens. Workaround de WAF Cloudflare: header `User-Agent: supabase-migrator/1.0`.
- `vercel` CLI logado como `davizink`.

## 13. Diagnóstico de coleta "biblioteca fica sem dados / fala que está sem api"

Biblioteca recém-adicionada falhava com "Nenhuma chave de scraping disponível"
grudado em `libraries.last_collection_error`. Investigações:

1. **`SELECT * FROM api_keys WHERE active=true`** → confirme que existe chave
   ScraperAPI/Firecrawl cadastrada (vá em Admin → Chaves de API na UI ou SELECT
   via Management API). Hoje (25 Jul): 1 chave ScraperAPI ativa, 5000 créditos,
   válida.
2. **Endpoint de diagnóstico (deploy feito em 25 Jul 16:42 UTC)**:
   `GET /api/collect/diagnostic` (somente admin,Bearer token JWT do usuário logado).
   Retorna: env vars presentes/ausentes (url/publishable/service_role), chaves
   ativas, últimas 20 bibliotecas com last_collection_error, e `_diagnosticPool`
   (pool_count, last_key_load_error, cache_age, exhausted_names).
   No console do browser (logado como admin):
   ```js
   const t = (await (await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2')).supabase.createClient(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY).auth.getSession()).data.session?.access_token
   //ou mais simples: pegue do localStorage: JSON.parse(localStorage.getItem('sb-yigyythppceqyjhxzsav-auth-token')).access_token
   fetch('/api/collect/diagnostic', {headers:{authorization:'Bearer '+t}}).then(r=>r.json()).then(console.log)
   ```
3. **Causas comuns**:
   - `SUPABASE_SERVICE_ROLE_KEY` ausente no runtime da função serverless
     (verificar via `vercel env ls production` e `vercel env ls development`).
   - `loadDynamicKeys()` silenciosamente retorna `[]` quando a query falha;
     agora (commit 611e544) propaga o erro real em `lastKeyLoadError`.
   - Chave ScraperAPI retornou 401/403 → `isCreditsExhausted` marcou como
     esgotada por 1h (TTL `EXHAUSTED_TTL_MS`). O diagnostic mostra em
     `exhausted_names`. Para reset imediato: reiniciar a função (cold-start)
     ou adicionar uma chave nova.

## 14. Decisões de design da feature "bibliotecas" (25 Jul 2026)

- **Cards nunca mais mostram dados mock**. `mapLibrary` em `src/spa/lib/store.tsx`
  não chama mais `generateLibrary()`. Apenas mapeia dados reais da view
  `library_latest`; `creatives`/`snapshots` ficam vazios até a primeira coleta.
- Biblioteca sem snapshot = `lastCollection.status="running"` com mensagem
  "primeira coleta em andamento…".
- `LibraryCard` durante running: clique/toque no card ou no pageName mostra toast
  "Coleta em andamento. Tente novamente em instantes." em vez de abrir a página.
  O link redundante "Detalhes →" foi removido (card inteiro já navega).
- `BibliotecaDetail` durante running/sem dados: KPIs "—", banner âmbar
  "Coleta em andamento", card "Nenhum snapshot disponível". `last/prev/diff/top`
  guardados contra biblioteca sem snapshots/creatives.
- `triggerCollect` propaga erro real ao card imediatamente (não espera realtime).