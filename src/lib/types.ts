// Domain types matching the existing Supabase schema (read-only mirror).

export type LibraryStatus = "active" | "paused" | "archived";

export interface Library {
  id: string;
  url: string;
  search_term: string | null;
  page_name: string | null;
  niche: string | null;
  language: string | null;
  notes: string | null;
  status: LibraryStatus;
  created_at: string;
  updated_at: string;
}

export interface Snapshot {
  id: string;
  library_id: string;
  captured_at: string;
  active_ads_count: number | null;
  total_results_text: string | null;
  top_creative_id: string | null;
  top_creative_url: string | null;
  top_creative_count: number | null;
  unique_creatives: number | null;
  scrape_ok: boolean;
  error_message: string | null;
}

export interface Creative {
  id: string;
  snapshot_id: string;
  library_id: string;
  ad_archive_id: string | null;
  creative_hash: string | null;
  duplicate_count: number | null;
  preview_url: string | null;
  media_type: string | null;
  body_text: string | null;
  captured_at: string;
}

// View: library_latest = library + latest snapshot fields
export interface LibraryLatest extends Library {
  latest_snapshot_id: string | null;
  captured_at: string | null;
  active_ads_count: number | null;
  total_results_text: string | null;
  top_creative_id: string | null;
  top_creative_url: string | null;
  top_creative_count: number | null;
  unique_creatives: number | null;
  scrape_ok: boolean | null;
  error_message: string | null;
}

// View: library_trend = comparison vs previous snapshot
export interface LibraryTrend {
  library_id: string;
  current_active_ads: number | null;
  previous_active_ads: number | null;
  delta: number | null;
  delta_pct: number | null;
  trend_direction: "up" | "down" | "flat" | null;
}

// View: daily_library_stats = aggregated per day
export interface DailyLibraryStat {
  library_id: string;
  day: string; // YYYY-MM-DD
  avg_active_ads: number | null;
  max_active_ads: number | null;
  min_active_ads: number | null;
  snapshots_count: number | null;
}

export interface Niche {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export type HourlyDirection = "up" | "down" | "flat";

export interface HourlyTrend {
  library_id: string;
  direction: HourlyDirection;
  delta: number;
  from: number;
  to: number;
}
