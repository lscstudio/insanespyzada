
-- Fix 1: Disallow null created_by on libraries insert
DROP POLICY IF EXISTS "Libraries: insert own" ON public.libraries;
CREATE POLICY "Libraries: insert own"
  ON public.libraries FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Fix 2: Lock down SECURITY DEFINER trigger functions (called via triggers, not RPC)
REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_niche_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_library_created_by() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_old_snapshots(integer) FROM PUBLIC, anon, authenticated;
