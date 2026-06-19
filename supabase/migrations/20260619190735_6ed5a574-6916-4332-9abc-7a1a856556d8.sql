DROP VIEW IF EXISTS public.library_trend;

CREATE VIEW public.library_trend
WITH (security_invoker = true)
AS
SELECT
  l.id                        AS library_id,
  a.active_ads_count          AS current_count,
  b.active_ads_count          AS previous_count,
  COALESCE(a.active_ads_count, 0) - COALESCE(b.active_ads_count, 0) AS delta,
  CASE
    WHEN b.active_ads_count IS NULL THEN 'flat'
    WHEN a.active_ads_count > b.active_ads_count THEN 'up'
    WHEN a.active_ads_count < b.active_ads_count THEN 'down'
    ELSE 'flat'
  END                         AS direction,
  a.captured_at               AS current_at,
  b.captured_at               AS previous_at
FROM public.libraries l
LEFT JOIN LATERAL (
  SELECT s.active_ads_count, s.captured_at
  FROM public.snapshots s
  WHERE s.library_id = l.id AND s.scrape_ok = true
  ORDER BY s.captured_at DESC
  LIMIT 1
) a ON true
LEFT JOIN LATERAL (
  SELECT s.active_ads_count, s.captured_at
  FROM public.snapshots s
  WHERE s.library_id = l.id AND s.scrape_ok = true
  ORDER BY s.captured_at DESC
  OFFSET 1 LIMIT 1
) b ON true;

GRANT SELECT ON public.library_trend TO authenticated;
GRANT SELECT ON public.library_trend TO service_role;

CREATE INDEX IF NOT EXISTS idx_niches_owner_id ON public.niches(owner_id);

CREATE INDEX IF NOT EXISTS idx_snapshots_ok_library_captured
  ON public.snapshots(library_id, captured_at DESC)
  WHERE scrape_ok = true;

DO $$
BEGIN
  PERFORM cron.unschedule('adspy-purge-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'adspy-purge-daily',
  '17 3 * * *',
  $$SELECT public.purge_old_snapshots(90);$$
);