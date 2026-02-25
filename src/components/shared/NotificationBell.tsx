import { useState, useEffect, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface NotificationBellProps {
  className?: string;
  onClick?: () => void;
}

const NotificationBell = ({ className, onClick }: NotificationBellProps) => {
  const [isRinging, setIsRinging] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { playNotificationSound } = usePushNotifications();

  const triggerRing = useCallback(() => {
    setIsRinging(true);
    setHasNew(true);
    playNotificationSound();

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsRinging(false);
    }, 3000);
  }, [playNotificationSound]);

  useEffect(() => {
    // Listen for new admin messages
    const msgChannel = supabase
      .channel("bell-admin-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_messages" },
        () => triggerRing()
      )
      .subscribe();

    // Listen for new driver requests
    const reqChannel = supabase
      .channel("bell-driver-requests")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "driver_requests" },
        () => triggerRing()
      )
      .subscribe();

    // Listen for request responses (status updates)
    const resChannel = supabase
      .channel("bell-request-responses")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "driver_requests" },
        () => triggerRing()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(reqChannel);
      supabase.removeChannel(resChannel);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [triggerRing]);

  const handleClick = () => {
    setHasNew(false);
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "relative p-2 sm:p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white",
        "hover:bg-white/20 transition-all duration-300",
        className
      )}
      aria-label="Notifications"
    >
      <Bell
        className={cn(
          "w-5 h-5 sm:w-6 sm:h-6 transition-transform",
          isRinging && "animate-bell-ring"
        )}
      />

      {/* Pulsing dot for new notifications */}
      {hasNew && (
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
      )}
    </button>
  );
};

export default NotificationBell;
