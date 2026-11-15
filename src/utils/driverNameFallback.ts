import { supabase } from "@/integrations/supabase/client";

/** Names for Driver IDs whose Yango list name is blank: Driver Master File first, then Driver Income (newest first). Keys are lower-cased IDs. */
export async function lookupDriverNames(driverIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const ids = [...new Set(driverIds.map((id) => id.trim()).filter(Boolean))];
  for (const table of ["driver_master_file", "driver_income"] as const) {
    const need = ids.filter((id) => !names.has(id.toLowerCase()));
    for (let i = 0; i < need.length; i += 200) {
      const { data, error } = await supabase.from(table).select("driver_id, driver_name").in("driver_id", need.slice(i, i + 200)).order("created_at", { ascending: false });
      if (error) continue;
      for (const r of data || []) {
        const key = r.driver_id.trim().toLowerCase();
        const name = r.driver_name?.trim();
        if (name && !names.has(key)) names.set(key, name);
      }
    }
  }
  return names;
}
