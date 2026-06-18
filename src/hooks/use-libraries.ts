import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  Creative,
  DailyLibraryStat,
  HourlyTrend,
  Library,
  LibraryLatest,
  LibraryTrend,
  Niche,
  Snapshot,
} from "@/lib/types";

const FIVE_MIN = 5 * 60_000;
const ONE_MIN = 60_000;

export function useLibrariesLatest() {
  return useQuery({
    queryKey: ["library_latest"],
    refetchInterval: FIVE_MIN,
    queryFn: async (): Promise<LibraryLatest[]> => {
      const { data, error } = await supabase
        .from("library_latest" as never)
        .select("*")
        .order("active_ads_count", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as LibraryLatest[];
    },
  });
}

export function useLibraryTrend() {
  return useQuery({
    queryKey: ["library_trend"],
    refetchInterval: FIVE_MIN,
    queryFn: async (): Promise<LibraryTrend[]> => {
      const { data, error } = await supabase.from("library_trend" as never).select("*");
      if (error) throw error;
      return (data ?? []) as unknown as LibraryTrend[];
    },
  });
}

/**
 * Trend = comparação entre as duas últimas coletas bem-sucedidas de cada
 * biblioteca, independente do intervalo (hora, dia, etc).
 * Seta verde se subiu, vermelha se caiu, neutra se igual.
 */
export function useHourlyTrend() {
  return useQuery({
    queryKey: ["hourly_trend"],
    refetchInterval: ONE_MIN,
    queryFn: async (): Promise<Record<string, HourlyTrend>> => {
      // 48h cobre o caso de coletas que falharam por algumas horas.
      const since = new Date(Date.now() - 48 * 3600_000).toISOString();
      const { data, error } = await supabase
        .from("snapshots")
        .select("library_id, captured_at, active_ads_count, scrape_ok")
        .gte("captured_at", since)
        .eq("scrape_ok", true)
        .order("captured_at", { ascending: false });
      if (error) throw error;

      const groups = new Map<string, { ts: number; v: number }[]>();
      for (const row of (data ?? []) as Array<{
        library_id: string;
        captured_at: string;
        active_ads_count: number | null;
      }>) {
        const list = groups.get(row.library_id) ?? [];
        list.push({ ts: new Date(row.captured_at).getTime(), v: row.active_ads_count ?? 0 });
        groups.set(row.library_id, list);
      }

      const out: Record<string, HourlyTrend> = {};
      for (const [libId, list] of groups) {
        if (list.length === 0) continue;
        const latest = list[0]; // já vem desc
        const previous = list[1];
        if (!previous) {
          out[libId] = { library_id: libId, direction: "flat", delta: 0, from: latest.v, to: latest.v };
          continue;
        }
        const delta = latest.v - previous.v;
        const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
        out[libId] = { library_id: libId, direction, delta, from: previous.v, to: latest.v };
      }
      return out;
    },
  });
}

export function useDailyStats() {
  return useQuery({
    queryKey: ["daily_library_stats"],
    refetchInterval: FIVE_MIN,
    queryFn: async (): Promise<DailyLibraryStat[]> => {
      const { data, error } = await supabase
        .from("daily_library_stats" as never)
        .select("*")
        .order("day", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as DailyLibraryStat[];
    },
  });
}

export function useLibrary(id: string) {
  return useQuery({
    queryKey: ["library_latest", id],
    refetchInterval: FIVE_MIN,
    queryFn: async (): Promise<LibraryLatest | null> => {
      const { data, error } = await supabase
        .from("library_latest" as never)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as LibraryLatest) ?? null;
    },
  });
}

export function useLibrarySnapshots(id: string, hours = 48) {
  return useQuery({
    queryKey: ["snapshots", id, hours],
    refetchInterval: FIVE_MIN,
    queryFn: async (): Promise<Snapshot[]> => {
      const since = new Date(Date.now() - hours * 3600_000).toISOString();
      const { data, error } = await supabase
        .from("snapshots")
        .select("*")
        .eq("library_id", id)
        .gte("captured_at", since)
        .order("captured_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Snapshot[];
    },
  });
}

export function useLibrarySnapshotsHistory(id: string, limit = 50) {
  return useQuery({
    queryKey: ["snapshots_history", id, limit],
    refetchInterval: FIVE_MIN,
    queryFn: async (): Promise<Snapshot[]> => {
      const { data, error } = await supabase
        .from("snapshots")
        .select("*")
        .eq("library_id", id)
        .order("captured_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as Snapshot[];
    },
  });
}

export function useDailyStatsForLibrary(id: string) {
  return useQuery({
    queryKey: ["daily_library_stats", id],
    refetchInterval: FIVE_MIN,
    queryFn: async (): Promise<DailyLibraryStat[]> => {
      const { data, error } = await supabase
        .from("daily_library_stats" as never)
        .select("*")
        .eq("library_id", id)
        .order("day", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as DailyLibraryStat[];
    },
  });
}

export function useTopCreatives(libraryId: string, snapshotId: string | null) {
  return useQuery({
    queryKey: ["top_creatives", libraryId, snapshotId],
    enabled: Boolean(libraryId && snapshotId),
    refetchInterval: FIVE_MIN,
    queryFn: async (): Promise<Creative[]> => {
      if (!snapshotId) return [];
      const { data, error } = await supabase
        .from("creatives")
        .select("*")
        .eq("snapshot_id", snapshotId)
        .order("duplicate_count", { ascending: false, nullsFirst: false })
        .limit(24);
      if (error) throw error;
      return (data ?? []) as unknown as Creative[];
    },
  });
}

export interface LibraryFormData {
  url: string;
  title?: string | null;
  search_term?: string | null;
  page_name?: string | null;
  niche?: string | null;
  language?: string | null;
  notes?: string | null;
  status?: Library["status"];
}

export function useSaveLibrary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: LibraryFormData }) => {
      if (id) {
        const { data, error } = await supabase
          .from("libraries")
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as unknown as Library;
      }
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("libraries")
        .insert({
          ...values,
          status: values.status ?? "active",
          created_by: userData.user?.id ?? null,
        } as never)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Library;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      qc.invalidateQueries({ queryKey: ["library_latest"] });
      qc.invalidateQueries({ queryKey: ["library_trend"] });
    },
  });
}

export function useDeleteLibrary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("libraries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library_latest"] });
    },
  });
}

export function useToggleLibraryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Library["status"] }) => {
      const { error } = await supabase
        .from("libraries")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library_latest"] });
    },
  });
}

// =================== Niches CRUD ===================

export function useNiches() {
  return useQuery({
    queryKey: ["niches"],
    queryFn: async (): Promise<Niche[]> => {
      const { data, error } = await supabase
        .from("niches" as never)
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Niche[];
    },
  });
}

export function useCreateNiche() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Nome do nicho é obrigatório");
      const { data, error } = await supabase
        .from("niches" as never)
        .insert({ name: trimmed } as never)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Niche;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["niches"] }),
  });
}

export function useUpdateNiche() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, previousName }: { id: string; name: string; previousName: string }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Nome do nicho é obrigatório");
      const { error } = await supabase
        .from("niches" as never)
        .update({ name: trimmed } as never)
        .eq("id", id);
      if (error) throw error;
      // Cascade rename on libraries that referenced the old name (text field).
      if (previousName && previousName !== trimmed) {
        await supabase
          .from("libraries")
          .update({ niche: trimmed })
          .eq("niche", previousName);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["niches"] });
      qc.invalidateQueries({ queryKey: ["library_latest"] });
    },
  });
}

export function useDeleteNiche() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("niches" as never).delete().eq("id", id);
      if (error) throw error;
      // Clear the niche label from libraries that used it.
      await supabase.from("libraries").update({ niche: null }).eq("niche", name);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["niches"] });
      qc.invalidateQueries({ queryKey: ["library_latest"] });
    },
  });
}
