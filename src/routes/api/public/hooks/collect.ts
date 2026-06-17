import { createFileRoute } from "@tanstack/react-router";

/**
 * Public collection endpoint for pg_cron.
 * Auth: the request must include `apikey: <SUPABASE_PUBLISHABLE_KEY>` header
 * (the project's anon key — same one the frontend already uses).
 *
 * pg_cron will call this on a schedule; see the cron job set up in the DB.
 */
export const Route = createFileRoute("/api/public/hooks/collect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("apikey") ?? "";
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        if (!expected || provided !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
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
      GET: async () =>
        new Response(JSON.stringify({ ok: true, hint: "POST with apikey header" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    },
  },
});
