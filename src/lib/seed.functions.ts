import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TablesInsert } from "@/integrations/supabase/types";

// Inserts 3 demo libraries with 14 days of fake snapshots/creatives so the
// dashboard has data to plot before the real collector runs. Uses the admin
// client so it can write to snapshots/creatives (which only accept service_role
// writes by design).
export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const demo = [
      {
        url: "https://www.facebook.com/ads/library/?q=emagrecedor%20natural&country=BR",
        search_term: "emagrecedor natural",
        page_name: "Slim Health",
        niche: "Saúde",
        language: "PT",
        notes: "[DEMO] Oferta de 7 dias, mecanismo: chá termogênico",
        baseline: 180,
      },
      {
        url: "https://www.facebook.com/ads/library/?q=curso%20de%20ingl%C3%AAs&country=BR",
        search_term: "curso de inglês",
        page_name: "Fluency Lab",
        niche: "Educação",
        language: "PT",
        notes: "[DEMO] Curso de 30 dias com garantia tripla",
        baseline: 90,
      },
      {
        url: "https://www.facebook.com/ads/library/?q=investimento%20renda%20fixa&country=BR",
        search_term: "investimento renda fixa",
        page_name: "Capital Pro",
        niche: "Finanças",
        language: "PT",
        notes: "[DEMO] Webinar gratuito",
        baseline: 45,
      },
    ];

    const inserted: string[] = [];

    for (const d of demo) {
      const { data: lib, error: libErr } = await supabaseAdmin
        .from("libraries")
        .insert({
          url: d.url,
          search_term: d.search_term,
          page_name: d.page_name,
          niche: d.niche,
          language: d.language,
          notes: d.notes,
          status: "active",
        })
        .select()
        .single();
      if (libErr) throw libErr;

      const snapshots: TablesInsert<"snapshots">[] = [];
      let value = d.baseline;
      const days = 14;
      const previewUrls = [
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=70",
        "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&q=70",
        "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=70",
      ];

      for (let i = days - 1; i >= 0; i--) {
        // 2 snapshots per day (morning + evening) to mimic 1/h-ish frequency
        for (const hour of [9, 18]) {
          const drift = Math.round((Math.random() - 0.4) * 10);
          value = Math.max(5, value + drift);
          const top = Math.round(value * (0.1 + Math.random() * 0.1));
          const unique = Math.max(1, Math.round(value * (0.15 + Math.random() * 0.1)));
          const captured = new Date();
          captured.setUTCDate(captured.getUTCDate() - i);
          captured.setUTCHours(hour, 0, 0, 0);
          snapshots.push({
            library_id: lib!.id,
            captured_at: captured.toISOString(),
            active_ads_count: value,
            total_results_text: `${value} resultados ativos`,
            top_creative_id: `demo-${lib!.id}-top`,
            top_creative_url: previewUrls[Math.floor(Math.random() * previewUrls.length)],
            top_creative_count: top,
            unique_creatives: unique,
            scrape_ok: true,
            error_message: null,
          });
        }
      }

      const { data: snapData, error: snapErr } = await supabaseAdmin
        .from("snapshots")
        .insert(snapshots)
        .select();
      if (snapErr) throw snapErr;

      // creatives for the latest snapshot only (the one we'll show in detail)
      const latest = snapData![snapData!.length - 1];
      const creatives = Array.from({ length: 6 }).map((_, i) => ({
        snapshot_id: latest.id,
        library_id: lib!.id,
        ad_archive_id: `${100000000 + i * 137 + d.baseline}`,
        creative_hash: `${lib!.id}-h${i}`,
        duplicate_count: Math.max(1, Math.round((latest.top_creative_count as number) / (i + 1))),
        preview_url: previewUrls[i % previewUrls.length],
        media_type: i % 3 === 0 ? "video" : "image",
        body_text:
          "Descubra o método que está transformando resultados em apenas 7 dias. Garantia incondicional.",
        captured_at: latest.captured_at,
      }));

      const { error: crErr } = await supabaseAdmin.from("creatives").insert(creatives);
      if (crErr) throw crErr;

      inserted.push(lib!.id);
    }

    return { ok: true, count: inserted.length };
  });

export const clearDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("libraries")
      .delete()
      .like("notes", "[DEMO]%");
    if (error) throw error;
    return { ok: true };
  });
