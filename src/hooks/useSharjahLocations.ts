import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SharjahLocation {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export const useSharjahLocations = () => {
  const [locations, setLocations] = useState<SharjahLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("sharjah_locations" as any)
        .select("id, name, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      setLocations((data as unknown as SharjahLocation[]) || []);
    } catch (e) {
      console.error("Error fetching sharjah locations:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const addLocation = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Location name is required");
    if (locations.some((l) => l.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error("This location already exists");
    }
    const { error } = await supabase
      .from("sharjah_locations" as any)
      .insert({ name: trimmed, sort_order: locations.length + 1 });
    if (error) throw error;
    await fetchLocations();
  };

  const deleteLocation = async (id: string) => {
    const { error } = await supabase
      .from("sharjah_locations" as any)
      .delete()
      .eq("id", id);
    if (error) throw error;
    await fetchLocations();
  };

  return { locations, loading, addLocation, deleteLocation, refetch: fetchLocations };
};