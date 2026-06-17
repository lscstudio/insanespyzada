
-- Lock down SECURITY DEFINER functions: revoke broad EXECUTE, then grant only where needed.
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_old_snapshots(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_library_created_by() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- has_role is used inside RLS policies evaluated as the authenticated role
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Explicitly block client writes on creatives (defense-in-depth; service_role bypasses RLS).
CREATE POLICY "Block client inserts on creatives" ON public.creatives
  FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "Block client updates on creatives" ON public.creatives
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Block client deletes on creatives" ON public.creatives
  FOR DELETE TO authenticated, anon USING (false);

-- Same hardening for snapshots (also write-only via service_role).
CREATE POLICY "Block client inserts on snapshots" ON public.snapshots
  FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "Block client updates on snapshots" ON public.snapshots
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Block client deletes on snapshots" ON public.snapshots
  FOR DELETE TO authenticated, anon USING (false);
