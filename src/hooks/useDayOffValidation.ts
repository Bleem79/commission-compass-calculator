import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, addDays } from "date-fns";
import { getBillingCycleRange, isDateInCycle } from "@/utils/dateUtils";
import { MAX_DAY_OFF_PER_CYCLE, MAX_DAY_OFF_PER_DAY } from "@/constants/requestTypes";

interface DayOffValidation {
  availableSlots: number | null;
  loadingSlots: boolean;
  hasExistingRequest: boolean;
  cycleRequestCount: number;
  cycleRange: { start: Date; end: Date } | null;
  canSubmit: boolean;
  errorMessage: string | null;
}

interface UseDayOffValidationProps {
  driverId: string | null;
  requestType: string;
  selectedDate: Date | undefined;
}

/**
 * Hook to validate day off requests against limits and availability.
 */
export const useDayOffValidation = ({
  driverId,
  requestType,
  selectedDate,
}: UseDayOffValidationProps): DayOffValidation => {
  const [availableSlots, setAvailableSlots] = useState<number | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [hasExistingRequest, setHasExistingRequest] = useState(false);
  const [cycleRequestCount, setCycleRequestCount] = useState(0);
  const [cycleRange, setCycleRange] = useState<{ start: Date; end: Date } | null>(null);

  // Fetch driver's day off request count for the current billing cycle
  useEffect(() => {
    const fetchCycleRequestCount = async () => {
      if (!driverId || requestType !== "day_off") {
        setCycleRequestCount(0);
        setCycleRange(null);
        return;
      }

      try {
        const today = new Date();
        const cycle = getBillingCycleRange(today);
        setCycleRange(cycle);

        const { data: dayOffRequests, error } = await supabase
          .from("driver_requests")
          .select("id, subject, status")
          .eq("driver_id", driverId)
          .eq("request_type", "day_off")
          .in("status", ["pending", "approved", "in_progress"]);

        if (error) {
          console.error("Error fetching cycle requests:", error);
          setCycleRequestCount(0);
          return;
        }

        let count = 0;
        dayOffRequests?.forEach((req) => {
          const match = req.subject.match(/- (\d{1,2} \w{3} \d{4})$/);
          if (match) {
            const requestedDate = new Date(match[1]);
            if (!isNaN(requestedDate.getTime()) && isDateInCycle(requestedDate, cycle)) {
              count++;
            }
          }
        });

        setCycleRequestCount(count);
      } catch (error) {
        console.error("Error checking cycle request count:", error);
        setCycleRequestCount(0);
      }
    };

    fetchCycleRequestCount();
  }, [driverId, requestType]);

  // Fetch available day off slots when date changes
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDate || requestType !== "day_off") {
        setAvailableSlots(null);
        setHasExistingRequest(false);
        return;
      }

      setLoadingSlots(true);
      try {
        const dateStr = format(selectedDate, "dd MMM yyyy");

        const { data: count, error } = await supabase.rpc("count_approved_day_off_requests", {
          p_date_str: dateStr,
        });

        if (error) {
          console.error("Error fetching day off count:", error);
          setAvailableSlots(null);
        } else {
          setAvailableSlots(MAX_DAY_OFF_PER_DAY - (count || 0));
        }

        if (driverId) {
          const { data: existingRequests, error: existingError } = await supabase
            .from("driver_requests")
            .select("id, subject")
            .eq("driver_id", driverId)
            .eq("request_type", "day_off")
            .ilike("subject", `%${dateStr}%`);

          if (existingError) {
            console.error("Error checking existing request:", existingError);
            setHasExistingRequest(false);
          } else {
            setHasExistingRequest((existingRequests?.length || 0) > 0);
          }
        }
      } catch (error) {
        console.error("Error fetching available slots:", error);
        setAvailableSlots(null);
        setHasExistingRequest(false);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchAvailableSlots();
  }, [selectedDate, requestType, driverId]);

  // Calculate validation result
  let canSubmit = true;
  let errorMessage: string | null = null;

  if (requestType === "day_off") {
    if (!selectedDate) {
      canSubmit = false;
      errorMessage = "Please select a date for your day off";
    } else if (cycleRequestCount >= MAX_DAY_OFF_PER_CYCLE) {
      canSubmit = false;
      const cycleStartStr = cycleRange ? format(cycleRange.start, "dd MMM") : "";
      const cycleEndStr = cycleRange ? format(cycleRange.end, "dd MMM yyyy") : "";
      errorMessage = `You can only request ${MAX_DAY_OFF_PER_CYCLE} day offs per billing cycle (${cycleStartStr} - ${cycleEndStr}).`;
    } else if (availableSlots !== null && availableSlots <= 0) {
      canSubmit = false;
      errorMessage = `Maximum ${MAX_DAY_OFF_PER_DAY} day off requests allowed per day. Please select another date.`;
    } else if (hasExistingRequest) {
      canSubmit = false;
      errorMessage = "You already have a request for this date.";
    }
  }

  return {
    availableSlots,
    loadingSlots,
    hasExistingRequest,
    cycleRequestCount,
    cycleRange,
    canSubmit,
    errorMessage,
  };
};

/**
 * Get tomorrow's date as the minimum selectable date for day off.
 */
export const getMinDayOffDate = (): Date => {
  return addDays(startOfDay(new Date()), 1);
};
