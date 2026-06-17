-- =====================================================
-- TABLES
-- =====================================================

CREATE TABLE public.libraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  search_term text,
  page_name text,
  niche text,
  language text,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid REFERENCES public.libraries(id) ON DELETE CASCADE,
  captured_at timestamptz NOT NULL DEFAULT now(),
  active_ads_count int NOT NULL DEFAULT 0,
  total_results_text text,
  top_creative_id text,
  top_creative_url text,
  top_creative_count int DEFAULT 0,
  unique_creatives int DEFAULT 0,
  scrape_ok boolean NOT NULL DEFAULT true,
  error_message text
);

CREATE TABLE public.creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid REFERENCES public.snapshots(id) ON DELETE CASCADE,
  library_id uuid REFERENCES public.libraries(id) ON DELETE CASCADE,
  ad_archive_id text,
  creative_hash text,
  duplicate_count int NOT NULL DEFAULT 1,
  preview_url text,
  media_type text,
  body_text text,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_snapshots_library_captured ON public.snapshots(library_id, captured_at DESC);
CREATE INDEX idx_snapshots_captured ON public.snapshots(captured_at DESC);
CREATE INDEX idx_creatives_snapshot ON public.creatives(snapshot_id);
CREATE INDEX idx_creatives_library ON public.creatives(library_id);
CREATE INDEX idx_libraries_status ON public.libraries(status);

-- =====================================================
-- GRANTS (required for Data API access)
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.libraries TO authenticated;
GRANT ALL ON public.libraries TO service_role;

GRANT SELECT ON public.snapshots TO authenticated;
GRANT ALL ON public.snapshots TO service_role;

GRANT SELECT ON public.creatives TO authenticated;
GRANT ALL ON public.creatives TO service_role;

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;

-- libraries: authenticated users can read & write everything
CREATE POLICY "Authenticated can read libraries"
  ON public.libraries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert libraries"
  ON public.libraries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update libraries"
  ON public.libraries FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete libraries"
  ON public.libraries FOR DELETE
  TO authenticated
  USING (true);

-- snapshots: read-only for authenticated; writes go through service_role
CREATE POLICY "Authenticated can read snapshots"
  ON public.snapshots FOR SELECT
  TO authenticated
  USING (true);

-- creatives: read-only for authenticated; writes go through service_role
CREATE POLICY "Authenticated can read creatives"
  ON public.creatives FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- updated_at trigger for libraries
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_libraries_updated_at
  BEFORE UPDATE ON public.libraries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- VIEWS (security_invoker so RLS applies as caller)
-- =====================================================

-- Latest snapshot per library, joined with the library
CREATE VIEW public.library_latest
WITH (security_invoker = on) AS
SELECT
  l.id,
  l.url,
  l.search_term,
  l.page_name,
  l.niche,
  l.language,
  l.notes,
  l.status,
  l.created_at,
  l.updated_at,
  s.id              AS latest_snapshot_id,
  s.captured_at,
  s.captured_at     AS last_captured_at,
  s.active_ads_count,
  s.total_results_text,
  s.top_creative_id,
  s.top_creative_url,
  s.top_creative_count,
  s.unique_creatives,
  s.scrape_ok,
  s.error_message
FROM public.libraries l
LEFT JOIN LATERAL (
  SELECT *
  FROM public.snapshots s2
  WHERE s2.library_id = l.id
  ORDER BY s2.captured_at DESC
  LIMIT 1
) s ON true;

-- Trend: latest snapshot vs previous snapshot per library
CREATE VIEW public.library_trend
WITH (security_invoker = on) AS
WITH ranked AS (
  SELECT
    s.library_id,
    s.active_ads_count,
    s.captured_at,
    LAG(s.active_ads_count) OVER (PARTITION BY s.library_id ORDER BY s.captured_at) AS prev_count,
    ROW_NUMBER() OVER (PARTITION BY s.library_id ORDER BY s.captured_at DESC)       AS rn
  FROM public.snapshots s
)
SELECT
  r.library_id,
  r.active_ads_count       AS current_active_ads,
  r.prev_count             AS previous_active_ads,
  (r.active_ads_count - COALESCE(r.prev_count, r.active_ads_count))::int AS delta,
  CASE
    WHEN r.prev_count IS NULL OR r.prev_count = 0 THEN 0
    ELSE ROUND(((r.active_ads_count - r.prev_count)::numeric / r.prev_count::numeric) * 100, 2)
  END                       AS delta_pct,
  CASE
    WHEN r.prev_count IS NULL                        THEN 'flat'
    WHEN r.active_ads_count >  r.prev_count          THEN 'up'
    WHEN r.active_ads_count <  r.prev_count          THEN 'down'
    ELSE 'flat'
  END                       AS trend_direction,
  r.captured_at             AS captured_at
FROM ranked r
WHERE r.rn = 1;

-- Daily aggregates (only successful scrapes)
CREATE VIEW public.daily_library_stats
WITH (security_invoker = on) AS
SELECT
  s.library_id,
  date_trunc('day', s.captured_at)::date AS day,
  AVG(s.active_ads_count)::numeric(12,2) AS avg_active_ads,
  MAX(s.active_ads_count)                AS max_active_ads,
  MIN(s.active_ads_count)                AS min_active_ads,
  MAX(s.top_creative_count)              AS max_top_creative_count,
  COUNT(*)                               AS snapshots_count
FROM public.snapshots s
WHERE s.scrape_ok = true
GROUP BY s.library_id, date_trunc('day', s.captured_at);

-- Grant SELECT on views to authenticated
GRANT SELECT ON public.library_latest      TO authenticated;
GRANT SELECT ON public.library_trend       TO authenticated;
GRANT SELECT ON public.daily_library_stats TO authenticated;
GRANT SELECT ON public.library_latest      TO service_role;
GRANT SELECT ON public.library_trend       TO service_role;
GRANT SELECT ON public.daily_library_stats TO service_role;