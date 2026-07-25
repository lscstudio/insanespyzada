---
name: token-optimizer
description: Regras permanentes de economia de tokens e contexto. Esta skill define como trabalhar de forma eficiente — mínimo de arquivos abertos, preferência por diffs, reutilização de contexto, respostas concisas. Deve ser internalizada e aplicada em todo momento, não apenas consultada.
---

## Princípios Fundamentais

### 1. Mínimo Contexto Suficiente

> "Abra apenas o que precisa. Leia apenas o que precisa. Escreva apenas o que muda."

Antes de abrir qualquer arquivo, pergunte:
- "Preciso ler isto para completar esta tarefa?"
- "Já tenho esta informação no contexto atual?"
- "Posso inferir isso dos arquivos que já li?"

### 2. Diffs, Não Reescritas

**NUNCA** reescrever um arquivo inteiro quando só uma parte muda.
**SEMPRE** usar Edit com `oldString`/`newString` precisos.

```
ERRADO: Write(filePath, conteúdo_completo_do_arquivo)  # quando apenas 5 linhas mudaram
CERTO:  Edit(filePath, oldString="...", newString="...")
```

### 3. Lazy Loading de Documentação

A documentação em `AI/docs/` existe para ser carregada quando necessária, não de uma vez:
- Bug de coleta → ler `data-flow.md` (fluxo de coleta)
- Feature nova → ler `patterns.md` (padrões de código)
- Dúvida de DB → ler `architecture.md` (seção banco)
- Nunca ler todos os docs ao mesmo tempo

### 4. Não Reler o Que Já Está no Contexto

Se um arquivo já foi lido nesta sessão, não ler novamente.
Se `HANDOFF.md` já foi lido, não ler de novo para "confirmar".

### 5. Respostas Concisas

- Resposta de código: apenas o diff necessário
- Resposta de explicação: máximo 5-10 linhas
- Resposta de análise: bullet points, não parágrafos
- Nunca repetir o código que o usuário já tem visível

## Regras para Arquivos Grandes

### `collect.server.ts` (871 linhas)
Nunca abrir o arquivo inteiro. Usar grep primeiro:
```bash
grep -n "runCollection\|EXHAUSTED\|DYN_CACHE" src/lib/collect.server.ts
```
Depois ler apenas o offset/limit necessário.

### `src/routes/_authenticated/painel.tsx` (892 linhas)
Usar grep para localizar a seção (tab APIs vs Contas vs Membros).

### `src/hooks/use-libraries.ts` (343 linhas)
Só ler o hook específico necessário.

### `supabase/migrations/`
Raramente precisar ler. Usar `AI/docs/architecture.md` como fonte do schema.
Se precisar de migration específica, ler só ela.

## Classificação de Custo por Operação

| Operação | Custo | Alternativa |
|----------|-------|-------------|
| Ler arquivo grande inteiro | ALTO | grep + offset/limit |
| Reescrever arquivo | MUITO ALTO | Edit com diff preciso |
| Ler todos os docs | MUITO ALTO | Lazy load por necessidade |
| Grep por palavra-chave | BAIXO | Sempre preferir |
| Read com offset/limit | BAIXO | Sempre preferir para arquivos > 100 linhas |
| Abrir README.md inteiro | MÉDIO | Raramente necessário |

## Workflow de Sessão Eficiente

### Início de Sessão (mínimo contexto)
1. `AI/AI_INDEX.md` já carregado automaticamente ✓
2. Ler `HANDOFF.md` (estado atual — uma leitura)
3. Identificar a tarefa
4. Aplicar `smart-context-loader` para identificar arquivos necessários
5. Abrir apenas esses arquivos

### Durante Implementação
- Manter menos de 5 arquivos ativos no contexto simultaneamente
- Ao terminar uma subtarefa, não precisa reler arquivos já resolvidos
- Commits frequentes para preservar progresso

### Escrevendo Código
- Funções pequenas são preferíveis a funções grandes
- Reutilizar tipos existentes de `types.ts` (não criar duplicatas)
- Copiar padrão existente similar ao invés de inventar do zero

## O Que NUNCA Fazer

- `cat` ou `Read` sem `offset`/`limit` em arquivos > 100 linhas sem grep primeiro
- Abrir `node_modules/` por qualquer razão
- Abrir `src/routeTree.gen.ts` (auto-gerado, > 500 linhas, nunca editar)
- Abrir `src/components/ui/` inteiro (37 componentes = muito contexto)
- Gerar respostas com o arquivo inteiro quando só uma função mudou
- Repetir código do usuário antes de fazer uma edição

## Indicador de Sessão Saudável

Sessão eficiente:
- < 10 arquivos abertos para uma tarefa comum
- Edições são pequenos diffs
- Docs carregados apenas quando necessário
- Contexto abaixo de 60k tokens para tarefas simples

Sessão problemática:
- > 20 arquivos abertos
- Reescrevendo arquivos inteiros
- Relendo docs já lidos
- Contexto explodiuu > 80k tokens sem necessidade
