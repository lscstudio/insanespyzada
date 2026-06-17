import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({ libraryId: z.string().uuid().optional() });

/**
 * Manually trigger a collection from the dashboard.
 * Auth required: any signed-in dashboard user can trigger it.
 */
export const triggerCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input ?? {}))
  .handler(async ({ data }) => {
    const { runCollection } = await import("./collect.server");
    return runCollection({ libraryId: data.libraryId });
  });
