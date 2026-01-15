
import { supabase } from "@/integrations/supabase/client";

export const useActivityLogger = () => {
  const logActivity = async (
    userId: string,
    driverId: string,
    activityType: "login" | "logout"
  ) => {
    try {
      const userAgent = navigator.userAgent;
      
      const { error } = await supabase.from("driver_activity_logs").insert({
        user_id: userId,
        driver_id: driverId,
        activity_type: activityType,
        user_agent: userAgent,
        ip_address: null // IP is captured server-side if needed
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
