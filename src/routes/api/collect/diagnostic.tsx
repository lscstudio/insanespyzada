import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/collect/diagnostic
 * Diagnóstico do pool de chaves + bibliotecas (somente admin).
 * Útil para debuggar "biblioteca recém-adicionada falhou na coleta".
 */
export const Route = createFileRoute("/api/collect/diagnostic")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization") ?? "";
          const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
          if (!token) return json({ error: "unauthorized" }, 401);

          const {
            data: { user },
            error,
          } = await supabase.auth.getUser(token);
          if (error || !user) return json({ error: "unauthorized" }, 401);

          const url = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
          const publishable =
            process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          const scoped = createClient(url as string, publishable as string, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: isAdmin, error: rpcErr } = await scoped.rpc("has_role" as never, {
            _user_id: user.id,
            _role: "admin",
          });
          if (rpcErr) return json({ error: rpcErr.message }, 500);
          if (!isAdmin) return json({ error: "forbidden — somente admin" }, 403);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const admin = supabaseAdmin;

          const { data: keys, error: kErr } = await admin
            .from("api_keys")
            .select("id, provider, label, active, created_at");
          const { data: libs, error: lErr } = await admin
            .from("libraries")
            .select("id, url, status, last_collection_ok_at, last_collection_error, created_at")
            .order("created_at", { ascending: false })
            .limit(20);

          // Pool diagnostica não expor valores de chaves.
          const mod = await import("@/lib/collect.server");

          // ?reset=1 limpa chaves marcadas como esgotadas (cold-start virtual)
          // e invalida o cache dinâmico. Útil quando uma chave nova foi
          // erroneamente marcada esgotada por 401/403 em provisioning.
          let resetDone = false;
          if (new URL(request.url).searchParams.get("reset") === "1") {
            try {
              (
                mod as unknown as {
                  resetExhaustedKeys: () => void;
                }
              ).resetExhaustedKeys();
              (
                mod as unknown as {
                  invalidateDynamicKeysCache: () => void;
                }
              ).invalidateDynamicKeysCache();
              resetDone = true;
            } catch (e) {
              /* ignore */
            }
          }

          let poolInfo: unknown = null;
          try {
            poolInfo = await (
              mod as unknown as {
                _diagnosticPool: () => Promise<unknown>;
              }
            )._diagnosticPool();
            if (resetDone) (poolInfo as { reset?: boolean }).reset = true;
          } catch (e) {
            poolInfo = { error: (e as Error).message };
          }

          return json(
            {
              ok: true,
              auth_user: user.id,
              env: {
                SUPABASE_URL: process.env.SUPABASE_URL ? "set" : "MISSING",
                SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY ? "set" : "MISSING",
                SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
                  ? "set"
                  : "MISSING",
              },
              api_keys: kErr?.message ?? (keys as unknown[]) ?? [],
              api_keys_error: kErr?.message ?? null,
              libraries: lErr?.message ?? libs ?? [],
              pool_diagnostic: poolInfo,
            },
            200,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "diagnostic failed";
          console.error("[/api/collect/diagnostic]", msg);
          return json({ ok: false, error: msg }, 500);
        }
      },
    },
  },
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
