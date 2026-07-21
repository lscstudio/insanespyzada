import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export async function callAdmin<T = unknown>(
  fn: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ fn, args }),
  });
  const json = (await res.json()) as { ok?: boolean; data?: T; error?: string };
  if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.data as T;
}

export function useAdminCheck() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        setIsAdmin(null);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("has_role" as never, {
        _user_id: userId,
        _role: "admin",
      });
      if (error) {
        setIsAdmin(null);
      } else {
        setIsAdmin(Boolean(data));
      }
    } catch {
      setIsAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  return { isAdmin, loading, recheck: check };
}
