# InsaneSpy — Padrões de Código

## Server Functions (TanStack Start)

```typescript
// Padrão obrigatório para server functions:
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const myFunction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ ... }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context; // injetado pelo middleware
    // lógica aqui
  });
```

## Admin Gate

```typescript
// Sempre checar admin antes de operação privilegiada:
const { data: isAdmin } = await supabase.rpc("has_role", {
  _user_id: userId,
  _role: "admin",
});
if (!isAdmin) throw new Error("Forbidden");
```

## Hooks TanStack Query

```typescript
// Padrão de hook de leitura:
export function useLibrariesLatest() {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: ["libraries-latest"],
    queryFn: async () => {
      const { data, error } = await supabase.from("library_latest").select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 60_000, // 1 min
    refetchInterval: 5 * 60_000, // 5 min
  });
}
```

## API Routes (TanStack Router Server Handlers)

```typescript
// src/routes/api/minha-rota.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/minha-rota")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!token) return new Response("unauthorized", { status: 401 });
        // lógica...
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
```

## Componentes

```typescript
// Padrão de componente com shadcn/ui e Tailwind v4:
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Props {
  className?: string;
  // props...
}

export function MeuComponente({ className, ...props }: Props) {
  return (
    <div className={cn("base-classes", className)}>
      <Button variant="outline" size="sm">...</Button>
    </div>
  );
}
```

## Tratamento de Erros

```typescript
// Server functions devem lançar erros com mensagens claras:
throw new Error("Mensagem clara para o usuário");

// No cliente, use sonner para toasts:
import { toast } from "sonner";
toast.error("Mensagem de erro");
toast.success("Operação concluída");
```

## Realtime + Query Cache

```typescript
// Padrão de invalidação p/ realtime (em use-realtime-refresh.ts):
supabase.channel("changes")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "snapshots" },
    () => queryClient.invalidateQueries({ queryKey: ["libraries-latest"] })
  )
  .subscribe();
```

## i18n

```typescript
// Usar useT() para traduções:
import { useT } from "@/lib/i18n";

function MeuComp() {
  const t = useT();
  return <span>{t("chave_da_traducao")}</span>;
}
```

## Imports

- Usar alias `@/` para `src/`
- `@/components/ui/` = primitivos shadcn (não editar diretamente)
- `@/integrations/supabase/client` = client browser
- `@/integrations/supabase/client.server` = **SERVER ONLY**

## Naming

- Components: PascalCase (`LibraryCard.tsx`)
- Hooks: camelCase com prefixo `use` (`use-libraries.ts`)
- Server functions: camelCase (`triggerCollection`)
- Arquivos de functions: `*.functions.ts`
- Arquivos server-only: `*.server.ts`
- Routes: kebab-case, `$param` para dinâmico, `_layout` para pathless layout
