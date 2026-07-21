import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function clientWithToken(token: string) {
  const url = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return createClient<Database>(url as string, key as string, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

/**
 * POST /api/admin
 * Despacha chamadas admin (somente usuários com role admin).
 * Body: { fn: string, args?: any }
 * Reimplementa a lógica dos arquivos admin*.functions.ts usando supabaseAdmin
 * direto (sem depender do middleware context).
 */
export const Route = createFileRoute("/api/admin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization") ?? "";
          const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
          if (!token) return json({ error: "unauthorized" }, 401);

          const {
            data: { user },
            error,
          } = await supabase.auth.getUser(token);
          if (error || !user) return json({ error: "unauthorized" }, 401);

          const scoped = clientWithToken(token);
          const { data: isAdmin, error: rpcErr } = await scoped.rpc("has_role" as never, {
            _user_id: user.id,
            _role: "admin",
          });
          if (rpcErr) return json({ error: rpcErr.message }, 500);
          if (!isAdmin) return json({ error: "forbidden" }, 403);

          const body = (await request.json().catch(() => ({}))) as {
            fn: string;
            args?: Record<string, unknown>;
          };
          const args = body.args ?? {};
          const data = await dispatch(body.fn, args);
          return json({ ok: true, data }, 200);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "admin call failed";
          console.error("[/api/admin]", msg);
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

const OWNER_EMAIL = "lapinseniorcompany@gmail.com";
const UNASSIGNED_ID = "00000000-0000-0000-0000-000000000000";

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function dispatch(fn: string, args: Record<string, unknown>): Promise<unknown> {
  const admin = await adminClient();

  switch (fn) {
    case "listAccounts": {
      const [{ data: usersData, error: usersError }, { data: libs, error: libsError }] =
        await Promise.all([
          admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
          admin.from("libraries").select("id, created_by"),
        ]);
      if (usersError) throw new Error(usersError.message);
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
    }

    case "listLibrariesForAccount": {
      const userId = args.userId as string;
      const query = admin
        .from("libraries")
        .select("id, page_name, search_term, niche, status, url, created_at")
        .order("created_at", { ascending: false });
      const { data: libs, error } =
        userId === UNASSIGNED_ID
          ? await query.is("created_by", null)
          : await query.eq("created_by", userId);
      if (error) throw new Error(error.message);
      const ids = (libs ?? []).map((l) => l.id);
      if (ids.length === 0) return [];
      const { data: snaps, error: snapErr } = await admin
        .from("snapshots")
        .select("library_id, active_ads_count, captured_at")
        .in("library_id", ids)
        .order("captured_at", { ascending: false })
        .limit(Math.max(ids.length * 2, 50));
      if (snapErr) throw new Error(snapErr.message);
      const latest = new Map<string, { active_ads_count: number; captured_at: string }>();
      for (const s of snaps ?? []) {
        if (s.library_id && !latest.has(s.library_id)) {
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
    }

    case "checkIsAdmin": {
      return { isAdmin: true };
    }

    case "listMembers": {
      const [
        { data: usersData, error: usersError },
        { data: roles },
        { data: profiles },
        { data: libs },
      ] = await Promise.all([
        admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
        admin.from("user_roles").select("user_id, role").eq("role", "admin"),
        admin.from("profiles").select("id, library_limit"),
        admin.from("libraries").select("created_by"),
      ]);
      if (usersError) throw new Error(usersError.message);
      const adminSet = new Set((roles ?? []).map((r: { user_id: string }) => r.user_id));
      const limitMap = new Map<string, number | null>(
        (profiles ?? []).map((p: { id: string; library_limit: number | null }) => [
          p.id,
          p.library_limit ?? null,
        ]),
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
          !!(u as { banned_until?: string | null }).banned_until &&
          new Date((u as { banned_until: string }).banned_until).getTime() > Date.now(),
        library_limit: limitMap.get(u.id) ?? null,
        libraries_count: countMap.get(u.id) ?? 0,
      }));
    }

    case "setAdminRole": {
      const userId = args.userId as string;
      const makeAdmin = !!args.makeAdmin;
      const { data: target, error: tErr } = await admin.auth.admin.getUserById(userId);
      if (tErr) throw new Error(tErr.message);
      if ((target.user?.email ?? "").toLowerCase() === OWNER_EMAIL && !makeAdmin) {
        throw new Error("O dono original não pode ser removido de admin.");
      }
      if (makeAdmin) {
        const { error } = await admin
          .from("user_roles")
          .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await admin
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        if (error) throw new Error(error.message);
      }
      return { ok: true };
    }

    case "setLibraryLimit": {
      const userId = args.userId as string;
      const limit = args.limit as number | null;
      const { error } = await admin
        .from("profiles")
        .update({ library_limit: limit })
        .eq("id", userId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "banMember": {
      const userId = args.userId as string;
      const { data: target, error: tErr } = await admin.auth.admin.getUserById(userId);
      if (tErr) throw new Error(tErr.message);
      if ((target.user?.email ?? "").toLowerCase() === OWNER_EMAIL) {
        throw new Error("O dono original não pode ser banido.");
      }
      const { error } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      } as never);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "unbanMember": {
      const userId = args.userId as string;
      const { error } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      } as never);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "getApiPoolStatus": {
      const { data, error } = await admin
        .from("api_keys")
        .select("id, provider, label, key, active, created_at")
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      const dbKeys = (data ?? []) as {
        id: string;
        provider: "firecrawl" | "scraperapi";
        label: string;
        key: string;
        active: boolean;
        created_at: string;
      }[];
      const checks = await Promise.all(
        dbKeys
          .filter((r) => r.active)
          .map((r) =>
            r.provider === "firecrawl"
              ? checkFirecrawl(`db:${r.id.slice(0, 8)}`, r.key, {
                  label: r.label || `${r.provider}-${r.id.slice(0, 6)}`,
                  source: "db",
                  id: r.id,
                })
              : checkScraperApi(`db:${r.id.slice(0, 8)}`, r.key, {
                  label: r.label || `${r.provider}-${r.id.slice(0, 6)}`,
                  source: "db",
                  id: r.id,
                }),
          ),
      );
      for (const r of dbKeys.filter((r) => !r.active)) {
        checks.push({
          provider: r.provider,
          name: `db:${r.id.slice(0, 8)}`,
          label: r.label || `${r.provider}-${r.id.slice(0, 6)}`,
          configured: true,
          working: false,
          credits: null,
          limit: null,
          used: null,
          error: "desativada",
          latency_ms: null,
          source: "db",
          id: r.id,
        });
      }
      const configured = checks.filter((r) => r.configured).length;
      const working = checks.filter((r) => r.working).length;
      const totalCredits = checks.reduce((s, r) => s + (r.credits ?? 0), 0);
      return {
        keys: checks,
        summary: {
          total_slots: checks.length,
          configured,
          working,
          broken: configured - working,
          total_credits: totalCredits,
          firecrawl_credits: checks
            .filter((r) => r.provider === "firecrawl")
            .reduce((s, r) => s + (r.credits ?? 0), 0),
          scraperapi_credits: checks
            .filter((r) => r.provider === "scraperapi")
            .reduce((s, r) => s + (r.credits ?? 0), 0),
        },
      };
    }

    case "addApiKey": {
      const provider = args.provider as "firecrawl" | "scraperapi";
      const label = String(args.label ?? "").trim();
      const key = String(args.key ?? "").trim();
      if (provider !== "firecrawl" && provider !== "scraperapi")
        throw new Error("Provider inválido");
      if (!label || label.length > 60) throw new Error("Rótulo obrigatório (até 60 caracteres)");
      if (!key || key.length < 10 || key.length > 500) throw new Error("Chave de API inválida");
      const { data: row, error } = await admin
        .from("api_keys")
        .insert({ provider, label, key })
        .select("id, provider, label, active, created_at")
        .single();
      if (error) throw new Error(error.message);
      try {
        const mod = await import("@/lib/collect.server");
        (mod as { invalidateDynamicKeysCache?: () => void }).invalidateDynamicKeysCache?.();
      } catch {}
      return row;
    }

    case "deleteApiKey": {
      const id = args.id as string;
      const { error } = await admin.from("api_keys").delete().eq("id", id);
      if (error) throw new Error(error.message);
      try {
        const mod = await import("@/lib/collect.server");
        (mod as { invalidateDynamicKeysCache?: () => void }).invalidateDynamicKeysCache?.();
      } catch {}
      return { ok: true };
    }

    case "toggleApiKey": {
      const id = args.id as string;
      const active = !!args.active;
      const { error } = await admin.from("api_keys").update({ active }).eq("id", id);
      if (error) throw new Error(error.message);
      try {
        const mod = await import("@/lib/collect.server");
        (mod as { invalidateDynamicKeysCache?: () => void }).invalidateDynamicKeysCache?.();
      } catch {}
      return { ok: true };
    }

    case "getUsageRanking": {
      const [{ data: users }, { data: libs }, { data: snaps }] = await Promise.all([
        admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
        admin.from("libraries").select("id, created_by, created_at"),
        admin
          .from("snapshots")
          .select("library_id, captured_at, scrape_ok")
          .gte("captured_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .limit(20000),
      ]);
      const libToOwner = new Map<string, string | null>();
      const libsByOwner = new Map<string, number>();
      for (const l of libs ?? []) {
        libToOwner.set(l.id, l.created_by ?? null);
        const k = l.created_by ?? "_orphan";
        libsByOwner.set(k, (libsByOwner.get(k) ?? 0) + 1);
      }
      const snapsByOwner = new Map<string, number>();
      const snapsOkByOwner = new Map<string, number>();
      const daily = new Map<string, number>();
      for (const s of snaps ?? []) {
        const owner = s.library_id ? (libToOwner.get(s.library_id) ?? "_orphan") : "_orphan";
        snapsByOwner.set(owner, (snapsByOwner.get(owner) ?? 0) + 1);
        if (s.scrape_ok) snapsOkByOwner.set(owner, (snapsOkByOwner.get(owner) ?? 0) + 1);
        const day = s.captured_at.slice(0, 10);
        daily.set(day, (daily.get(day) ?? 0) + 1);
      }
      const accounts = (users?.users ?? []).map((u) => {
        const libCount = libsByOwner.get(u.id) ?? 0;
        const scrapes = snapsByOwner.get(u.id) ?? 0;
        const scrapesOk = snapsOkByOwner.get(u.id) ?? 0;
        return {
          id: u.id,
          email: u.email ?? "",
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          libraries_count: libCount,
          scrapes_30d: scrapes,
          scrapes_ok_30d: scrapesOk,
          credits_used_30d: scrapesOk,
        };
      });
      accounts.sort((a, b) => b.credits_used_30d - a.credits_used_30d);
      const series = Array.from(daily.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, count]) => ({ day, count }));
      return {
        accounts,
        series,
        totals: {
          total_accounts: accounts.length,
          total_libraries: libs?.length ?? 0,
          total_scrapes_30d: snaps?.length ?? 0,
          total_credits_used_30d: accounts.reduce((s, a) => s + a.credits_used_30d, 0),
        },
      };
    }

    case "seedDemoData": {
      // reusa o seed existente para popular 3 bibliotecas demo
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const userId = args.userId as string;
      if (!userId) throw new Error("userId obrigatório");
      const seed = await import("@/lib/seed.functions");
      // chama a server fn existente — mas precisa de context. Reusamos a logica:
      // criamos 3 libs via admin client com created_by=userId
      const demo = [
        {
          url: "https://www.facebook.com/ads/library/?q=emagrecedor%20natural&country=BR",
          search_term: "emagrecedor natural",
          page_name: "Slim Health",
          niche: "Saúde",
          language: "PT",
          notes: "[DEMO] Oferta de 7 dias, mecanismo: chá termogênico",
        },
        {
          url: "https://www.facebook.com/ads/library/?q=curso%20de%20ingl%C3%AAs&country=BR",
          search_term: "curso de inglês",
          page_name: "Fluency Lab",
          niche: "Educação",
          language: "PT",
          notes: "[DEMO] Curso de 30 dias com garantia tripla",
        },
        {
          url: "https://www.facebook.com/ads/library/?q=investimento%20renda%20fixa&country=BR",
          search_term: "investimento renda fixa",
          page_name: "Capital Pro",
          niche: "Finanças",
          language: "PT",
          notes: "[DEMO] Webinar gratuito",
        },
      ];
      const inserted = [];
      for (const d of demo) {
        const { data, error } = await supabaseAdmin
          .from("libraries")
          .insert({ ...d, status: "active", created_by: userId })
          .select("id, page_name")
          .single();
        if (error) throw new Error(error.message);
        inserted.push(data);
      }
      void seed;
      return { ok: true, inserted };
    }

    default:
      throw new Error(`unknown admin fn: ${fn}`);
  }
}

interface ApiKeyStatus {
  provider: "firecrawl" | "scraperapi";
  name: string;
  label: string;
  configured: boolean;
  working: boolean;
  credits: number | null;
  limit: number | null;
  used: number | null;
  error: string | null;
  latency_ms: number | null;
  source: "env" | "db";
  id?: string | null;
}

async function checkFirecrawl(
  name: string,
  key: string,
  opts: { label?: string; source?: "env" | "db"; id?: string | null } = {},
): Promise<ApiKeyStatus> {
  const t0 = Date.now();
  const base: ApiKeyStatus = {
    provider: "firecrawl",
    name,
    label: opts.label ?? name,
    configured: true,
    working: false,
    credits: null,
    limit: null,
    used: null,
    error: null,
    latency_ms: null,
    source: opts.source ?? "env",
    id: opts.id ?? null,
  };
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch("https://api.firecrawl.dev/v1/team/credit-usage", {
      headers: { Authorization: `Bearer ${key}` },
      signal: ctrl.signal,
    });
    clearTimeout(to);
    base.latency_ms = Date.now() - t0;
    if (!res.ok) {
      base.error = `HTTP ${res.status}`;
      return base;
    }
    const j = (await res.json()) as {
      data?: { remaining_credits?: number; remainingCredits?: number };
    };
    const remaining = j?.data?.remaining_credits ?? j?.data?.remainingCredits ?? null;
    base.credits = typeof remaining === "number" ? remaining : null;
    base.working = true;
    return base;
  } catch (e) {
    base.latency_ms = Date.now() - t0;
    base.error = e instanceof Error ? e.message : "fetch failed";
    return base;
  }
}

async function checkScraperApi(
  name: string,
  key: string,
  opts: { label?: string; source?: "env" | "db"; id?: string | null } = {},
): Promise<ApiKeyStatus> {
  const t0 = Date.now();
  const base: ApiKeyStatus = {
    provider: "scraperapi",
    name,
    label: opts.label ?? name,
    configured: true,
    working: false,
    credits: null,
    limit: null,
    used: null,
    error: null,
    latency_ms: null,
    source: opts.source ?? "env",
    id: opts.id ?? null,
  };
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(
      `https://api.scraperapi.com/account?api_key=${encodeURIComponent(key)}`,
      { signal: ctrl.signal },
    );
    clearTimeout(to);
    base.latency_ms = Date.now() - t0;
    if (!res.ok) {
      base.error = `HTTP ${res.status}`;
      return base;
    }
    const j = (await res.json()) as { requestCount?: number; requestLimit?: number };
    const used = Number(j?.requestCount ?? 0);
    const limit = Number(j?.requestLimit ?? 0);
    base.used = used;
    base.limit = limit;
    base.credits = Math.max(0, limit - used);
    base.working = true;
    return base;
  } catch (e) {
    base.latency_ms = Date.now() - t0;
    base.error = e instanceof Error ? e.message : "fetch failed";
    return base;
  }
}
