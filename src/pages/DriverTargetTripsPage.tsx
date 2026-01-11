import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, Target, TrendingUp, Loader2, CheckCircle, Award, User, Hash, Clock } from "lucide-react";
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
const INCENTIVES_24H = [250, 350, 450, 550, 650, 850]; // 24H shift (shift = 1)
const INCENTIVES_12H = [150, 250, 350, 450, 550, 650]; // 12H shift (shift = 2)

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

  useEffect(() => {
    const fetchDriverCredentials = async () => {
      if (!user?.id) return;

      try {
        const { data: credentials, error } = await supabase
          .from("driver_credentials")
          .select("driver_id")
          .eq("user_id", user.id)
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
  }, [user?.id]);

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

        // Fetch driver income to get shift type, working days, and driver name
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
        
        // Use driver name from income data if not in target trips
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

  // Determine shift type: check if shift contains "1" for 24H, "2" for 12H
  const shiftType = driverIncome?.shift?.startsWith("1") ? "1" : driverIncome?.shift?.startsWith("2") ? "2" : "1";
  const shiftLabel = shiftType === "2" ? "12H" : "24H";
  const incentives = shiftType === "2" ? INCENTIVES_12H : INCENTIVES_24H;

  // Calculate days in month (default to 31)
  const daysInMonth = driverIncome?.working_days || 31;

  // Calculate base average trips per day from target trips
  const baseAvgTripsPerDay = useMemo(() => {
    if (latestTrip && daysInMonth > 0) {
      // Base = target_trips / days in month, rounded
      return Math.round(latestTrip.target_trips / daysInMonth);
    }
    return 24; // Default base
  }, [latestTrip, daysInMonth]);

  // Generate tier data dynamically
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

  const getCurrentTier = (completedTrips: number): string => {
    for (let i = tierData.length - 1; i >= 0; i--) {
      if (completedTrips >= tierData[i].totalTripsMonth) {
        return tierData[i].tier;
      }
    }
    return "Below Base";
  };

  const getNextTier = (completedTrips: number): TierData | null => {
    for (const tier of tierData) {
      if (completedTrips < tier.totalTripsMonth) {
        return tier;
      }
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/50 p-4 sm:p-6">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-4 right-4 z-10"
        onClick={handleClose}
      >
        <X className="h-6 w-6 text-muted-foreground hover:text-foreground" />
      </Button>
      
      <Button
        variant="outline"
        className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-background hover:bg-accent text-primary border-border"
        onClick={handleClose}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back to Portal</span>
      </Button>

      <div className="max-w-2xl mx-auto pt-16 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading target trips...</span>
          </div>
        ) : targetTrips.length === 0 ? (
          <Card className="bg-card border border-border">
            <CardContent className="p-8 text-center">
              <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No Target Trips</h2>
              <p className="text-muted-foreground">
                No target trips data available yet. Check back later!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Driver Info Card */}
            <Card className="bg-white border-0 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-1" />
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full">
                    <User className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Hash className="h-4 w-4" />
                      <span>ID No</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{driverId}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Name:</p>
                    <p className="text-lg font-semibold text-foreground">
                      {driverName || "Driver"}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Shift:</span>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-lg px-4 py-1 font-bold">
                      {shiftLabel}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Progress Card */}
            {latestTrip && (
              <Card className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5" />
                    <span className="font-medium">{latestTrip.month} {latestTrip.year} Progress</span>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-emerald-100 text-sm mb-1">Completed Trips</p>
                      <p className="text-4xl font-bold">{latestTrip.completed_trips}</p>
                    </div>
                    <div>
                      <p className="text-emerald-100 text-sm mb-1">Target</p>
                      <p className="text-4xl font-bold">{latestTrip.target_trips}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-100">Current Tier:</span>
                      <Badge className="bg-white/20 text-white hover:bg-white/30 text-base px-3">
                        {getCurrentTier(latestTrip.completed_trips)}
                      </Badge>
                    </div>
                    {getNextTier(latestTrip.completed_trips) && (
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-emerald-100 text-sm">
                          {getNextTier(latestTrip.completed_trips)!.totalTripsMonth - latestTrip.completed_trips} trips to {getNextTier(latestTrip.completed_trips)!.tier}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Target Tiers Table */}
            <Card className="bg-white border-0 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 p-4">
                <div className="flex items-center gap-3">
                  <Award className="h-6 w-6 text-amber-400" />
                  <h2 className="text-lg font-bold text-white">Target & Incentive Tiers</h2>
                </div>
              </div>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="text-left p-4 font-semibold text-slate-700">Target</th>
                        <th className="text-center p-4 font-semibold text-slate-700">
                          <div className="flex flex-col items-center">
                            <span>Avg</span>
                            <span className="text-xs font-normal text-slate-500">Trip/Day</span>
                          </div>
                        </th>
                        <th className="text-center p-4 font-semibold text-slate-700">
                          <div className="flex flex-col items-center">
                            <span>Total Trips/</span>
                            <span className="text-xs font-normal text-slate-500">Month</span>
                          </div>
                        </th>
                        <th className="text-center p-4 font-semibold text-slate-700">Incentive</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tierData.map((tier, index) => {
                        const isCurrentTier = latestTrip && getCurrentTier(latestTrip.completed_trips) === tier.tier;
                        const isAchieved = latestTrip && latestTrip.completed_trips >= tier.totalTripsMonth;
                        
                        return (
                          <tr 
                            key={tier.tier}
                            className={`
                              border-b border-slate-100 transition-colors
                              ${isCurrentTier ? 'bg-emerald-50' : ''}
                              ${index % 2 === 0 && !isCurrentTier ? 'bg-white' : !isCurrentTier ? 'bg-slate-50/50' : ''}
                              hover:bg-emerald-50/50
                            `}
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${isCurrentTier ? 'text-emerald-700' : 'text-slate-700'}`}>
                                  {tier.tier}
                                </span>
                                {isAchieved && (
                                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`font-medium ${isCurrentTier ? 'text-emerald-700' : 'text-slate-600'}`}>
                                {tier.avgTripsPerDay.toFixed(2)}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`font-semibold ${isCurrentTier ? 'text-emerald-700' : 'text-slate-700'}`}>
                                {tier.totalTripsMonth}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <Badge 
                                className={`
                                  px-3 py-1 font-bold text-base
                                  ${isCurrentTier 
                                    ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                  }
                                `}
                              >
                                {tier.incentive}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Period Info */}
            {targetTrips.length > 1 && (
              <Card className="bg-white border-0 shadow-lg">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-slate-700 mb-3">Previous Periods</h3>
                  <div className="space-y-2">
                    {targetTrips.slice(1).map((trip) => (
                      <div 
                        key={trip.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <span className="font-medium text-slate-700">
                          {trip.month} {trip.year}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-500">
                            {trip.completed_trips} / {trip.target_trips} trips
                          </span>
                          <Badge className={
                            trip.completed_trips >= trip.target_trips
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-orange-100 text-orange-700"
                          }>
                            {getCurrentTier(trip.completed_trips)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DriverTargetTripsPage;
