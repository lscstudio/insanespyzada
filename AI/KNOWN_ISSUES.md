# KNOWN_ISSUES — Bugs, Débito Técnico e Workarounds

> Atualizado automaticamente. Última atualização: 25 Jul 2026.

## Bugs Conhecidos

### B1 — ScraperAPI bloqueia facebook.com
- **Status**: Definitivo (não é bug, é TOS)
- **Sintoma**: HTTP 403 "Scraping this url is not allowed"
- **Workaround**: Usar Firecrawl (cadastrar chave válida no Admin → keys)
- **Arquivo**: `src/lib/collect.server.ts` — trata como erro definitivo sem retry

### B2 — Bibliotecas de teste duplicadas
- **Status**: Pendente limpeza
- **Sintoma**: IDs `4932...` e `b438...` são a mesma URL adicionada 2x
- **Fix**: Deletar uma das duplicadas após confirmar com usuário

## Débito Técnico

### T1 — ~211 erros TypeScript pré-existentes
- **Causa**: Tipos locais do Supabase `Database` não incluem tabelas SPA (`notifications`, `dashboards`, `library_flags`, `subscriptions`, `payments`, `swipe_favorites`)
- **Workaround**: Casts com `as never` no build. Tipos locais definidos no store.tsx
- **Checagem**: `bunx tsc --noEmit 2>&1 | wc -l` — baseline ~211, não deve aumentar
- **Fix completo**: Regenerar tipos do Supabase incluindo todas as tabelas

### T2 — Scaffold Lovable não usado
- **Arquivos**: `src/components/`, `src/hooks/`, `src/lib/*.functions.ts`
- **Status**: Vestigiais — SPA não importa deles
- **Risco**: Confusão sobre qual arquivo editar
- **Fix**: Avaliar remoção após confirmar que nada os referencia

### T3 — `uri_allow_list` do Supabase Auth concatenada
- **Status**: Não impacta email/senha
- **Sintoma**: URLs sem separadores reais
- **Fix**: Revisar junto com Google OAuth

### T4 — `console.log` de debug podem existir
- **Status**: Aceitável temporariamente
- **Fix**: Limpar antes de produção final

## Gambarras Temporárias

### W1 — Casts `as never` no build Vite
- **Local**: Vários arquivos
- **Motivo**: Contornar erros TS de tipos não gerados
- **Quando remover**: Após regenerar tipos do Supabase (T1)

### W2 — Tipos DB locais no store.tsx
- **Local**: `src/spa/lib/store.tsx` (linhas 35-130+)
- **Motivo**: Tipos não gerados pelo Supabase para tabelas SPA
- **Quando remover**: Após regenerar tipos (T1)

## TODOs Importantes

### TODO-1 — Google OAuth
- Configurar Google Cloud Console (Client ID + Secret)
- Habilitar `external_google_enabled` no Supabase
- Botão já existe em `src/spa/pages/Auth.tsx`

### TODO-2 — Vercel Preview env vars
- Popular as 5 vars Supabase no environment Preview

### TODO-3 — Projeto Supabase antigo
- `pvsetbavfgvdaatyiqml` (East US) ainda existe
- Confirmar com usuário antes de deletar

### TODO-4 — Extração de vídeo MP4
- Plano DIAMOND promete "Extração de vídeo (MP4 real)"
- Não implementado ainda

### TODO-5 — Dashboards temáticos UI
- Tabelas `dashboards` + `dashboard_libraries` existem no schema
- `store.tsx` tem `syncDashboards()`
- UI não implementada (há redirect `/dashboards` → `/configuracoes`)

## Limitações Atuais

- Supabase free plan (sem pg_cron → coleta periódica é client-side)
- Sem SSR (SPA puro, `ssr: false`)
- Sem testes automatizados
- Sem CI/CD além do Vercel auto-deploy
