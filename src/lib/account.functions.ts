import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Delete the currently signed-in user's account and all related data.
 * Cascades from auth.users -> profiles, libraries (via created_by FK?),
 * and we additionally hard-delete libraries owned by the user so snapshots
 * and creatives go with them (ON DELETE CASCADE on snapshots/creatives).
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // Run independent cleanup steps in parallel; isolate failures so the
    // auth.users delete still proceeds even if storage cleanup hiccups.
    await Promise.allSettled([
      supabaseAdmin.from("libraries").delete().eq("created_by", userId),
      supabaseAdmin.from("niches").delete().eq("owner_id", userId),
      (async () => {
        const { data: files, error: listErr } = await supabaseAdmin.storage
          .from("avatars")
          .list(userId);
        if (listErr) {
          console.warn("[deleteMyAccount] avatar list failed:", listErr.message);
          return;
        }
        if (files && files.length > 0) {
          await supabaseAdmin.storage
            .from("avatars")
            .remove(files.map((f) => `${userId}/${f.name}`));
        }
      })(),
    ]);

    // Delete the auth user last (profiles cascade via FK).
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return { ok: true };
  });
