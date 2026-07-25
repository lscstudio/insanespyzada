---
name: final-reviewer
description: Revisor final obrigatório antes de commit. Verifica TS, lint, build, segurança, consistência, regressões. Use antes de git commit em mudanças de médio/alto impacto.
---

## Checklist (nesta ordem)

### 1. TypeScript
```bash
bunx tsc --noEmit 2>&1 | wc -l  # comparar com baseline ~211
```
- [ ] Erros não aumentaram
- [ ] Sem `as any` sem justificativa

### 2. Lint + Build
```bash
bun run lint && bun run build
```
- [ ] Zero novos warnings
- [ ] Build completa sem erros
- [ ] Sem import de `*.server.ts` em código cliente
- [ ] `console.log` de debug removidos

### 3. Código
- [ ] `@/` alias usado (não `../../` no SPA)
- [ ] `supabaseAdmin` só em server-side
- [ ] Edge cases cobertos (null, vazio, loading)
- [ ] `if (error) throw error` em queries
- [ ] Loading states na UI

### 4. Consistência SPA
- [ ] Páginas em `src/spa/pages/` (PascalCase)
- [ ] Componentes em `src/spa/components/` (PascalCase)
- [ ] Novo state em `src/spa/lib/store.tsx`
- [ ] Server ops via `fetch("/api/...")`
- [ ] Rota nova registrada em `src/spa/App.tsx`

### 5. Regressões
- [ ] Features existentes testadas
- [ ] `HANDOFF.md` checado para conflitos
- [ ] `bun dev` testado

### 6. Pré-Commit
```bash
git status --short && git diff --stat
```
- [ ] Apenas arquivos intencionais no stage
- [ ] `.env*` não incluídos
- [ ] Commit message: `tipo(escopo): descrição`

## Pós-Commit
```bash
git push origin main
curl -sI https://insanespyzada.vercel.app  # deve dar 200
# Atualizar HANDOFF.md
```

## Red Flags (bloqueiam commit)
- Erros TS aumentaram
- Build falhou
- `supabaseAdmin` em código cliente
- Secret exposto
- `OWNER_EMAIL` removido
