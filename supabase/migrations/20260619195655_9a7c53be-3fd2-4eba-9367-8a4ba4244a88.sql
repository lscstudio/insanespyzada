
-- Make niches a global, admin-managed catalog with realtime updates.

-- Drop owner-scoped trigger (niches no longer owned per-user)
DROP TRIGGER IF EXISTS trg_niches_set_owner ON public.niches;

-- Drop old per-user policies
DROP POLICY IF EXISTS "Niches: read own or admin" ON public.niches;
DROP POLICY IF EXISTS "Niches: insert own" ON public.niches;
DROP POLICY IF EXISTS "Niches: update own" ON public.niches;
DROP POLICY IF EXISTS "Niches: delete own" ON public.niches;

-- Anyone signed in can read all niches
CREATE POLICY "Niches: read all (auth)"
ON public.niches FOR SELECT TO authenticated
USING (true);

-- Only admins can write
CREATE POLICY "Niches: admin insert"
ON public.niches FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Niches: admin update"
ON public.niches FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Niches: admin delete"
ON public.niches FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Ensure unique global names (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS niches_name_unique_ci ON public.niches (lower(name));

-- Realtime: broadcast changes to all clients
ALTER TABLE public.niches REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'niches'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.niches';
  END IF;
END $$;
