# InsaneSpy — Padrões de Código

## Arquitetura do SPA

O app é um SPA. Tudo mora em `src/spa/`. State central via React Context.

### Store (src/spa/lib/store.tsx)

```typescript
// StoreProvider envolve todo o app (em src/spa/App.tsx)
// Acesso via useStore():
const { session, libraries, plan, theme, toasts, ... } = useStore();

// bootstrap() roda no mount — carrega dados iniciais (10 queries)
// mapLibrary() mapeia row DB → tipo Library (sem mock)
```

### Rotas (src/spa/App.tsx)

```typescript
// react-router-dom (NÃO TanStack Router para páginas)
import { BrowserRouter, Route, Routes } from "react-router-dom";

// Auth guard = componente, não middleware:
function RequireAuth({ children }) {
  const { session, authLoading } = useStore();
  if (authLoading) return <Loading />;
  if (!session) return <Navigate to="/auth?next=..." />;
  return children;
}

// Páginas autenticadas envolvidas por RequireAuth + AppLayout:
<Route element={<RequireAuth><AppLayout /></RequireAuth>}>
  <Route path="/" element={<Home />} />
  <Route path="/bibliotecas" element={<Bibliotecas />} />
  ...
</Route>
```

### Server Operations (fetch API)

```typescript
// SPA chama API routes via fetch (NÃO importa server functions):
const { data: sess } = await supabase.auth.getSession();
const token = sess.session?.access_token;
const res = await fetch("/api/collect", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify({ libraryId }),
});
```

### Supabase Queries (direto, sem TanStack Query)

```typescript
// Queries diretas no store ou páginas:
const { data, error } = await supabase
  .from("library_latest")
  .select("*")
  .eq("created_by", userId);
if (error) throw error;
```

### Realtime (no store.tsx)

```typescript
// StoreProvider seta up realtime subscriptions:
useEffect(() => {
  if (!session) return;
  const channel = supabase.channel("changes")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "snapshots" },
      () => void syncLibraries())
    .on("postgres_changes", { event: "*", schema: "public", table: "libraries" },
      () => void syncLibraries())
    // ... 9 tabelas no total
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [session]);
```

## API Routes (TanStack Router server handlers)

```typescript
// src/routes/api/minha-rota.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/minha-rota")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.slice(7) ?? "";
        if (!token) return new Response("unauthorized", { status: 401 });
        // Valida token via supabase.auth.getUser(token)
        // Import dinâmico para server-only:
        const { runCollection } = await import("@/lib/collect.server");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
```

## Componentes (src/spa/components/)

```typescript
// Primitivos UI em arquivo único: src/spa/components/ui.tsx
import { Badge, Button, Card, Modal, Input, Toggle, Stat, SectionTitle, EmptyState } from "../components/ui";

// Componentes custom em PascalCase:
import { LibraryCard } from "../components/LibraryCard";
```

## Admin Check

```typescript
// src/spa/lib/admin.ts
import { useStore } from "./store";
import { supabase } from "@/integrations/supabase/client";

export function useAdminCheck() {
  const { session } = useStore();
  const [isAdmin, setIsAdmin] = useState(false);
  // Chama /api/admin ou RPC has_role
}

export async function callAdmin(action: string, payload: unknown) {
  const res = await fetch("/api/admin", { /* ... */ });
}
```

## i18n

```typescript
import { useT } from "@/lib/i18n";
const t = useT();
<span>{t("chave_da_traducao")}</span>
```

## Naming Conventions

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Páginas SPA | PascalCase | `BibliotecaDetail.tsx` |
| Componentes SPA | PascalCase | `LibraryCard.tsx` |
| Primitivos UI | Arquivo único | `src/spa/components/ui.tsx` |
| API routes | kebab-case | `src/routes/api/delete-account.tsx` |
| Server-only | `*.server.ts` | `collect.server.ts` |
| Server functions | `*.functions.ts` | `admin.functions.ts` (scaffold) |
| Tipos | `types.ts` no diretório | `src/spa/lib/types.ts` |

## Imports

- `@/` alias para `src/`
- SPA importa de `../` (relativo dentro de `src/spa/`) e `@/integrations/supabase/client`
- Server-only importado dinamicamente: `await import("@/lib/collect.server")`
- **NUNCA** importar de `@/hooks/` ou `@/components/` no SPA (são scaffold não usado)
