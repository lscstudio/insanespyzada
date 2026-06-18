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

    // Remove user-owned libraries (cascades to snapshots/creatives).
    await supabaseAdmin.from("libraries").delete().eq("created_by", userId);
    // Remove user's niches.
    await supabaseAdmin.from("niches").delete().eq("owner_id", userId);
    // Remove avatar files.
    const { data: files } = await supabaseAdmin.storage.from("avatars").list(userId);
    if (files && files.length > 0) {
      await supabaseAdmin.storage
        .from("avatars")
        .remove(files.map((f) => `${userId}/${f.name}`));
    }
    // Delete the auth user (profiles cascade via FK).
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return { ok: true };
  });
