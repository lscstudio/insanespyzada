import { createFileRoute } from "@tanstack/react-router";

/**
 * Obscured collection endpoint for pg_cron.
 * Auth: the request must include `apikey: <SUPABASE_PUBLISHABLE_KEY>` header.
 * The previous /api/public/hooks/collect path is intentionally removed.
 */
export const Route = createFileRoute(
  "/api/public/hooks/heartbeat-7f3a9b2e8c1d4a6b",
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("apikey") ?? "";
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        if (!expected || provided !== expected) {
          return new Response("Not found", { status: 404 });
        }
        try {
          const { runCollection } = await import("@/lib/collect.server");
          const report = await runCollection();
          return new Response(JSON.stringify(report), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
      GET: async () => new Response("Not found", { status: 404 }),
    },
  },
});
