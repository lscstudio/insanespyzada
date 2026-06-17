import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type {
  Creative,
  DailyLibraryStat,
  Library,
  LibraryLatest,
  LibraryTrend,
  Snapshot,
} from "@/lib/types";
import {
  mockCreatives,
  mockDailyStats,
  mockLibrariesLatest,
  mockLibraryTrend,
} from "@/lib/mock-data";

const FIVE_MIN = 5 * 60_000;

export function useLibrariesLatest() {
  return useQuery({
    queryKey: ["library_latest"],
    refetchInterval: FIVE_MIN,
    queryFn: async (): Promise<LibraryLatest[]> => {
      if (!isSupabaseConfigured) return mockLibrariesLatest;
      const { data, error } = await supabase
        .from("library_latest")
        .select("*")
        .order("active_ads_count", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as LibraryLatest[];
    },
  });
}

export function useLibraryTrend() {
  return useQuery({
    queryKey: ["library_trend"],
    refetchInterval: FIVE_MIN,
    queryFn: async (): Promise<LibraryTrend[]> => {
      if (!isSupabaseConfigured) return mockLibraryTrend;
      const { data, error } = await supabase.from("library_trend").select("*");
      if (error) throw error;
      return (data ?? []) as LibraryTrend[];
    },
  });
}

export function useDailyStats() {
  return useQuery({
    queryKey: ["daily_library_stats"],
    refetchInterval: FIVE_MIN,
    queryFn: async (): Promise<DailyLibraryStat[]> => {
      if (!isSupabaseConfigured) return mockDailyStats;
      const { data, error } = await supabase
        .from("daily_library_stats")
        .select("*")
        .order("day", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DailyLibraryStat[];
    },
  });
}

export function useLibrary(id: string) {
  return useQuery({
    queryKey: ["library_latest", id],
    refetchInterval: FIVE_MIN,
    queryFn: async (): Promise<LibraryLatest | null> => {
      if (!isSupabaseConfigured) return mockLibrariesLatest.find((l) => l.id === id) ?? null;
      const { data, error } = await supabase
        .from("library_latest")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as LibraryLatest) ?? null;
    },
  });
}

export function useLibrarySnapshots(id: string, hours = 48) {
  return useQuery({
    queryKey: ["snapshots", id, hours],
    refetchInterval: FIVE_MIN,
    queryFn: async (): Promise<Snapshot[]> => {
      if (!isSupabaseConfigured) return [];
      const since = new Date(Date.now() - hours * 3600_000).toISOString();
      const { data, error } = await supabase
        .from("snapshots")
        .select("*")
        .eq("library_id", id)
        .gte("captured_at", since)
        .order("captured_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Snapshot[];
    },
  });
}

export function useTopCreatives(libraryId: string, snapshotId: string | null) {
  return useQuery({
    queryKey: ["top_creatives", libraryId, snapshotId],
    enabled: Boolean(libraryId),
    refetchInterval: FIVE_MIN,
    queryFn: async (): Promise<Creative[]> => {
      if (!isSupabaseConfigured)
        return mockCreatives
          .filter((c) => c.library_id === libraryId)
          .sort((a, b) => (b.duplicate_count ?? 0) - (a.duplicate_count ?? 0));
      if (!snapshotId) return [];
      const { data, error } = await supabase
        .from("creatives")
        .select("*")
        .eq("snapshot_id", snapshotId)
        .order("duplicate_count", { ascending: false, nullsFirst: false })
        .limit(24);
      if (error) throw error;
      return (data ?? []) as Creative[];
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
      if (!isSupabaseConfigured) {
        // optimistic mock — do nothing persistent
        return { id: id ?? `lib-mock-${Date.now()}`, ...values } as unknown as Library;
      }
      if (id) {
        const { data, error } = await supabase
          .from("libraries")
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as Library;
      }
      const { data, error } = await supabase
        .from("libraries")
        .insert({ ...values, status: values.status ?? "active" })
        .select()
        .single();
      if (error) throw error;
      return data as Library;
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
      if (!isSupabaseConfigured) return;
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
      if (!isSupabaseConfigured) return;
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
