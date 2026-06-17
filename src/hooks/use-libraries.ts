import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  Creative,
  DailyLibraryStat,
  Library,
  LibraryLatest,
  LibraryTrend,
  Snapshot,
} from "@/lib/types";

const FIVE_MIN = 5 * 60_000;

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
      const { data, error } = await supabase
        .from("libraries")
        .insert({ ...values, status: values.status ?? "active" } as never)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Library;
    },
    onSuccess: () => {
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
