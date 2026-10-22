import { useState, useEffect, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface NotificationBellProps {
  className?: string;
  onClick?: () => void;
  /** When set, only messages broadcast to everyone or private to this driver will alert */
  driverId?: string | null;
  /** Unread message count to show on the badge */
  count?: number;
}

const NotificationBell = ({ className, onClick, driverId, count }: NotificationBellProps) => {
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
    <Button
      variant="outline"
      size="icon"
      onClick={handleClick}
      className={cn(
        "relative h-11 w-11 rounded-lg border-primary-foreground/20 bg-primary text-primary-foreground",
        "hover:bg-primary/90 hover:text-primary-foreground transition-all duration-300",
        className
      )}
      aria-label={count ? `Notifications, ${count} unread` : "Notifications"}
      title={count ? `${count} unread notifications` : "Notifications"}
    >
      <Bell
        className={cn(
          "w-5 h-5 sm:w-6 sm:h-6 transition-transform",
          (isRinging || (count ?? 0) > 0) && "motion-safe:animate-bell-ring"
        )}
      />

      {/* Unread count / pulsing dot for new notifications */}
      {count !== undefined && count > 0 ? (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold motion-safe:animate-pulse shadow-sm">
          {count > 99 ? "99+" : count}
        </span>
      ) : count === undefined && hasNew ? (
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-destructive motion-safe:animate-pulse shadow-sm" />
      ) : null}
    </Button>
  );
};

export default NotificationBell;
