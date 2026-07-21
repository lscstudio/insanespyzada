import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * POST /api/collect
 * Dispara runCollection (collector Python) para a sessão autenticada.
 * Body opcional: { libraryId?: string }.
 * Autenticação via access_token do cliente (mesma sessão do Supabase).
 */
export const Route = createFileRoute("/api/collect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization") ?? "";
          const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
          if (!token) return new Response("unauthorized", { status: 401 });

          // Validate the token by making a getUser call with it.
          const {
            data: { user },
            error,
          } = await supabase.auth.getUser(token);
          if (error || !user) return new Response("unauthorized", { status: 401 });

          const body = await request.json().catch(() => ({}));
          const libraryId =
            typeof (body as { libraryId?: unknown })?.libraryId === "string"
              ? (body as { libraryId: string }).libraryId
              : undefined;

          const { runCollection } = await import("@/lib/collect.server");
          const result = await runCollection({ libraryId, userId: user.id });
          return new Response(JSON.stringify({ ok: true, result }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "collect failed";
          console.error("[/api/collect]", msg);
          return new Response(JSON.stringify({ ok: false, error: msg }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
