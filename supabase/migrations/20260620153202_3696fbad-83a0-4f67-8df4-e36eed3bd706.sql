ALTER TABLE public.libraries
  ADD COLUMN IF NOT EXISTS collection_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_collection_ok_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_collection_error text;

CREATE INDEX IF NOT EXISTS libraries_collection_started_at_idx
  ON public.libraries (collection_started_at)
  WHERE collection_started_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS libraries_last_collection_ok_at_idx
  ON public.libraries (last_collection_ok_at DESC);