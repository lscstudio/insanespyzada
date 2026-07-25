---
name: final-reviewer
description: Revisor final obrigatório após qualquer implementação. Verifica bugs, erros de TypeScript, problemas de segurança, performance, imports quebrados, consistência arquitetural e regressões antes do commit. Use sempre antes de fazer git commit em mudanças de médio/alto impacto.
---

## O que faço

Sou o sinal de "pronto para produção". Nada vai ao ar sem passar por mim.

## Checklist Final (executar nesta ordem)

### 1. TypeScript

```bash
bunx tsc --noEmit 2>&1 | wc -l
# Compare com baseline (~211 erros pré-existentes)
# Se aumentou: identificar novos erros e corrigir
```

Erros comuns a verificar:
- [ ] Tipos não importados corretamente
- [ ] `as any` ou `as never` adicionados sem justificativa
- [ ] Props obrigatórias faltando em componentes
- [ ] Retorno de função sem tipo explícito em server functions

### 2. Lint

```bash
bun run lint
# Zero novos warnings/errors
```

Checar manualmente:
- [ ] Imports não usados removidos
- [ ] `console.log` de debug removidos (manter apenas `console.error` intencionais)
- [ ] Sem `// @ts-ignore` adicionados sem comentário explicativo

### 3. Build

```bash
bun run build
# Build deve completar sem erros
```

Atenção especial:
- [ ] Nenhum import de `*.server.ts` em código do cliente
- [ ] `await import()` para módulos server-only
- [ ] Sem side effects não-intencionais no bundle

### 4. Verificação de Código

#### Imports
- [ ] `@/` alias usado consistentemente (não `../../`)
- [ ] Imports de `supabaseAdmin` apenas em arquivos server (`*.server.ts`, `*.functions.ts`, `api/`)
- [ ] Sem imports circulares novos

#### Lógica
- [ ] Edge cases cobertos (array vazio, null/undefined, loading state)
- [ ] Error boundaries ou try/catch onde apropriado
- [ ] Operações de banco com tratamento de erro (`if (error) throw error`)
- [ ] Loading states mostrados ao usuário (não deixar UI travada)

#### Segurança
- [ ] Input externo validado antes de usar
- [ ] Nenhum dado sensível logado
- [ ] Admin gates preservados

#### Performance
- [ ] Sem novos N+1 introduzidos
- [ ] Queries novas têm `select` específico (não `*` em tabelas grandes)

### 5. Consistência Arquitetural

- [ ] Nova página em `_authenticated/` se requer auth
- [ ] Nova server function usa `requireSupabaseAuth` middleware
- [ ] Novos tipos adicionados ao arquivo `types.ts` correto
- [ ] Novos componentes seguem padrão shadcn/Tailwind do projeto
- [ ] Nova migration segue convenção de nomeação `YYYYMMDD_descricao.sql`

### 6. Regressões

- [ ] Features existentes testadas manualmente (coleta, auth, dashboard)
- [ ] `HANDOFF.md` lido para checar se o fix não conflita com pendências conhecidas
- [ ] Build local (`bun dev`) testado antes de push

### 7. Pré-Commit

```bash
bun run lint && bun run build
git status --short        # confirmar quais arquivos estão sendo commitados
git diff --stat           # ver volume de mudanças
```

- [ ] Apenas arquivos intencionais no stage
- [ ] `.env*` não incluídos acidentalmente
- [ ] `node_modules/` não incluído
- [ ] Mensagem de commit descritiva: `tipo(escopo): descrição`

## Tipos de Commit (seguir convenção do projeto)

```
feat(bibliotecas): adiciona filtro por niche na listagem
fix(collector): corrige marcação errada de chave esgotada
docs(HANDOFF): atualiza estado após fix de coleta
refactor(store): simplifica mapLibrary sem dados mock
style: formata arquivos com prettier
chore: atualiza dependência X
```

## Pós-Commit Obrigatório

```bash
git push origin main
# Aguardar deploy Vercel (~25s)
curl -sI https://insanespyzada.vercel.app  # deve retornar 200

# Atualizar HANDOFF.md com o que foi feito
# Nunca deixar trabalho não documentado
```

## Quando o Build Falha

1. Ler o erro completo (não só a última linha)
2. Verificar se é um import de server-only no cliente
3. Verificar se é tipo TS que quebrou
4. `bunx tsc --noEmit 2>&1 | head -30` para ver primeiros erros
5. **Nunca** usar `// @ts-ignore` como band-aid permanente
6. Se for erro pré-existente: documentar, não corrigir nesta tarefa

## Red Flags que Bloqueiam Commit

- Erros TS aumentaram
- Build falhou
- `supabaseAdmin` importado em componente React
- Secret exposto em código
- RLS bypass não intencional
- `OWNER_EMAIL` proteção removida
