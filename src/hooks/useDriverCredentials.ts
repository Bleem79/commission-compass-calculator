import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DriverInfo {
  driverId: string;
  driverName: string | null;
}

interface UseDriverCredentialsResult {
  driverInfo: DriverInfo | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch and resolve driver credentials for the authenticated user.
 * Handles both RPC-based linking for @driver.temp emails and direct lookup.
 */
export const useDriverCredentials = (): UseDriverCredentialsResult => {
  const { isAuthenticated, user } = useAuth();
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDriverCredentials = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        // Always use the real authenticated Supabase user (avoids stale context)
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        const actualUserId = authUser?.id || user?.id;
        const actualEmail = (authUser?.email || user?.email || "").toLowerCase();

        if (!actualUserId) {
          setLoading(false);
          return;
        }

        // If the driver_credentials row is not linked yet, use RPC to link + fetch
        const driverIdFromEmail = actualEmail.endsWith("@driver.temp")
          ? actualEmail.split("@")[0].trim()
          : null;

        let resolvedDriverId: string | null = null;
        let resolvedDriverName: string | null = null;

        if (driverIdFromEmail) {
          const { data: rows, error: rpcError } = await supabase.rpc(
            "get_driver_credentials",
            {
              p_driver_id: driverIdFromEmail,
              p_user_id: actualUserId,
            }
          );

          if (!rpcError && rows && rows.length > 0) {
            const row = rows[0];
            if (row?.status === "enabled" && row?.driver_id) {
              resolvedDriverId = row.driver_id;
            }
          }
        }

        // Fallback: lookup by user_id
        if (!resolvedDriverId) {
          const { data: credentials, error: credError } = await supabase
            .from("driver_credentials")
            .select("driver_id")
            .eq("user_id", actualUserId)
            .eq("status", "enabled")
            .maybeSingle();

          if (credError) throw credError;
          resolvedDriverId = credentials?.driver_id ?? null;
        }

        // Fetch driver name from income data if we have a driver ID
        if (resolvedDriverId) {
          const { data: incomeData } = await supabase
            .from("driver_income")
            .select("driver_name")
            .eq("driver_id", resolvedDriverId)
            .limit(1)
            .maybeSingle();

          if (incomeData?.driver_name) {
            resolvedDriverName = incomeData.driver_name;
          }

          setDriverInfo({
            driverId: resolvedDriverId,
            driverName: resolvedDriverName,
          });
        }
      } catch (err: any) {
        console.error("Error fetching driver credentials:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDriverCredentials();
  }, [isAuthenticated, user?.id, user?.email]);

  return { driverInfo, loading, error };
};
