import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { REQUEST_TYPES } from "@/constants/requestTypes";

export interface RequestType {
  value: string;
  label: string;
}

export const useRequestTypes = () => {
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("driver_request_types")
        .select("value, label")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setRequestTypes(data || []);
    } catch (e) {
      console.error("Error fetching request types:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const addType = async (value: string, label: string) => {
    const valueFormatted = value.toLowerCase().replace(/\s+/g, "_");
    if (requestTypes.some((t) => t.value === valueFormatted)) {
      throw new Error("This request type already exists");
    }

    const { error } = await supabase
      .from("driver_request_types")
      .insert({ value: valueFormatted, label, sort_order: requestTypes.length + 1 });

    if (error) throw error;
    await fetchTypes();
  };

  const deleteType = async (value: string) => {
    const { error } = await supabase
      .from("driver_request_types")
      .delete()
      .eq("value", value);

    if (error) throw error;
    await fetchTypes();
  };

  return { requestTypes, loading, addType, deleteType, refetch: fetchTypes };
};

// Utility function for getting label (async version for non-hook contexts)
let cachedTypes: RequestType[] | null = null;

export const fetchRequestTypesOnce = async (): Promise<RequestType[]> => {
  if (cachedTypes) return cachedTypes;
  try {
    const { data } = await supabase
      .from("driver_request_types")
      .select("value, label")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (data && data.length > 0) {
      cachedTypes = data;
      return data;
    }
  } catch (e) {
    console.error("Error fetching request types:", e);
  }
  return REQUEST_TYPES;
};
