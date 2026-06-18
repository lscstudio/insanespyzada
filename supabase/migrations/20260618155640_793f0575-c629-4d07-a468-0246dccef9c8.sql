DROP VIEW IF EXISTS public.library_latest;
CREATE VIEW public.library_latest AS
SELECT l.id, l.url, l.title, l.search_term, l.page_name, l.niche, l.language, l.notes, l.status, l.created_at, l.updated_at,
  s.id AS latest_snapshot_id, s.captured_at, s.captured_at AS last_captured_at, s.active_ads_count, s.total_results_text,
  s.top_creative_id, s.top_creative_url, s.top_creative_count, s.unique_creatives, s.scrape_ok, s.error_message
FROM public.libraries l
LEFT JOIN LATERAL (
  SELECT s2.id, s2.library_id, s2.captured_at, s2.active_ads_count, s2.total_results_text,
    s2.top_creative_id, s2.top_creative_url, s2.top_creative_count, s2.unique_creatives, s2.scrape_ok, s2.error_message
  FROM public.snapshots s2 WHERE s2.library_id = l.id ORDER BY s2.captured_at DESC LIMIT 1
) s ON true;
GRANT SELECT ON public.library_latest TO authenticated;
GRANT ALL ON public.library_latest TO service_role;