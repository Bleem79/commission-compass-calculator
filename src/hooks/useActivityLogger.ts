import { supabase } from "@/integrations/supabase/client";

const ACTIVITY_SESSION_KEY = "activity_session_info";
const LAST_LOGGED_KEY = "activity_last_logged";

interface SessionInfo {
  userId: string;
  driverId: string;
}

export const saveActivitySession = (userId: string, driverId: string) => {
  try {
    localStorage.setItem(
      ACTIVITY_SESSION_KEY,
      JSON.stringify({ userId, driverId })
    );
  } catch {}
};

export const getActivitySession = (): SessionInfo | null => {
  try {
    const raw = localStorage.getItem(ACTIVITY_SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionInfo) : null;
  } catch {
    return null;
  }
};

export const clearActivitySession = () => {
  try {
    localStorage.removeItem(ACTIVITY_SESSION_KEY);
    localStorage.removeItem(LAST_LOGGED_KEY);
  } catch {}
};

/**
 * Dedup guard: prevents the same activity (login/logout) for the same user
 * being recorded twice within a 5-second window (e.g. when both the explicit
 * logout handler and the SIGNED_OUT auth listener fire).
 */
const shouldLog = (userId: string, activityType: "login" | "logout"): boolean => {
  try {
    const raw = localStorage.getItem(LAST_LOGGED_KEY);
    if (raw) {
      const last = JSON.parse(raw) as { userId: string; type: string; ts: number };
      if (
        last.userId === userId &&
        last.type === activityType &&
        Date.now() - last.ts < 5000
      ) {
        return false;
      }
    }
    localStorage.setItem(
      LAST_LOGGED_KEY,
      JSON.stringify({ userId, type: activityType, ts: Date.now() })
    );
  } catch {}
  return true;
};

export const useActivityLogger = () => {
  const logActivity = async (
    userId: string,
    driverId: string,
    activityType: "login" | "logout"
  ) => {
    if (!userId || !driverId) {
      console.warn("Skipping activity log - missing userId or driverId", {
        userId,
        driverId,
        activityType,
      });
      return;
    }
    if (!shouldLog(userId, activityType)) {
      console.log(`Skipping duplicate ${activityType} log for ${driverId}`);
      return;
    }
    try {
      const userAgent = navigator.userAgent;

      const { error } = await supabase.from("driver_activity_logs").insert({
        user_id: userId,
        driver_id: driverId,
        activity_type: activityType,
        user_agent: userAgent,
        ip_address: null,
      });

      if (error) {
        console.error("Error logging activity:", error);
      } else {
        console.log(`Activity logged: ${activityType} for driver ${driverId}`);
      }
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };

  return { logActivity };
};
