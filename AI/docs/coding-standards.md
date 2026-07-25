# InsaneSpy — Padrões e Convenções TypeScript

## Configuração

- `tsconfig.json` com strict mode ativado
- **~211 erros TS pré-existentes** (tipos locais `Database` não incluem tabelas SPA como `notifications`, `dashboards`, `library_flags`)
- Build Vite contorna via `as never` — não "corrigir" isso quebra o workaround
- Antes/após qualquer mudança: `bunx tsc --noEmit 2>&1 | wc -l` — número deve ser igual

## Tipos do Domínio

- `src/spa/lib/types.ts` — tipos frontend (Library, Snapshot, Creative, Plan, etc.)
- `src/integrations/supabase/types.ts` — tipos gerados do schema Supabase (`Database`, `Tables<T>`)
- `src/lib/types.ts` — tipos compartilhados server/client

## Cast Patterns

```typescript
// Quando tipos DB não reconhecem tabela SPA:
const data = result as unknown as MinhaTabela[];

// Cast seguro para evitar any:
const body = await request.json().catch(() => ({}));
const id = typeof (body as { id?: unknown })?.id === "string"
  ? (body as { id: string }).id
  : undefined;
```

## Server-only Modules

Arquivos `*.server.ts` são importados dinamicamente para evitar bundle no client:
```typescript
const { runCollection } = await import("@/lib/collect.server");
```

## Zod para Validação

```typescript
import { z } from "zod";

const schema = z.object({
  libraryId: z.string().uuid().optional(),
  userId: z.string().uuid(),
});

type Input = z.infer<typeof schema>;
```

## ESLint / Prettier

- ESLint com `typescript-eslint` + `react-hooks` + `react-refresh`
- Prettier com config em `.prettierrc`
- `bun run lint` antes de commitar
- `bun run format` para formatação automática

## Dependências Críticas

| Dep | Regra |
|-----|-------|
| `@lovable.dev/vite-tanstack-config` | É a config do Vite. Não adicionar plugins que ela já inclui |
| `framer-motion` | Para animações — não usar CSS transitions paralelas |
| `sonner` | Para toasts — não usar outras libs de toast |
| `date-fns` | Para datas — não usar moment.js ou dayjs |
| `lucide-react` | Para ícones — conjunto já incluso |
