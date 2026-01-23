import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UsePaginatedFetchOptions {
  table: string;
  orderBy?: string;
  ascending?: boolean;
  pageSize?: number;
}

interface UsePaginatedFetchResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  fetchData: (filters?: Record<string, unknown>) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching paginated data from Supabase to bypass the 1000-row limit.
 */
export function usePaginatedFetch<T>({
  table,
  orderBy = "created_at",
  ascending = false,
  pageSize = 1000,
}: UsePaginatedFetchOptions): UsePaginatedFetchResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFilters, setLastFilters] = useState<Record<string, unknown> | undefined>();

  const fetchData = useCallback(
    async (filters?: Record<string, unknown>) => {
      setLoading(true);
      setError(null);
      setLastFilters(filters);

      try {
        let allData: T[] = [];
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          // Build query without chaining filters to avoid type issues
          const from = page * pageSize;
          const to = (page + 1) * pageSize - 1;
          
          const { data: pageData, error: fetchError } = await supabase
            .from(table as "driver_income")
            .select("*")
            .order(orderBy as "created_at", { ascending })
            .range(from, to);

          if (fetchError) {
            throw fetchError;
          }

          if (pageData && pageData.length > 0) {
            allData = [...allData, ...(pageData as unknown as T[])];
            hasMore = pageData.length === pageSize;
            page++;
          } else {
            hasMore = false;
          }
        }

        setData(allData);
      } catch (err: unknown) {
        console.error(`Error fetching ${table}:`, err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [table, orderBy, ascending, pageSize]
  );

  const refresh = useCallback(() => fetchData(lastFilters), [fetchData, lastFilters]);

  return { data, loading, error, fetchData, refresh };
}
