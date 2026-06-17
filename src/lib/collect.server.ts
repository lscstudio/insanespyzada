/**
 * Meta Ad Library collector — server-only.
 *
 * Uses Firecrawl to render the JS-heavy Ad Library page, then parses the
 * resulting HTML for:
 *   - active ads count ("~123 results" / "~123 resultados" / "Sobre 123")
 *   - creative image/video URLs from Meta's CDN (fbcdn.net, cdninstagram.com)
 *   - dedupes creatives by URL hash to estimate `unique_creatives` and pick
 *     the most-repeated one as the "top creative"
 *
 * Meta blocks raw server fetches, so Firecrawl (JS rendering + residential
 * routing) is required. Set the FIRECRAWL_API_KEY env var.
 */

import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/integrations/supabase/types";

type LibraryRow = Database["public"]["Tables"]["libraries"]["Row"];

interface ParsedResult {
  active_ads_count: number;
  total_results_text: string | null;
  unique_creatives: number;
  top_creative_url: string | null;
  top_creative_id: string | null;
  top_creative_count: number;
  creatives: Array<{
    creative_hash: string;
    preview_url: string;
    media_type: "image" | "video";
    duplicate_count: number;
    ad_archive_id: string | null;
  }>;
}

export interface CollectReport {
  libraries_total: number;
  libraries_ok: number;
  libraries_failed: number;
  duration_ms: number;
  details: Array<{
    library_id: string;
    label: string;
    ok: boolean;
    active_ads_count?: number;
    unique_creatives?: number;
    error?: string;
  }>;
}

function getAdmin(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes no servidor.");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Call Firecrawl v2 scrape and return rendered HTML + markdown. */
async function firecrawlScrape(url: string): Promise<{ html: string; markdown: string }> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error(
      "FIRECRAWL_API_KEY não configurada. Conecte o Firecrawl em Configurações para ativar a coleta.",
    );
  }

  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["html", "markdown"],
      onlyMainContent: false,
      waitFor: 6000,
      timeout: 60000,
      location: { country: "BR", languages: ["pt-BR", "pt"] },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Firecrawl ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: { html?: string; markdown?: string };
    html?: string;
    markdown?: string;
  };
  if (json.success === false) throw new Error(json.error || "Firecrawl falhou");
  const html = json.data?.html ?? json.html ?? "";
  const markdown = json.data?.markdown ?? json.markdown ?? "";
  if (!html && !markdown) throw new Error("Firecrawl não retornou conteúdo renderizado");
  return { html, markdown };
}

/** Hash any string into a short stable id. */
function hash(...parts: Array<string | null | undefined>): string {
  return crypto
    .createHash("sha1")
    .update(parts.filter(Boolean).join("|"))
    .digest("hex")
    .slice(0, 16);
}

/** Parse Meta Ad Library rendered page. */
export function parseAdLibraryPage(html: string, markdown: string): ParsedResult {
  const corpus = `${markdown}\n${html}`;

  // ---- Active ads count -----------------------------------------------
  // Examples Meta uses:
  //   "~1,234 results"  /  "Showing 5 results"  /  "About 5 results"
  //   "~1.234 resultados"  /  "Mostrando 5 resultados"  /  "Sobre 5 resultados"
  const countPatterns = [
    /[~≈]\s*([\d.,]+)\s*(?:results?|resultados?|anúncios?|ads)/i,
    /(?:showing|mostrando|exibindo)\s*([\d.,]+)\s*(?:results?|resultados?|anúncios?|ads)/i,
    /(?:about|sobre|aproximadamente|cerca de)\s*([\d.,]+)\s*(?:results?|resultados?|anúncios?|ads)/i,
    /([\d.,]+)\s*(?:results?|resultados?|anúncios? ativos|ads found)/i,
  ];
  let totalText: string | null = null;
  let count = 0;
  for (const re of countPatterns) {
    const m = corpus.match(re);
    if (m) {
      totalText = m[0].trim();
      count = parseInt(m[1].replace(/[.,]/g, ""), 10) || 0;
      break;
    }
  }

  // ---- Creative URLs --------------------------------------------------
  // Meta CDN domains: scontent*.fbcdn.net, video.fbcdn.net, *.cdninstagram.com
  const urlRe =
    /https?:\/\/[^\s"'<>)]+?(?:fbcdn\.net|cdninstagram\.com)\/[^\s"'<>)]+?\.(?:jpe?g|png|webp|mp4|gif)(?:\?[^\s"'<>)]*)?/gi;
  const found = new Map<string, { url: string; count: number; media: "image" | "video" }>();
  for (const m of html.matchAll(urlRe)) {
    const u = m[0];
    // Normalize: strip cache-busting query string for dedupe
    const norm = u.split("?")[0];
    const media: "image" | "video" = /\.mp4(\?|$)/i.test(u) ? "video" : "image";
    const cur = found.get(norm);
    if (cur) cur.count += 1;
    else found.set(norm, { url: u, count: 1, media });
  }

  // ---- ad_archive_id (best-effort) -----------------------------------
  // Meta exposes IDs in URLs like ?id=123456789012345 inside the page
  const idRe = /[?&]id=(\d{8,})/g;
  const ids: string[] = [];
  for (const m of html.matchAll(idRe)) ids.push(m[1]);

  const creativesArr = Array.from(found.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 60)
    .map((c, i) => ({
      creative_hash: hash(c.url),
      preview_url: c.url,
      media_type: c.media,
      duplicate_count: c.count,
      ad_archive_id: ids[i] ?? null,
    }));

  const top = creativesArr[0];

  return {
    active_ads_count: count || creativesArr.length, // fallback to creative count
    total_results_text: totalText,
    unique_creatives: creativesArr.length,
    top_creative_url: top?.preview_url ?? null,
    top_creative_id: top?.ad_archive_id ?? (top ? top.creative_hash : null),
    top_creative_count: top?.duplicate_count ?? 0,
    creatives: creativesArr,
  };
}

/** Collect a single library and write snapshot + creatives. */
async function collectOne(
  sb: SupabaseClient<Database>,
  lib: LibraryRow,
): Promise<{ ok: boolean; parsed?: ParsedResult; error?: string }> {
  try {
    const { html, markdown } = await firecrawlScrape(lib.url);
    const parsed = parseAdLibraryPage(html, markdown);

    const snapshotPayload: TablesInsert<"snapshots"> = {
      library_id: lib.id,
      captured_at: new Date().toISOString(),
      scrape_ok: true,
      active_ads_count: parsed.active_ads_count,
      unique_creatives: parsed.unique_creatives,
      top_creative_id: parsed.top_creative_id,
      top_creative_url: parsed.top_creative_url,
      top_creative_count: parsed.top_creative_count,
      total_results_text: parsed.total_results_text,
      error_message: null,
    };

    const { data: snap, error: snapErr } = await sb
      .from("snapshots")
      .insert(snapshotPayload)
      .select()
      .single();
    if (snapErr) throw snapErr;

    if (parsed.creatives.length > 0) {
      const rows: TablesInsert<"creatives">[] = parsed.creatives.map((c) => ({
        library_id: lib.id,
        snapshot_id: snap.id,
        captured_at: snap.captured_at,
        ad_archive_id: c.ad_archive_id,
        creative_hash: c.creative_hash,
        preview_url: c.preview_url,
        media_type: c.media_type,
        duplicate_count: c.duplicate_count,
      }));
      const { error: crErr } = await sb.from("creatives").insert(rows);
      if (crErr) throw crErr;
    }

    return { ok: true, parsed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Record the failure so the UI shows the "falha na última coleta" badge.
    await sb.from("snapshots").insert({
      library_id: lib.id,
      captured_at: new Date().toISOString(),
      scrape_ok: false,
      active_ads_count: 0,
      unique_creatives: 0,
      top_creative_count: 0,
      error_message: message.slice(0, 500),
    });
    return { ok: false, error: message };
  }
}

export async function runCollection(opts?: { libraryId?: string }): Promise<CollectReport> {
  const started = Date.now();
  const sb = getAdmin();

  let query = sb.from("libraries").select("*").eq("status", "active");
  if (opts?.libraryId) query = query.eq("id", opts.libraryId);
  const { data: libraries, error } = await query;
  if (error) throw error;

  const details: CollectReport["details"] = [];
  let ok = 0;
  let failed = 0;

  for (const lib of libraries ?? []) {
    const label = lib.search_term || lib.page_name || lib.id;
    const r = await collectOne(sb, lib);
    if (r.ok) {
      ok += 1;
      details.push({
        library_id: lib.id,
        label,
        ok: true,
        active_ads_count: r.parsed!.active_ads_count,
        unique_creatives: r.parsed!.unique_creatives,
      });
    } else {
      failed += 1;
      details.push({ library_id: lib.id, label, ok: false, error: r.error });
    }
    // Politeness delay between libraries
    await new Promise((res) => setTimeout(res, 1200));
  }

  return {
    libraries_total: (libraries ?? []).length,
    libraries_ok: ok,
    libraries_failed: failed,
    duration_ms: Date.now() - started,
    details,
  };
}
