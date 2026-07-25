---
name: planning-engine
description: Motor de planejamento obrigatório antes de implementar. Garante entender problema, listar riscos, identificar dependências e definir plano. Use antes de feature/fix/refactor de médio/alto impacto.
---

## Protocolo (nesta ordem)

### Fase 1 — Entender
1. O que exatamente precisa ser feito?
2. Comportamento atual vs esperado?
3. Existe algo similar implementado? Onde?
4. Qual a menor mudança que resolve?

### Fase 2 — Listar Arquivos
```
Modificar: [path] — [o que muda] — risco [baixo/médio/alto]
Criar: [path] — [propósito]
Não tocar: [validar que não precisa]
```

### Fase 3 — Riscos
| Risco | Verificação |
|-------|-------------|
| TS quebra | `bunx tsc --noEmit 2>&1 | wc -l` antes/depois |
| Build quebra | `bun run build` |
| Plugin Vite duplicado | Não adicionar ao `vite.config.ts` |
| Server-only no cliente | `supabaseAdmin` não em `src/spa/` |
| RLS quebrada | Nova tabela precisa de políticas |
| Auth bypass | Rotas em `src/spa/App.tsx` precisam de `RequireAuth` |
| Realtime desatualizado | Nova tabela? Adicionar subscription no `store.tsx` |

### Fase 4 — Plano
```
1. [passo atômico]
2. [passo]
3. bun run lint && bun run build
4. git add + commit + push origin main
5. Atualizar HANDOFF.md + PROJECT_STATE.md se relevante
```

### Fase 5 — Verificação Pós
- [ ] TS não aumentou
- [ ] Lint passou
- [ ] Build passou
- [ ] Comportamento testado
- [ ] HANDOFF.md atualizado

## Templates

### Bug Fix
```
PROBLEMA: [descrição]
CAUSA RAIZ: [investigação]
ARQUIVOS: [quais]
FIX: [mudança mínima]
TESTE: [como validar]
```

### Feature
```
FEATURE: [o que]
ROTA: [URL em src/spa/App.tsx]
ARQUIVOS: [lista]
PLANO: [passos]
ROLLBACK: [como desfazer]
```

> "Se não consegue explicar o plano em 3 frases, não entendeu o problema."
