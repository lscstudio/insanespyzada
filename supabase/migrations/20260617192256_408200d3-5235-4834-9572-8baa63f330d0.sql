
-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.libraries;
ALTER TABLE public.snapshots REPLICA IDENTITY FULL;
ALTER TABLE public.libraries REPLICA IDENTITY FULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_snapshots_library_captured_desc
  ON public.snapshots (library_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_captured_at
  ON public.snapshots (captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_creatives_snapshot
  ON public.creatives (snapshot_id);
CREATE INDEX IF NOT EXISTS idx_creatives_library_captured
  ON public.creatives (library_id, captured_at DESC);

-- Retention helper (callable from pg_cron or server fn)
CREATE OR REPLACE FUNCTION public.purge_old_snapshots(days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted integer;
BEGIN
  WITH del AS (
    DELETE FROM public.snapshots
    WHERE captured_at < now() - (days || ' days')::interval
    RETURNING 1
  )
  SELECT count(*) INTO deleted FROM del;
  RETURN deleted;
END;
$$;
