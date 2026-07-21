import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * POST /api/delete-account
 * Hard-deletes the authenticated user's account + libraries + avatars.
 * Wraps the existing deleteMyAccount server-fn behavior but callable via fetch
 * from the SPA using the same Supabase session.
 */
export const Route = createFileRoute("/api/delete-account")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization") ?? "";
          const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
          if (!token) return new Response("unauthorized", { status: 401 });
          const {
            data: { user },
            error,
          } = await supabase.auth.getUser(token);
          if (error || !user) return new Response("unauthorized", { status: 401 });
          const userId = user.id;

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          await Promise.allSettled([
            supabaseAdmin.from("libraries").delete().eq("created_by", userId),
            supabaseAdmin.from("niches").delete().eq("owner_id", userId),
            (async () => {
              const { data: files } = await supabaseAdmin.storage.from("avatars").list(userId);
              if (files && files.length > 0) {
                await supabaseAdmin.storage
                  .from("avatars")
                  .remove(files.map((f) => `${userId}/${f.name}`));
              }
            })(),
          ]);

          const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
          if (delErr) throw delErr;
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "delete failed";
          console.error("[/api/delete-account]", msg);
          return new Response(JSON.stringify({ ok: false, error: msg }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
