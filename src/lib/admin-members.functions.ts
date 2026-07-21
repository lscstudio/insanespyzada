import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OWNER_EMAIL = "lapinseniorcompany@gmail.com";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export interface MemberRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
  is_owner: boolean;
  is_banned: boolean;
  library_limit: number | null; // null = ilimitado
  libraries_count: number;
}

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MemberRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [
      { data: usersData, error: usersError },
      { data: roles },
      { data: profiles },
      { data: libs },
    ] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      supabaseAdmin.from("user_roles").select("user_id, role").eq("role", "admin"),
      supabaseAdmin.from("profiles").select("id, library_limit"),
      supabaseAdmin.from("libraries").select("created_by"),
    ]);
    if (usersError) throw new Error(usersError.message);

    const adminSet = new Set((roles ?? []).map((r: any) => r.user_id));
    const limitMap = new Map<string, number | null>(
      (profiles ?? []).map((p: any) => [p.id, p.library_limit ?? null]),
    );
    const countMap = new Map<string, number>();
    for (const l of libs ?? []) {
      if (!l.created_by) continue;
      countMap.set(l.created_by, (countMap.get(l.created_by) ?? 0) + 1);
    }

    return usersData.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      is_admin: adminSet.has(u.id),
      is_owner: (u.email ?? "").toLowerCase() === OWNER_EMAIL,
      is_banned:
        !!(u as any).banned_until && new Date((u as any).banned_until).getTime() > Date.now(),
      library_limit: limitMap.get(u.id) ?? null,
      libraries_count: countMap.get(u.id) ?? 0,
    }));
  });

export const setAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), makeAdmin: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target, error: tErr } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (tErr) throw new Error(tErr.message);
    if ((target.user?.email ?? "").toLowerCase() === OWNER_EMAIL && !data.makeAdmin) {
      throw new Error("O dono original não pode ser removido de admin.");
    }
    if (data.userId === context.userId && !data.makeAdmin) {
      throw new Error("Você não pode remover o seu próprio acesso de admin.");
    }

    if (data.makeAdmin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const setLibraryLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        limit: z.number().int().min(0).max(100000).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ library_limit: data.limit })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const banMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), confirm: z.literal(true) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target, error: tErr } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (tErr) throw new Error(tErr.message);
    if ((target.user?.email ?? "").toLowerCase() === OWNER_EMAIL) {
      throw new Error("O dono original não pode ser banido.");
    }
    if (data.userId === context.userId) {
      throw new Error("Você não pode banir a si mesmo.");
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: "876000h", // ~100 anos
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unbanMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: "none",
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ usage with custom date range ============

export const getUsageRangeStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        from: z.string().datetime(),
        to: z.string().datetime(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: users }, { data: libs }, { data: snaps }] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      supabaseAdmin.from("libraries").select("id, created_by"),
      supabaseAdmin
        .from("snapshots")
        .select("library_id, captured_at, scrape_ok")
        .gte("captured_at", data.from)
        .lte("captured_at", data.to)
        .limit(50000),
    ]);

    const libToOwner = new Map<string, string | null>();
    const libsByOwner = new Map<string, number>();
    for (const l of libs ?? []) {
      libToOwner.set(l.id, l.created_by ?? null);
      const k = l.created_by ?? "_orphan";
      libsByOwner.set(k, (libsByOwner.get(k) ?? 0) + 1);
    }

    const byOwner = new Map<string, { scrapes: number; ok: number }>();
    const daily = new Map<string, number>();
    for (const s of snaps ?? []) {
      const owner = s.library_id ? (libToOwner.get(s.library_id) ?? "_orphan") : "_orphan";
      const cur = byOwner.get(owner) ?? { scrapes: 0, ok: 0 };
      cur.scrapes += 1;
      if (s.scrape_ok) cur.ok += 1;
      byOwner.set(owner, cur);
      const day = s.captured_at.slice(0, 10);
      daily.set(day, (daily.get(day) ?? 0) + 1);
    }

    const accounts = (users?.users ?? []).map((u) => {
      const st = byOwner.get(u.id) ?? { scrapes: 0, ok: 0 };
      return {
        id: u.id,
        email: u.email ?? "",
        last_sign_in_at: u.last_sign_in_at ?? null,
        libraries_count: libsByOwner.get(u.id) ?? 0,
        scrapes: st.scrapes,
        credits_used: st.ok,
      };
    });
    accounts.sort((a, b) => b.credits_used - a.credits_used);

    const series = Array.from(daily.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({ day, count }));

    return {
      accounts,
      series,
      totals: {
        total_accounts: accounts.length,
        total_libraries: libs?.length ?? 0,
        total_scrapes: snaps?.length ?? 0,
        total_credits_used: accounts.reduce((s, a) => s + a.credits_used, 0),
      },
    };
  });
