
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS library_limit integer;

CREATE OR REPLACE FUNCTION public.enforce_library_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer;
  v_count integer;
  v_owner uuid;
BEGIN
  v_owner := COALESCE(NEW.created_by, auth.uid());
  IF v_owner IS NULL THEN
    RETURN NEW;
  END IF;
  IF public.has_role(v_owner, 'admin') THEN
    RETURN NEW;
  END IF;
  SELECT library_limit INTO v_limit FROM public.profiles WHERE id = v_owner;
  IF v_limit IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO v_count FROM public.libraries WHERE created_by = v_owner;
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Limite de bibliotecas atingido (% de %)', v_count, v_limit
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_library_limit_trg ON public.libraries;
CREATE TRIGGER enforce_library_limit_trg
  BEFORE INSERT ON public.libraries
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_library_limit();
