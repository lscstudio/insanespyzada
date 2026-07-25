---
name: planning-engine
description: Motor de planejamento obrigatório antes de qualquer implementação. Garante que nunca se saia implementando sem entender o problema, listar riscos, identificar dependências e definir um plano claro. Use antes de qualquer feature, fix ou refactor de médio/alto impacto.
---

## O que faço

Sou o planejador. Meu trabalho é garantir que você pense antes de codar.

## Protocolo de Planejamento (executar nesta ordem)

### Fase 1 — Entender o Problema

Perguntas obrigatórias antes de qualquer código:

1. **O que exatamente precisa ser feito?** (reformular com suas palavras)
2. **Qual é o comportamento atual vs esperado?**
3. **Existe algo similar já implementado no projeto?** (se sim, onde?)
4. **Qual é a menor mudança que resolve o problema?**

### Fase 2 — Listar Arquivos Afetados

Para cada mudança planejada, identificar:

```
Arquivo a modificar: [path]
  - O que muda: [descrição]
  - Risco: [baixo/médio/alto]
  - Dependências: [o que pode quebrar]

Arquivos a criar (se necessário):
  - [path] — [propósito]

Arquivos provavelmente NÃO precisam ser tocados:
  - [listar para validação explícita]
```

### Fase 3 — Identificar Riscos

Checar sempre:

| Risco | Verificação |
|-------|-------------|
| Quebra de tipos TS | `bunx tsc --noEmit 2>&1 | wc -l` antes e depois |
| Quebra de build Vite | `bun run build` |
| Duplicação de plugins Vite | Checar `vite.config.ts` não adiciona o que já está no config Lovable |
| Import server-only no cliente | `supabaseAdmin` não pode estar em routes/components |
| RLS quebrada | Nova tabela/view precisa de políticas RLS |
| Auth bypass | Toda route em `_authenticated/` precisa do guard |
| Realtime desatualizado | Novo INSERT sem invalidação no `use-realtime-refresh.ts`? |
| Tipos SPA não gerados | Novas tabelas DB precisam de tipos em `supabase/types.ts` |

### Fase 4 — Definir Plano de Implementação

Sequência de passos em ordem:

```
1. [passo 1 — o mais atômico possível]
2. [passo 2]
3. [testes/validação]
4. bun run lint && bun run build
5. git add + commit
6. git push origin main
7. Atualizar HANDOFF.md
```

### Fase 5 — Verificação Pós-implementação

Após implementar cada passo:
- [ ] Erros TS não aumentaram: `bunx tsc --noEmit 2>&1 | wc -l`
- [ ] Lint passou: `bun run lint`
- [ ] Build passou: `bun run build`
- [ ] Comportamento testado (local ou via curl)
- [ ] HANDOFF.md atualizado

## Tipos de Tarefa e Templates

### Bug Fix
```
PROBLEMA: [descrição exata do bug]
CAUSA RAIZ: [investigação feita]
ARQUIVOS: [exatamente quais arquivos]
FIX: [mudança mínima necessária]
TESTE: [como validar que o fix funcionou]
```

### Nova Feature
```
FEATURE: [o que será entregue]
USER STORY: Como [quem], quero [o quê], para [por quê]
ARQUIVOS NOVOS: [se necessário]
ARQUIVOS MODIFICADOS: [lista]
PLANO: [passos numerados]
ROLLBACK: [como desfazer se der errado]
```

### Refactor
```
MOTIVAÇÃO: [por que refatorar]
ESCOPO: [o que muda, o que NÃO muda]
RISCO: [o que pode quebrar]
VALIDAÇÃO: [como confirmar que nada quebrou]
```

## Regra de Ouro

> "Se você não consegue explicar o plano em 3 frases, você não entendeu o problema ainda."
