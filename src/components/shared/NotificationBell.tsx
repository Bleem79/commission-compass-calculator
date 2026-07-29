import { useState, useEffect, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "@/hooks/use-toast";

interface NotificationBellProps {
  className?: string;
  onClick?: () => void;
  /** When set, only messages broadcast to everyone or private to this driver will alert */
  driverId?: string | null;
  /** Unread message count to show on the badge */
  count?: number;
}

const NotificationBell = ({ className, onClick, driverId, count = 0 }: NotificationBellProps) => {
  const [isRinging, setIsRinging] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { playNotificationSound, sendNotification, isGranted } = usePushNotifications();

  const triggerRing = useCallback((message?: string) => {
    setIsRinging(true);
    setHasNew(true);
    playNotificationSound();

    if (message) {
      toast({ title: "New message from Admin", description: message.slice(0, 120) });
      if (isGranted) {
        sendNotification({
          title: "New message from Admin",
          body: message.slice(0, 160),
          tag: "admin-message",
          silent: true,
        });
      }
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsRinging(false);
    }, 3000);
  }, [playNotificationSound, sendNotification, isGranted]);

  useEffect(() => {
    // Listen for new admin messages
    const msgChannel = supabase
      .channel("bell-admin-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_messages" },
        (payload) => {
          const row = payload.new as { content?: string; is_admin?: boolean };
          const content = row?.content || "";
          if (row?.is_admin === false) return;

          const privateMatch = content.match(/^\[PRIVATE TO: ([^\]]+)\]\s*/);
          if (privateMatch) {
            // Only alert the targeted driver
            if (!driverId || privateMatch[1].trim() !== driverId) return;
            triggerRing(content.replace(privateMatch[0], ""));
            return;
          }
          triggerRing(content);
        }
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
  }, [triggerRing, driverId]);

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

      {/* Unread count / pulsing dot for new notifications */}
      {count > 0 ? (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse shadow-lg shadow-red-500/50">
          {count > 99 ? "99+" : count}
        </span>
      ) : hasNew ? (
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
      ) : null}
      )}
    </button>
  );
};

export default NotificationBell;
