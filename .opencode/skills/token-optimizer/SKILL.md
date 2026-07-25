---
name: token-optimizer
description: Regras permanentes de economia de tokens. Internalizar e aplicar sempre. Não precisa consultar após internalizada.
---

## Princípios

1. **Mínimo contexto**: abra apenas o necessário. Pergunte "preciso disto?" antes de abrir.
2. **Diffs, não reescritas**: Edit com `oldString`/`newString`. NUNCA Write em arquivo inteiro se só parte muda.
3. **Lazy loading de docs**: carregar doc só quando relevante para a tarefa atual.
4. **Não reler**: se já leu nesta sessão, não leia de novo.
5. **Respostas concisas**: diff apenas, máx 5-10 linhas para explicações, bullets para análises.

## Arquivos Grandes — Estratégia

| Arquivo | Linhas | Estratégia |
|---------|--------|-----------|
| `src/spa/lib/store.tsx` | 1545 | grep + offset/limit |
| `src/spa/pages/Admin.tsx` | 1103 | grep por tab |
| `src/lib/collect.server.ts` | 871 | grep por função |
| `src/spa/pages/BibliotecaDetail.tsx` | ~600 | grep por seção |
| `src/spa/pages/Configuracoes.tsx` | ~400 | grep por seção |

## Custo por Operação

| Operação | Custo |
|----------|-------|
| Grep | BAIXO |
| Read com offset/limit | BAIXO |
| Read arquivo inteiro >100 linhas | ALTO |
| Write arquivo inteiro | MUITO ALTO |
| Ler todos os docs AI/ | MUITO ALTO |

## NUNCA

- `Read` sem offset/limit em arquivos >100 linhas sem grep primeiro
- Abrir `node_modules/`, `src/routeTree.gen.ts`
- Abrir `src/components/` ou `src/hooks/` (scaffold não usado)
- Gerar resposta com arquivo inteiro quando só uma função mudou
- Repetir código do usuário antes de editar

## Sessão Saudável

- < 10 arquivos abertos para tarefa comum
- Contexto < 60k tokens para tarefas simples
- Commits frequentes para preservar progresso
