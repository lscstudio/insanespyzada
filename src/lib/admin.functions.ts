import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

const UNASSIGNED_ID = "00000000-0000-0000-0000-000000000000";

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (usersError) throw new Error(usersError.message);

    const { data: libs, error: libsError } = await supabaseAdmin
      .from("libraries")
      .select("id, created_by");
    if (libsError) throw new Error(libsError.message);

    const countByUser = new Map<string, number>();
    let unassigned = 0;
    for (const l of libs ?? []) {
      if (!l.created_by) {
        unassigned += 1;
        continue;
      }
      countByUser.set(l.created_by, (countByUser.get(l.created_by) ?? 0) + 1);
    }

    const accounts = usersData.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      libraries_count: countByUser.get(u.id) ?? 0,
    }));

    if (unassigned > 0) {
      accounts.push({
        id: UNASSIGNED_ID,
        email: "(bibliotecas sem dono / legado)",
        created_at: new Date(0).toISOString(),
        last_sign_in_at: null,
        libraries_count: unassigned,
      });
    }

    return accounts;
  });

export const listLibrariesForAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const query = supabaseAdmin
      .from("libraries")
      .select("id, page_name, search_term, niche, status, url, created_at")
      .order("created_at", { ascending: false });

    const { data: libs, error } =
      data.userId === UNASSIGNED_ID
        ? await query.is("created_by", null)
        : await query.eq("created_by", data.userId);
    if (error) throw new Error(error.message);

    const ids = (libs ?? []).map((l) => l.id);
    if (ids.length === 0) return [];

    // Latest snapshot per library — cap at 2× lib count so we don't pull
    // tens of thousands of historical rows just to find the most recent
    // capture per library.
    const { data: snaps, error: snapErr } = await supabaseAdmin
      .from("snapshots")
      .select("library_id, active_ads_count, captured_at")
      .in("library_id", ids)
      .order("captured_at", { ascending: false })
      .limit(Math.max(ids.length * 2, 50));
    if (snapErr) throw new Error(snapErr.message);

    const latest = new Map<string, { active_ads_count: number; captured_at: string }>();
    for (const s of snaps ?? []) {
      if (!s.library_id) continue;
      if (!latest.has(s.library_id)) {
        latest.set(s.library_id, {
          active_ads_count: s.active_ads_count ?? 0,
          captured_at: s.captured_at,
        });
      }
    }

    return (libs ?? []).map((l) => ({
      ...l,
      active_ads_count: latest.get(l.id)?.active_ads_count ?? 0,
      last_captured_at: latest.get(l.id)?.captured_at ?? null,
    }));
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: !!data };
  });
