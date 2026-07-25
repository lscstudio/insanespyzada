# InsaneSpy — Convenções e Padrões TypeScript

## Configuração

- `tsconfig.json` strict mode
- **~211 erros TS pré-existentes** (tipos locais do Supabase não incluem tabelas SPA)
- Build Vite contorna via `as never` — não "corrigir" isso
- Checagem de regressão: `bunx tsc --noEmit 2>&1 | wc -l` antes/depois (deve ser igual)

## Tipos do Domínio

| Arquivo | Conteúdo |
|---------|----------|
| `src/spa/lib/types.ts` | Tipos SPA: `Library`, `Snapshot`, `Creative`, `Plan`, `Toast`, `SwipeCandidate` |
| `src/integrations/supabase/types.ts` | Tipos gerados do schema: `Database`, `Tables<T>` |
| `src/lib/types.ts` | Tipos compartilhados server/client |

## Cast Patterns

```typescript
// Tipos DB locais (não gerados):
interface LibraryLatestRow { id: string; url: string; ... }

// Cast seguro para body de request:
const body = await request.json().catch(() => ({}));
const id = typeof (body as { id?: unknown })?.id === "string"
  ? (body as { id: string }).id : undefined;
```

## Server-only Modules

```typescript
// Import dinâmico para evitar bundle no client:
const { runCollection } = await import("@/lib/collect.server");
```

## Zod (validação em forms)

```typescript
import { z } from "zod";
const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
```

## ESLint / Prettier

- `bun run lint` — ESLint (typescript-eslint + react-hooks)
- `bun run format` — Prettier
- Rodar ambos antes de commitar

## Dependências Críticas

| Dep | Regra |
|-----|-------|
| `@lovable.dev/vite-tanstack-config` | Config do Vite. NÃO adicionar plugins que ela já inclui |
| `react-router-dom` | Roteamento do SPA. NÃO usar TanStack Router para páginas |
| `framer-motion` | Animações |
| `sonner` | Toasts (também tem `src/spa/components/Toasts.tsx` custom) |
| `date-fns` | Datas — não usar moment/dayjs |
| `lucide-react` | Ícones |
| `recharts` | Charts |

## Regras de Ouro

1. Editar SEMPRE em `src/spa/` — nunca em `src/components/` ou `src/hooks/` (scaffold não usado)
2. Novo primitivo UI → adicionar em `src/spa/components/ui.tsx` (arquivo único)
3. Nova página → `src/spa/pages/` (PascalCase) + rota em `src/spa/App.tsx`
4. State novo → adicionar em `src/spa/lib/store.tsx` (Context central)
5. Server op → `fetch("/api/...")` (não import de `*.functions.ts`)
6. `supabaseAdmin` só em `*.server.ts` ou `src/routes/api/` — nunca no bundle
