import React, { useState, useEffect, useMemo } from "react";
import { Award, User, Hash, Clock, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface TargetTrip {
  target_trips: number;
  completed_trips: number;
  month: string;
  year: number;
}

interface DriverIncome {
  shift: string | null;
  working_days: number;
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
const INCENTIVES_12H = [190, 265, 340, 415, 490, 640];

interface DriverTierTableProps {
  driverId: string | null;
}

const DriverTierTable = ({ driverId }: DriverTierTableProps) => {
  const [targetTrip, setTargetTrip] = useState<TargetTrip | null>(null);
  const [driverIncome, setDriverIncome] = useState<DriverIncome | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!driverId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch latest target trip
        const { data: tripData } = await supabase
          .from("target_trips")
          .select("target_trips, completed_trips, month, year")
          .eq("driver_id", driverId)
          .order("year", { ascending: false })
          .order("month", { ascending: false })
          .limit(1)
          .maybeSingle();

        setTargetTrip(tripData);

        // Fetch driver income for shift type
        const { data: incomeData } = await supabase
          .from("driver_income")
          .select("shift, working_days, driver_name")
          .eq("driver_id", driverId)
          .order("year", { ascending: false })
          .order("month", { ascending: false })
          .limit(1)
          .maybeSingle();

        setDriverIncome(incomeData);
      } catch (error) {
        console.error("Error fetching tier data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [driverId]);

  // Determine shift type: check if shift contains "1" for 24H, "2" for 12H
  const shiftType = driverIncome?.shift?.startsWith("1") ? "1" : driverIncome?.shift?.startsWith("2") ? "2" : "1";
  const shiftLabel = shiftType === "2" ? "12H" : "24H";
  const incentives = shiftType === "2" ? INCENTIVES_12H : INCENTIVES_24H;

  // Calculate days in month (default to 31)
  const daysInMonth = driverIncome?.working_days || 31;

  // Calculate base average trips per day from target trips
  const baseAvgTripsPerDay = useMemo(() => {
    if (targetTrip && daysInMonth > 0) {
      return targetTrip.target_trips / daysInMonth;
    }
    return 24;
  }, [targetTrip, daysInMonth]);

  // Generate tier data dynamically
  const tierData: TierData[] = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const avgTrips = baseAvgTripsPerDay + i;
      return {
        tier: i === 0 ? "Base" : `Base+${i}`,
        avgTripsPerDay: avgTrips,
        totalTripsMonth: Math.round(avgTrips * daysInMonth),
        incentive: incentives[i],
      };
    });
  }, [baseAvgTripsPerDay, daysInMonth, incentives]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-white/60" />
      </div>
    );
  }

  if (!targetTrip) {
    return null;
  }

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20 overflow-hidden">
      {/* Header with driver info */}
      <div className="bg-gradient-to-r from-emerald-600/80 to-teal-600/80 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-white/80 text-xs">
                <Hash className="h-3 w-3" />
                <span>ID: {driverId}</span>
              </div>
              {driverIncome?.driver_name && (
                <p className="text-white font-medium text-sm">{driverIncome.driver_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-white/70" />
            <Badge className="bg-white/20 text-white hover:bg-white/30 font-bold">
              {shiftLabel}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tier Table */}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="text-left p-3 font-semibold text-white/90">Target</th>
                <th className="text-center p-3 font-semibold text-white/90">
                  <div className="flex flex-col items-center">
                    <span>Avg</span>
                    <span className="text-[10px] font-normal text-white/60">Trip/Day</span>
                  </div>
                </th>
                <th className="text-center p-3 font-semibold text-white/90">
                  <div className="flex flex-col items-center">
                    <span>Total Trips/</span>
                    <span className="text-[10px] font-normal text-white/60">Month</span>
                  </div>
                </th>
                <th className="text-center p-3 font-semibold text-white/90">Incentive</th>
              </tr>
            </thead>
            <tbody>
              {tierData.map((tier, index) => (
                <tr
                  key={tier.tier}
                  className={`border-b border-white/5 ${index % 2 === 0 ? 'bg-white/[0.02]' : ''}`}
                >
                  <td className="p-3">
                    <span className="font-medium text-white/90">{tier.tier}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-white/80">{tier.avgTripsPerDay.toFixed(2)}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="font-semibold text-white">{tier.totalTripsMonth}</span>
                  </td>
                  <td className="p-3 text-center">
                    <Badge className="bg-emerald-500/30 text-emerald-300 hover:bg-emerald-500/40 font-bold">
                      {tier.incentive}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default DriverTierTable;
