# AI_INDEX — InsaneSpy

> Índice mestre, auto-carregado via opencode.json. Use como mapa para encontrar docs e skills.

## Projeto

**InsaneSpy** — SPA de monitoramento da Meta Ad Library. TanStack Start (shell) + react-router-dom (SPA) + Supabase. Deploy: Vercel (push main → ~25s).

- **URL**: https://insanespyzada.vercel.app
- **Repo**: https://github.com/lscstudio/insanespyzada
- **Supabase**: `yigyythppceqyjhxzsav` (SP)

## Arquitetura em 3 Linhas

SPA em `src/spa/` (react-router-dom + Context store). Shell TanStack Start (`src/routes/__root.tsx` + `$.tsx` catch-all, `ssr:false`). API routes server-side em `src/routes/api/`. Backend Supabase (14 tabelas, 3 views, 9 RPCs).

## Documentação por Tarefa

| Precisa... | Leia |
|-----------|------|
| Estado atual do projeto | `AI/PROJECT_STATE.md` |
| Bugs e débito técnico | `AI/KNOWN_ISSUES.md` |
| Por que algo foi decidido | `AI/DECISIONS.md` |
| Estado da sessão atual | `HANDOFF.md` ← **ler primeiro** |
| Entender arquitetura | `AI/docs/architecture.md` |
| Encontrar um arquivo | `AI/docs/folder-map.md` |
| Conceitos de negócio | `AI/docs/domain.md` |
| Padrões de código | `AI/docs/patterns.md` |
| Convenções TypeScript | `AI/docs/coding-standards.md` |
| Integrações externas | `AI/docs/integrations.md` |
| Fluxo de dados/coleta | `AI/docs/data-flow.md` |
| Visão geral rápida | `AI/docs/project-overview.md` |

> ⚠️ NUNCA carregar todos os docs de uma vez. Leia apenas o necessário para a tarefa.

## Skills (carregar on-demand via tool `skill`)

| Skill | Quando | Prioridade |
|-------|--------|-----------|
| `smart-context-loader` | ANTES de qualquer tarefa — identificar arquivos mínimos | MÁXIMA |
| `planning-engine` | Antes de implementar feature/fix | Alta |
| `final-reviewer` | Antes de commitar | Alta |
| `security-reviewer` | Após mexer em auth/endpoints/RLS | Alta |
| `token-optimizer` | Regras de economia (internalizar, não consultar) | Média |
| `domain-knowledge` | Conceitos do negócio | Média |
| `project-architect` | Visão arquitetural | Baixa |
| `performance-auditor` | Suspeita de lentidão | Baixa |

## Regras Críticas

1. **Nunca** force push/rebase/amend commits pushados (Lovable)
2. **Nunca** adicionar plugins ao `vite.config.ts` (`@lovable.dev/vite-tanstack-config`)
3. **Nunca** importar `supabaseAdmin` no bundle do cliente
4. **Sempre** editar em `src/spa/` (NÃO em `src/components/` ou `src/hooks/` — são scaffold não usado)
5. **Sempre** após mudanças: `bun run lint && bun run build && git push origin main && atualizar HANDOFF.md`
6. Baseline TS: `bunx tsc --noEmit 2>&1 | wc -l` (~211 pré-existentes — não deve aumentar)
7. Migrations via Management API (CLI não funciona)
8. `OWNER_EMAIL` em `admin-members.functions.ts` — nunca remover

## Comandos

```bash
bun dev                                  # dev local
bun run build                            # build produção
bun run lint                             # ESLint
bunx tsc --noEmit 2>&1 | wc -l          # contar erros TS (baseline ~211)
git status -sb && git log --oneline -5 && cat HANDOFF.md  # início de sessão
curl -sI https://insanespyzada.vercel.app  # checar deploy
```

## Auto-atualização

Quando o projeto mudar significativamente:
1. Atualizar doc relevante em `AI/docs/`
2. Atualizar `AI/PROJECT_STATE.md` (estado) e `AI/KNOWN_ISSUES.md` (bugs/débito)
3. Se decisão arquitetural: adicionar entrada em `AI/DECISIONS.md`
4. Atualizar `HANDOFF.md` com estado da sessão
5. Atualizar este índice se estrutura mudar
