<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

# InsaneSpy — AI Bootstrap

> Arquivo de entrada automático do OpenCode. Pequeno por design.
> O índice completo está em `AI/AI_INDEX.md` (carregado automaticamente via opencode.json).

## Projeto

**InsaneSpy** — dashboard SaaS para monitorar bibliotecas de anúncios da Meta Ad Library.
Stack: TanStack Start + Supabase + Vercel. Deploy: push em `main` → live em ~25s.

## Início de Sessão Obrigatório

```bash
git status -sb && git log --oneline -5 && cat HANDOFF.md
```

`HANDOFF.md` é a fonte de verdade entre sessões. Leia sempre ao iniciar.

## Skills (carregar conforme necessidade)

| Skill | Quando |
|-------|--------|
| `smart-context-loader` | **ANTES de qualquer tarefa** — identifica arquivos mínimos |
| `planning-engine` | Antes de implementar qualquer coisa |
| `project-architect` | Para entender arquitetura |
| `domain-knowledge` | Para entender conceitos do negócio |
| `security-reviewer` | Após mudanças em auth/endpoints/RLS |
| `performance-auditor` | Ao suspeitar de lentidão |
| `token-optimizer` | Regras de economia de contexto |
| `final-reviewer` | Antes de qualquer commit |

## Regras Inegociáveis

1. **Nunca** force push, rebase ou amend em commits já pushados (Lovable)
2. **Nunca** adicionar plugins manualmente ao `vite.config.ts` (já configurados por `@lovable.dev/vite-tanstack-config`)
3. **Nunca** importar `supabaseAdmin` no bundle do cliente
4. **Sempre** após qualquer mudança: `bun run lint && bun run build && git push origin main && atualizar HANDOFF.md`
5. **Sempre** checar baseline de erros TS: `bunx tsc --noEmit 2>&1 | wc -l` (~211 pré-existentes)

## Documentação

- `AI/AI_INDEX.md` — índice mestre, já carregado
- `AI/docs/` — docs por tema (architecture, folder-map, domain, patterns, etc.)
- `HANDOFF.md` — estado atual do projeto, pendências, histórico
