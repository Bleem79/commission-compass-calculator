import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "@/hooks/use-toast";

/**
 * Alerts the driver (sound, vibration, toast, browser notification and a
 * visual flag) whenever a new private message targeted at them arrives.
 */
export const usePrivateMessageAlert = (driverId?: string | null) => {
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { playNotificationSound, sendNotification, isGranted } = usePushNotifications();

  const clearAlert = useCallback(() => {
    setHasNewMessage(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    if (!driverId) return;

    const channel = supabase
      .channel("private-message-alert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_messages" },
        (payload) => {
          const row = payload.new as { content?: string; is_admin?: boolean };
          const content = row?.content || "";
          if (row?.is_admin === false) return;

          const match = content.match(/^\[PRIVATE TO: ([^\]]+)\]\s*/);
          if (!match || match[1].trim() !== driverId) return;

          const body = content.replace(match[0], "").trim();

          setHasNewMessage(true);
          playNotificationSound();
          toast({ title: "New private message", description: body.slice(0, 120) });
          if (isGranted) {
            sendNotification({
              title: "New private message",
              body: body.slice(0, 160),
              tag: "private-message",
              silent: true,
            });
          }

          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => setHasNewMessage(false), 30000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [driverId, playNotificationSound, sendNotification, isGranted]);

  return { hasNewMessage, clearAlert };
};
