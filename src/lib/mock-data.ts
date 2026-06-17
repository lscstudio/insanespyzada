// Mock data used when Supabase isn't connected yet, so the UI is fully
// interactive immediately. Once you connect the integration, the real
// queries take over (see use-libraries.ts).

import type { LibraryLatest, LibraryTrend, DailyLibraryStat, Creative } from "./types";

const now = new Date();
const iso = (d: Date) => d.toISOString();
const minusHours = (h: number) => new Date(now.getTime() - h * 3600_000);
const minusDays = (d: number) => new Date(now.getTime() - d * 86400_000);

const baseLibs: Array<Partial<LibraryLatest>> = [
  {
    id: "lib-1",
    url: "https://www.facebook.com/ads/library/?q=emagrecedor%20natural&country=BR",
    search_term: "emagrecedor natural",
    page_name: "Slim Health",
    niche: "Saúde",
    language: "PT",
    notes: "Oferta de 7 dias, mecanismo: chá termogênico, angulo: antes/depois",
    status: "active",
    active_ads_count: 248,
    unique_creatives: 34,
    top_creative_count: 42,
    top_creative_url:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=70",
    scrape_ok: true,
  },
  {
    id: "lib-2",
    url: "https://www.facebook.com/ads/library/?q=curso%20de%20ingl%C3%AAs&country=BR",
    search_term: "curso de inglês",
    page_name: "Fluency Lab",
    niche: "Educação",
    language: "PT",
    notes: "Curso de 30 dias, garantia tripla.",
    status: "active",
    active_ads_count: 132,
    unique_creatives: 18,
    top_creative_count: 21,
    top_creative_url:
      "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&q=70",
    scrape_ok: true,
  },
  {
    id: "lib-3",
    url: "https://www.facebook.com/ads/library/?q=investimento%20renda%20fixa&country=BR",
    search_term: "investimento renda fixa",
    page_name: "Capital Pro",
    niche: "Finanças",
    language: "PT",
    notes: "Webinar gratuito, captura de leads.",
    status: "paused",
    active_ads_count: 57,
    unique_creatives: 9,
    top_creative_count: 12,
    top_creative_url:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=70",
    scrape_ok: false,
  },
];

export const mockLibrariesLatest: LibraryLatest[] = baseLibs.map((l, i) => ({
  id: l.id!,
  url: l.url!,
  search_term: l.search_term ?? null,
  page_name: l.page_name ?? null,
  niche: l.niche ?? null,
  language: l.language ?? null,
  notes: l.notes ?? null,
  status: (l.status as LibraryLatest["status"]) ?? "active",
  created_at: iso(minusDays(30 - i)),
  updated_at: iso(minusHours(2 + i)),
  latest_snapshot_id: `snap-${l.id}`,
  captured_at: iso(minusHours(1 + i)),
  active_ads_count: l.active_ads_count!,
  total_results_text: `${l.active_ads_count} resultados ativos`,
  top_creative_id: `cr-${l.id}-top`,
  top_creative_url: l.top_creative_url!,
  top_creative_count: l.top_creative_count!,
  unique_creatives: l.unique_creatives!,
  scrape_ok: l.scrape_ok ?? true,
  error_message: l.scrape_ok ? null : "Timeout ao carregar página",
}));

export const mockLibraryTrend: LibraryTrend[] = [
  {
    library_id: "lib-1",
    current_active_ads: 248,
    previous_active_ads: 210,
    delta: 38,
    delta_pct: 18.1,
    trend_direction: "up",
  },
  {
    library_id: "lib-2",
    current_active_ads: 132,
    previous_active_ads: 150,
    delta: -18,
    delta_pct: -12,
    trend_direction: "down",
  },
  {
    library_id: "lib-3",
    current_active_ads: 57,
    previous_active_ads: 57,
    delta: 0,
    delta_pct: 0,
    trend_direction: "flat",
  },
];

export const mockDailyStats: DailyLibraryStat[] = (() => {
  const days = 14;
  const out: DailyLibraryStat[] = [];
  for (const lib of mockLibrariesLatest) {
    let base = lib.active_ads_count! - 50;
    for (let i = days - 1; i >= 0; i--) {
      base += Math.round((Math.random() - 0.4) * 12);
      out.push({
        library_id: lib.id,
        day: minusDays(i).toISOString().slice(0, 10),
        avg_active_ads: Math.max(0, base),
        max_active_ads: Math.max(0, base + Math.round(Math.random() * 10)),
        min_active_ads: Math.max(0, base - Math.round(Math.random() * 10)),
        snapshots_count: 24,
      });
    }
  }
  return out;
})();

export const mockCreatives: Creative[] = mockLibrariesLatest.flatMap((lib) =>
  Array.from({ length: 6 }).map((_, i) => ({
    id: `cr-${lib.id}-${i}`,
    snapshot_id: lib.latest_snapshot_id!,
    library_id: lib.id,
    ad_archive_id: `${100000000 + i * 137 + lib.id.length}`,
    creative_hash: `${lib.id}-h${i}`,
    duplicate_count: Math.max(1, Math.round((lib.top_creative_count ?? 10) / (i + 1))),
    preview_url: lib.top_creative_url,
    media_type: i % 3 === 0 ? "video" : "image",
    body_text:
      "Descubra o método que está transformando resultados em apenas 7 dias. Garantia incondicional.",
    captured_at: lib.captured_at!,
  })),
);
