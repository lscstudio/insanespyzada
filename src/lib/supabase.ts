// Thin Supabase client wrapper.
// When you connect Supabase via the Lovable integration, the generated
// client will live at @/integrations/supabase/client. Until then, we
// fall back to env vars (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY)
// or a stub that returns empty data so the UI keeps rendering.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  (import.meta.env.SUPABASE_URL as string | undefined);
const key =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

export const isSupabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : (createClient("http://localhost:54321", "stub-anon-key") as SupabaseClient);
