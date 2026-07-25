# AI_INDEX — InsaneSpy

> Índice mestre. Carregado automaticamente a cada chat via opencode.json.
> Leia este arquivo primeiro. Nunca carregue tudo — use lazy loading por tarefa.

## O Projeto

**InsaneSpy** — dashboard de monitoramento de bibliotecas de anúncios da Meta Ad Library.
Espiona concorrentes no Facebook/Instagram, coleta snapshots de anúncios ativos, detecta escalação e exibe trends.

- **URL produção**: https://insanespyzada.vercel.app
- **Repo**: https://github.com/lscstudio/insanespyzada (branch `main`)
- **Supabase**: projeto `yigyythppceqyjhxzsav`, região SP (`sa-east-1`)
- **Deploy**: Vercel, push em `main` → deploy automático (~25s)

## Stack Resumida

| Camada | Tecnologia |
|--------|-----------|
| Framework | TanStack Start + Nitro + Vite 8 |
| Frontend | React 19, Tailwind CSS v4, shadcn/Radix UI, Framer Motion, Recharts |
| Roteamento | TanStack Router (file-based, `src/routes/`) |
| Data | TanStack Query + Supabase JS |
| Auth | Supabase Auth (email/senha + Google OAuth via Lovable Cloud Auth) |
| Backend | Supabase Postgres + RLS + Server Functions (`createServerFn`) |
| Coletor interno | `collect.server.ts` (Firecrawl/ScraperAPI pool) |
| Coletor externo | `collector/collector.py` (Playwright, standalone) |
| i18n | Custom pt/en/es (`src/lib/i18n.tsx`) |
| Build config | `@lovable.dev/vite-tanstack-config` (não adicionar plugins manualmente) |

## Documentação por Tarefa

| Tarefa | Arquivo |
|--------|---------|
| Entender arquitetura geral | `AI/docs/architecture.md` |
| Navegar pastas e arquivos | `AI/docs/folder-map.md` |
| Domínio e conceitos do negócio | `AI/docs/domain.md` |
| Schemas, tabelas, views, RPC | `AI/docs/architecture.md` (seção DB) |
| Padrões de código (hooks, server fns) | `AI/docs/patterns.md` |
| Convenções TypeScript/React | `AI/docs/coding-standards.md` |
| Integrações externas | `AI/docs/integrations.md` |
| Fluxo de dados e coleta | `AI/docs/data-flow.md` |
| Estado atual / pendências | `HANDOFF.md` (SEMPRE ler ao iniciar) |

## Skills Disponíveis (carregar on-demand)

| Skill | Quando usar |
|-------|------------|
| `project-architect` | Entender/explicar arquitetura, stack, dependências |
| `smart-context-loader` | **ANTES DE QUALQUER TAREFA** — identificar arquivos mínimos |
| `planning-engine` | Antes de implementar qualquer feature ou fix |
| `domain-knowledge` | Conceitos internos: Library, Snapshot, Creative, Plano, Swipe, Score |
| `security-reviewer` | Revisar auth, RLS, endpoints, secrets |
| `performance-auditor` | Revisar queries, N+1, cache, renders |
| `token-optimizer` | Regras de economia de contexto |
| `final-reviewer` | Após qualquer implementação — revisar bugs, tipos, segurança |

## Regras Críticas (sempre ativas)

1. **Nunca** adicionar plugins Nitro/TanStack manualmente ao `vite.config.ts` — quebra o build.
2. **Nunca** importar `supabaseAdmin` (`client.server.ts`) no bundle do cliente.
3. **Nunca** commitar `.env`, `.env.local`, `.env.local.secrets`.
4. **Sempre** após qualquer alteração: lint → build → commit → `git push origin main` → atualizar `HANDOFF.md`.
5. TypeScript tem ~211 erros pré-existentes (tipos SPA). Checar regressão: `bunx tsc --noEmit 2>&1 | wc -l` deve ser igual antes/depois.
6. `schema` do banco = `supabase/migrations/` (27 arquivos SQL). Alterações via Supabase Management API (CLI não funciona neste projeto).
7. `OWNER_EMAIL` em `admin-members.functions.ts` é o super-admin protegido — nunca remover essa proteção.

## Comandos Essenciais

```bash
bun dev                         # dev local (aponta ao cloud Supabase)
bun run build                   # build produção
bun run lint                    # ESLint
bun run format                  # Prettier
git status -sb && git log --oneline -5 && cat HANDOFF.md  # início de sessão
bunx tsc --noEmit 2>&1 | wc -l  # contar erros TS (baseline ~211)
curl -sI https://insanespyzada.vercel.app  # checar deploy
```

## Auto-atualização

Quando o projeto mudar significativamente (novos módulos, tabelas, padrões, integrações):
1. Atualizar o doc relevante em `AI/docs/`
2. Atualizar `HANDOFF.md` com o estado novo
3. Atualizar este índice se necessário
