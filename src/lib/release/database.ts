import { supabaseAdmin } from "@/lib/supabase-admin";

export async function saveRelease(
  payload: any
) {

  return supabaseAdmin
    .from("updates")
    .upsert(payload, {
      onConflict: "version",
    });

}
