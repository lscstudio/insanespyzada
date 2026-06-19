import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

const FC_NAMES = ["FIRECRAWL_API_KEY", "FIRECRAWL_API_KEY_2", "FIRECRAWL_API_KEY_3", "FIRECRAWL_API_KEY_4"];
const SA_NAMES = ["SCRAPERAPI_KEY", "SCRAPERAPI_KEY_2", "SCRAPERAPI_KEY_3"];

interface DbKeyRow {
  id: string;
  provider: "firecrawl" | "scraperapi";
  label: string;
  key: string;
  active: boolean;
  created_at: string;
}

export type ApiProvider = "firecrawl" | "scraperapi";
export interface ApiKeyStatus {
  provider: ApiProvider;
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

async function checkFirecrawl(name: string, key: string): Promise<ApiKeyStatus> {
  const t0 = Date.now();
  const base: ApiKeyStatus = {
    provider: "firecrawl", name, label: name.replace("FIRECRAWL_API_KEY", "Firecrawl"),
    configured: true, working: false, credits: null, limit: null, used: null, error: null, latency_ms: null,
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
    const j: any = await res.json();
    const remaining = j?.data?.remaining_credits ?? j?.data?.remainingCredits ?? null;
    base.credits = typeof remaining === "number" ? remaining : null;
    base.working = true;
    return base;
  } catch (e: any) {
    base.latency_ms = Date.now() - t0;
    base.error = e?.message || "fetch failed";
    return base;
  }
}

async function checkScraperApi(name: string, key: string): Promise<ApiKeyStatus> {
  const t0 = Date.now();
  const base: ApiKeyStatus = {
    provider: "scraperapi", name, label: name.replace("SCRAPERAPI_KEY", "ScraperAPI"),
    configured: true, working: false, credits: null, limit: null, used: null, error: null, latency_ms: null,
  };
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(`https://api.scraperapi.com/account?api_key=${encodeURIComponent(key)}`, {
      signal: ctrl.signal,
    });
    clearTimeout(to);
    base.latency_ms = Date.now() - t0;
    if (!res.ok) {
      base.error = `HTTP ${res.status}`;
      return base;
    }
    const j: any = await res.json();
    const used = Number(j?.requestCount ?? 0);
    const limit = Number(j?.requestLimit ?? 0);
    base.used = used;
    base.limit = limit;
    base.credits = Math.max(0, limit - used);
    base.working = true;
    return base;
  } catch (e: any) {
    base.latency_ms = Date.now() - t0;
    base.error = e?.message || "fetch failed";
    return base;
  }
}

export const getApiPoolStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    const fcChecks = FC_NAMES
      .map((n) => ({ n, v: process.env[n] }))
      .filter((x) => !!x.v)
      .map((x) => checkFirecrawl(x.n, x.v as string));
    const saChecks = SA_NAMES
      .map((n) => ({ n, v: process.env[n] }))
      .filter((x) => !!x.v)
      .map((x) => checkScraperApi(x.n, x.v as string));

    const results = await Promise.all([...fcChecks, ...saChecks]);

    // also include unconfigured slots so admin sees missing keys
    for (const n of FC_NAMES) {
      if (!process.env[n]) {
        results.push({
          provider: "firecrawl", name: n, label: n.replace("FIRECRAWL_API_KEY", "Firecrawl"),
          configured: false, working: false, credits: null, limit: null, used: null,
          error: "não configurada", latency_ms: null,
        });
      }
    }
    for (const n of SA_NAMES) {
      if (!process.env[n]) {
        results.push({
          provider: "scraperapi", name: n, label: n.replace("SCRAPERAPI_KEY", "ScraperAPI"),
          configured: false, working: false, credits: null, limit: null, used: null,
          error: "não configurada", latency_ms: null,
        });
      }
    }

    const configured = results.filter((r) => r.configured).length;
    const working = results.filter((r) => r.working).length;
    const totalCredits = results.reduce((s, r) => s + (r.credits ?? 0), 0);

    return {
      keys: results,
      summary: {
        total_slots: results.length,
        configured,
        working,
        broken: configured - working,
        total_credits: totalCredits,
        firecrawl_credits: results.filter((r) => r.provider === "firecrawl").reduce((s, r) => s + (r.credits ?? 0), 0),
        scraperapi_credits: results.filter((r) => r.provider === "scraperapi").reduce((s, r) => s + (r.credits ?? 0), 0),
      },
    };
  });

export const getUsageRanking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: users }, { data: libs }, { data: snaps }] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      supabaseAdmin.from("libraries").select("id, created_by, created_at"),
      supabaseAdmin
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
    const daily = new Map<string, number>(); // YYYY-MM-DD -> count
    for (const s of snaps ?? []) {
      const owner = s.library_id ? libToOwner.get(s.library_id) ?? "_orphan" : "_orphan";
      snapsByOwner.set(owner, (snapsByOwner.get(owner) ?? 0) + 1);
      if (s.scrape_ok) snapsOkByOwner.set(owner, (snapsOkByOwner.get(owner) ?? 0) + 1);
      const day = s.captured_at.slice(0, 10);
      daily.set(day, (daily.get(day) ?? 0) + 1);
    }

    const accounts = (users?.users ?? []).map((u) => {
      const libCount = libsByOwner.get(u.id) ?? 0;
      const scrapes = snapsByOwner.get(u.id) ?? 0;
      const scrapesOk = snapsOkByOwner.get(u.id) ?? 0;
      // créditos consumidos estimados: cada scrape ok ≈ 1 crédito FC/SA
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

    const totals = {
      total_accounts: accounts.length,
      total_libraries: libs?.length ?? 0,
      total_scrapes_30d: snaps?.length ?? 0,
      total_credits_used_30d: accounts.reduce((s, a) => s + a.credits_used_30d, 0),
    };

    return { accounts, series, totals };
  });
