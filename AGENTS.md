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

SPA de monitoramento da Meta Ad Library. TanStack Start (shell) + react-router-dom (SPA em `src/spa/`) + Supabase. Deploy: Vercel.

## Início de Sessão

```bash
git status -sb && git log --oneline -5 && cat HANDOFF.md
```

`HANDOFF.md` é a fonte de verdade entre sessões. `AI/AI_INDEX.md` (auto-carregado) tem o índice completo de docs e skills.

## Regras Inegociáveis

1. **Nunca** force push, rebase ou amend em commits já pushados (Lovable)
2. **Nunca** adicionar plugins ao `vite.config.ts` (já configurado por `@lovable.dev/vite-tanstack-config`)
3. **Nunca** importar `supabaseAdmin` no bundle do cliente
4. **Sempre** editar em `src/spa/` — `src/components/` e `src/hooks/` são scaffold não usado
5. **Sempre** após mudanças: `bun run lint && bun run build && git push origin main && atualizar HANDOFF.md`
6. Baseline TS: `bunx tsc --noEmit 2>&1 | wc -l` (~211 pré-existentes)

## Skills (carregar via tool `skill`)

`smart-context-loader` (antes de qualquer tarefa) → `planning-engine` (antes de implementar) → `final-reviewer` (antes de commitar). Demais: ver `AI/AI_INDEX.md`.
