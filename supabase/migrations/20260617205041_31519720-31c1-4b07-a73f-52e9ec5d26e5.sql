
CREATE OR REPLACE FUNCTION public.set_library_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS libraries_set_created_by ON public.libraries;
CREATE TRIGGER libraries_set_created_by
BEFORE INSERT ON public.libraries
FOR EACH ROW EXECUTE FUNCTION public.set_library_created_by();
