---
name: smart-context-loader
description: PRIORIDADE MÁXIMA. Deve ser ativada ANTES de qualquer tarefa de desenvolvimento. Identifica exatamente quais arquivos são necessários para a tarefa em questão — e apenas esses. Previne abertura desnecessária de arquivos, evita contexto gigante, maximiza eficiência de tokens.
---

## O que faço

Sou o guardião do contexto. Meu trabalho é garantir que você leia APENAS o necessário.

## Protocolo Obrigatório (executar SEMPRE antes de qualquer tarefa)

### 1. Classificar a Tarefa

Identifique o tipo antes de abrir qualquer arquivo:

| Tipo | Arquivos Mínimos |
|------|-----------------|
| Bug em UI | Componente específico + hook relevante |
| Nova página | `src/routes/_authenticated/` (um exemplo) + `AI/docs/folder-map.md` |
| Nova server function | Um `*.functions.ts` existente + `auth-middleware.ts` |
| Bug de coleta | `src/lib/collect.server.ts` (seção relevante) + `HANDOFF.md` |
| Schema/migration | `AI/docs/architecture.md` (seção DB) + migration específica |
| Auth/permissão | `auth-middleware.ts` + `auth-attacher.ts` |
| Query/hook | `src/hooks/use-libraries.ts` (header) + tabela relevante |
| Admin feature | `src/routes/_authenticated/painel.tsx` + `admin*.functions.ts` |

### 2. Mapa de Arquivos por Domínio

#### Coleta
```
src/lib/collect.server.ts     # Motor principal (871 linhas — ler só a seção necessária)
src/lib/collect.functions.ts  # triggerCollection
src/routes/api/collect.tsx    # POST /api/collect
src/routes/api/collect/diagnostic.tsx
```

#### Bibliotecas
```
src/routes/_authenticated/bibliotecas.tsx
src/routes/_authenticated/biblioteca.$id.tsx
src/hooks/use-libraries.ts
src/components/library-card.tsx
```

#### Auth
```
src/routes/auth.tsx
src/integrations/supabase/auth-middleware.ts
src/integrations/supabase/client.ts
src/hooks/use-auth.ts
```

#### Admin
```
src/routes/_authenticated/painel.tsx
src/lib/admin.functions.ts
src/lib/admin-keys.functions.ts
src/lib/admin-members.functions.ts
```

#### Estado/Store
```
src/spa/lib/store.tsx          # bootstrap(), mapLibrary()
src/spa/lib/types.ts           # tipos do domínio
src/spa/lib/plans.ts           # definição dos planos
```

#### UI Components
```
src/components/ui/             # shadcn primitivos (raramente editar)
src/components/layout/app-shell.tsx
```

### 3. Regras de Ouro

**NUNCA abrir:**
- `src/routeTree.gen.ts` (auto-gerado, nunca editar)
- `node_modules/`
- `src/components/ui/` inteiro (só o componente específico)
- `supabase/migrations/` inteiro (só a migration relevante)
- `collect.server.ts` inteiro (871 linhas — use offset/limit para ler só a seção)

**SEMPRE checar primeiro:**
- `HANDOFF.md` — estado atual, bugs conhecidos, pendências
- `AI/AI_INDEX.md` — já carregado, orientação geral

**Antes de ler um arquivo grande:**
- Use `grep` para localizar a função/seção específica
- Use Read com `offset` e `limit` para ler só o necessário
- Prefira buscar pelo nome da função antes de ler o arquivo inteiro

### 4. Anti-padrões a Evitar

- Abrir todos os arquivos de um diretório antes de saber o que precisa
- Reler arquivos já lidos nesta sessão
- Ler arquivos inteiros quando só precisa de uma função
- Abrir `types.ts` por precaução (só abrir se precisar de um tipo específico)
- Abrir migrations para entender o schema (usar `AI/docs/architecture.md` primeiro)
