import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to realtime changes on snapshots and libraries.
 * When the external collector writes new data, the dashboard auto-refreshes.
 */
export function useRealtimeRefresh() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("adspy-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "snapshots" },
        () => {
          qc.invalidateQueries({ queryKey: ["library_latest"] });
          qc.invalidateQueries({ queryKey: ["library_trend"] });
          qc.invalidateQueries({ queryKey: ["daily_library_stats"] });
          qc.invalidateQueries({ queryKey: ["snapshots"] });
          qc.invalidateQueries({ queryKey: ["snapshots_history"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "libraries" },
        () => {
          qc.invalidateQueries({ queryKey: ["library_latest"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "creatives" },
        () => {
          qc.invalidateQueries({ queryKey: ["top_creatives"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
