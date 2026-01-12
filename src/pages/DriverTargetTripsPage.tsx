import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, Target, Loader2, Award, User, Hash, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TargetTrip {
  id: string;
  driver_id: string;
  driver_name: string | null;
  target_trips: number;
  completed_trips: number;
  month: string;
  year: number;
  created_at: string;
}

interface DriverIncome {
  shift: string | null;
  working_days: number;
  total_trips: number | null;
  driver_name: string | null;
}

interface TierData {
  tier: string;
  avgTripsPerDay: number;
  totalTripsMonth: number;
  incentive: number;
}

// Incentive tiers based on shift type
const INCENTIVES_24H = [250, 350, 450, 550, 650, 850];
const INCENTIVES_12H = [150, 250, 350, 450, 550, 650];

// Default days in month for calculation
const DEFAULT_DAYS_IN_MONTH = 31;
const DEFAULT_BASE_AVG = 24;

const DriverTargetTripsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [targetTrips, setTargetTrips] = useState<TargetTrip[]>([]);
  const [driverIncome, setDriverIncome] = useState<DriverIncome | null>(null);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Fetch driver credentials using the same pattern as Driver Income page
  useEffect(() => {
    const fetchDriverCredentials = async () => {
      if (!isAuthenticated) return;

      // Get the current authed user directly from Supabase to avoid stale context
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      const actualUserId = authUser?.id || user?.id;
      const actualEmail = (authUser?.email || user?.email || "").toLowerCase();

      if (!actualUserId) return;

      // If user logged in with a driver temp email, use RPC to ensure credentials are linked
      const driverIdFromEmail = actualEmail.endsWith("@driver.temp")
        ? actualEmail.split("@")[0].trim()
        : null;

      if (driverIdFromEmail) {
        try {
          const { data: credentialRows, error: credError } = await supabase.rpc(
            "get_driver_credentials",
            {
              p_driver_id: driverIdFromEmail,
              p_user_id: actualUserId,
            }
          );

          const credentials = credentialRows && credentialRows.length > 0 ? credentialRows[0] : null;

          if (!credError && credentials?.driver_id) {
            setDriverId(credentials.driver_id);
            return;
          }
        } catch (error) {
          console.error("Error with RPC get_driver_credentials:", error);
        }
      }

      // Fallback: lookup by user_id
      try {
        const { data: credentials, error } = await supabase
          .from("driver_credentials")
          .select("driver_id")
          .eq("user_id", actualUserId)
          .eq("status", "enabled")
          .maybeSingle();

        if (error) throw error;

        if (credentials) {
          setDriverId(credentials.driver_id);
        }
      } catch (error: any) {
        console.error("Error fetching driver credentials:", error);
      }
    };

    fetchDriverCredentials();
  }, [isAuthenticated, user?.id, user?.email]);

  useEffect(() => {
    const fetchData = async () => {
      if (!driverId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch target trips
        const { data: tripsData, error: tripsError } = await supabase
          .from("target_trips")
          .select("*")
          .eq("driver_id", driverId)
          .order("year", { ascending: false })
          .order("month", { ascending: false });

        if (tripsError) throw tripsError;

        setTargetTrips(tripsData || []);
        if (tripsData && tripsData.length > 0 && tripsData[0].driver_name) {
          setDriverName(tripsData[0].driver_name);
        }

        // Fetch driver income to get shift type and driver name
        const { data: incomeData, error: incomeError } = await supabase
          .from("driver_income")
          .select("shift, working_days, total_trips, driver_name")
          .eq("driver_id", driverId)
          .order("year", { ascending: false })
          .order("month", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (incomeError) throw incomeError;

        setDriverIncome(incomeData);
        
        if (incomeData?.driver_name && !tripsData?.[0]?.driver_name) {
          setDriverName(incomeData.driver_name);
        }
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [driverId]);

  const handleClose = () => {
    navigate("/driver-portal");
  };

  // Get the latest target trip for current display
  const latestTrip = targetTrips.length > 0 ? targetTrips[0] : null;

  // Determine shift type: check if shift starts with "1" for 24H, "2" for 12H
  const shiftType = driverIncome?.shift?.startsWith("1") ? "1" : driverIncome?.shift?.startsWith("2") ? "2" : "1";
  const shiftLabel = shiftType === "2" ? "12H" : "24H";
  const incentives = shiftType === "2" ? INCENTIVES_12H : INCENTIVES_24H;

  // Use default 31 days for tier calculation
  const daysInMonth = DEFAULT_DAYS_IN_MONTH;

  // Base is the driver's target_trips value (final uploaded target)
  // This is the daily average - Base from sample: 24.00 avg/day
  const baseAvgTripsPerDay = useMemo(() => {
    if (latestTrip && latestTrip.target_trips > 0) {
      // The target_trips IS the base daily average (e.g., 24)
      return latestTrip.target_trips;
    }
    return DEFAULT_BASE_AVG;
  }, [latestTrip]);

  // Generate tier data dynamically based on the driver's actual target_trips as base
  const tierData: TierData[] = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const avgTrips = baseAvgTripsPerDay + i;
      return {
        tier: i === 0 ? "Base" : `Base+${i}`,
        avgTripsPerDay: avgTrips,
        totalTripsMonth: avgTrips * daysInMonth,
        incentive: incentives[i],
      };
    });
  }, [baseAvgTripsPerDay, daysInMonth, incentives]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-white/70 hover:text-white hover:bg-white/10"
          onClick={handleClose}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white/70 hover:text-white hover:bg-white/10"
          onClick={handleClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="max-w-lg mx-auto space-y-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-400 mb-4" />
            <span className="text-white/60">Loading target trips...</span>
          </div>
        ) : !driverId ? (
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardContent className="p-10 text-center">
              <User className="h-16 w-16 text-white/30 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                {user?.email?.includes("guest") ? "Guest Access" : "Driver ID not linked"}
              </h2>
              <p className="text-white/50">
                {user?.email?.includes("guest") 
                  ? "Guest accounts cannot access driver-specific features. Please login with your driver account to view your target trips."
                  : `This login (${user?.email || "unknown"}) is not linked to an enabled driver ID. Please contact admin to assign your driver credentials.`
                }
              </p>
              <Button
                className="mt-6 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => navigate("/login")}
              >
                Login with Driver Account
              </Button>
            </CardContent>
          </Card>
        ) : targetTrips.length === 0 ? (
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardContent className="p-10 text-center">
              <Target className="h-16 w-16 text-white/30 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No Target Trips</h2>
              <p className="text-white/50">
                No target trips found for Driver ID <span className="text-white/80 font-medium">{driverId}</span>.
                If you recently uploaded target trips, make sure the uploaded driver ID matches exactly.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Driver Info Card - Compact Design */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                        <Hash className="h-3 w-3" />
                        <span>ID No</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{driverId}</p>
                    </div>

                    <div>
                      <p className="text-white/50 text-xs mb-1">Name:</p>
                      <p className="text-base font-medium text-white/90">
                        {driverName || "Driver"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2 text-white/50 text-xs mb-2 justify-end">
                      <Clock className="h-3 w-3" />
                      <span>Shift:</span>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xl px-4 py-2 font-bold border border-emerald-500/30">
                      {shiftLabel}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Target & Incentive Tiers Table - Clean Design */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Award className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">Target & Incentive Tiers</h2>
                    <p className="text-xs text-white/50">{latestTrip?.month} {latestTrip?.year}</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left px-5 py-3 text-sm font-medium text-white/70">Target</th>
                        <th className="text-center px-4 py-3 text-sm font-medium text-white/70">
                          <div className="flex flex-col items-center leading-tight">
                            <span>Avg</span>
                            <span className="text-[10px] font-normal text-white/40">Trip/Day</span>
                          </div>
                        </th>
                        <th className="text-center px-4 py-3 text-sm font-medium text-white/70">
                          <div className="flex flex-col items-center leading-tight">
                            <span>Total Trips/</span>
                            <span className="text-[10px] font-normal text-white/40">Month</span>
                          </div>
                        </th>
                        <th className="text-center px-5 py-3 text-sm font-medium text-white/70">Incentive</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tierData.map((tier, index) => (
                        <tr
                          key={tier.tier}
                          className={`
                            border-b border-white/5 transition-colors
                            ${index % 2 === 0 ? "bg-white/[0.02]" : ""}
                            hover:bg-white/[0.05]
                          `}
                        >
                          <td className="px-5 py-3">
                            <span className="font-medium text-white/90">{tier.tier}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-white/70 font-medium">{tier.avgTripsPerDay.toFixed(2)}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-semibold text-white">{tier.totalTripsMonth}</span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className="inline-flex items-center justify-center min-w-[60px] px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 font-bold text-sm border border-emerald-500/20">
                              {tier.incentive}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

    </div>
  );
};

export default DriverTargetTripsPage;
