import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to realtime changes on snapshots, libraries, and creatives.
 * Invalidations are scoped to the affected library_id whenever possible,
 * so a write for library A does not refetch caches for libraries B, C, D…
 */
export function useRealtimeRefresh() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("adspy-dashboard")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "snapshots" },
        (payload) => {
          const libId = (payload.new as { library_id?: string } | null)?.library_id;
          // Aggregate views always need a refresh.
          qc.invalidateQueries({ queryKey: ["library_latest"] });
          qc.invalidateQueries({ queryKey: ["library_trend"] });
          qc.invalidateQueries({ queryKey: ["hourly_trend"] });
          qc.invalidateQueries({ queryKey: ["daily_library_stats"] });
          // Per-library caches: scope to the affected library only.
          if (libId) {
            qc.invalidateQueries({ queryKey: ["snapshots", libId] });
            qc.invalidateQueries({ queryKey: ["snapshots_history", libId] });
            qc.invalidateQueries({ queryKey: ["library_latest", libId] });
            qc.invalidateQueries({ queryKey: ["daily_library_stats", libId] });
          } else {
            qc.invalidateQueries({ queryKey: ["snapshots"] });
            qc.invalidateQueries({ queryKey: ["snapshots_history"] });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "libraries" },
        (payload) => {
          const libId =
            (payload.new as { id?: string } | null)?.id ??
            (payload.old as { id?: string } | null)?.id;
          qc.invalidateQueries({ queryKey: ["library_latest"] });
          if (libId) qc.invalidateQueries({ queryKey: ["library_latest", libId] });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "creatives" },
        (payload) => {
          const snapId = (payload.new as { snapshot_id?: string } | null)?.snapshot_id;
          if (snapId) {
            qc.invalidateQueries({
              queryKey: ["top_creatives"],
              predicate: (q) => q.queryKey.includes(snapId),
            });
          } else {
            qc.invalidateQueries({ queryKey: ["top_creatives"] });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "niches" },
        () => {
          qc.invalidateQueries({ queryKey: ["niches"] });
        },
      )
      .subscribe();


    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
