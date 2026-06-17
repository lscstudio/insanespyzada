
REVOKE EXECUTE ON FUNCTION public.purge_old_snapshots(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_snapshots(integer) TO service_role;
