---
name: smart-context-loader
description: PRIORIDADE MÁXIMA. Ativar ANTES de qualquer tarefa. Identifica exatamente quais arquivos são necessários — e apenas esses. Previne abertura desnecessária, minimiza contexto, maximiza eficiência de tokens.
---

## Protocolo (executar SEMPRE antes de qualquer tarefa)

### 1. Classificar a Tarefa

| Tipo | Arquivos Mínimos |
|------|-----------------|
| Bug em UI | Página específica em `src/spa/pages/` + componente em `src/spa/components/` |
| Nova página | Uma página existente em `src/spa/pages/` (exemplo) + `src/spa/App.tsx` |
| Bug de coleta | `src/lib/collect.server.ts` (seção via grep) + `HANDOFF.md` |
| State/dados | `src/spa/lib/store.tsx` (1545 linhas — use grep + offset/limit) |
| Schema/migration | `AI/docs/architecture.md` (seção DB) + migration específica |
| Auth/permissão | `src/spa/App.tsx` (RequireAuth) + `src/spa/lib/admin.ts` |
| Admin feature | `src/spa/pages/Admin.tsx` (1103 linhas — grep por tab) + `src/routes/api/admin.tsx` |
| API route | Uma route existente em `src/routes/api/` (exemplo) |

### 2. Mapa por Domínio

#### SPA (aplicação real)
```
src/spa/App.tsx                    # Rotas + RequireAuth
src/spa/lib/store.tsx              # Store central (1545 linhas)
src/spa/lib/types.ts               # Tipos do domínio
src/spa/lib/plans.ts               # Planos
src/spa/lib/admin.ts               # Admin check
src/spa/pages/*.tsx                # 9 páginas (PascalCase)
src/spa/components/ui.tsx          # Primitivos UI (arquivo único)
src/spa/components/*.tsx           # Componentes custom
src/spa/components/layout/AppLayout.tsx  # Shell autenticado
```

#### Server-side
```
src/routes/api/*.tsx               # API routes
src/lib/collect.server.ts          # Motor de coleta (server-only)
src/integrations/supabase/client.ts         # Client browser
src/integrations/supabase/client.server.ts  # supabaseAdmin (SERVER ONLY)
```

### 3. Regras

**NUNCA abrir:**
- `src/routeTree.gen.ts` (auto-gerado)
- `src/components/` ou `src/hooks/` (scaffold não usado pelo SPA)
- `node_modules/`
- `collect.server.ts` inteiro (use grep + offset/limit)
- `store.tsx` inteiro (1545 linhas — grep pela função necessária)

**SEMPRE checar primeiro:**
- `HANDOFF.md` — estado atual
- `AI/AI_INDEX.md` — já carregado

**Antes de ler arquivo grande (>100 linhas):**
- Grep pelo nome da função/seção
- Read com `offset` e `limit`
