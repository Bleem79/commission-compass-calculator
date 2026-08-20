import { useEffect, useRef } from "react";
import { toast } from "sonner";

const REMINDER_INTERVAL_MS = 3 * 60 * 1000; // remind every 3 minutes

/**
 * Repeatedly reminds the driver while they still have unread private messages.
 * Shows a persistent toast with a "Read now" action and a short vibration.
 */
export const useUnreadMessageReminder = (
  unreadCount: number,
  onOpen: () => void,
  enabled: boolean = true
) => {
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!enabled || unreadCount <= 0) return;

    const showReminder = () => {
      try {
        navigator.vibrate?.([120, 60, 120]);
      } catch {
        // vibration not supported — ignore
      }
      toast.warning(
        unreadCount === 1
          ? "You have 1 unread message from Admin"
          : `You have ${unreadCount} unread messages from Admin`,
        {
          id: "unread-private-messages",
          description: "Tap to open your Private Messages.",
          duration: 10000,
          action: {
            label: "Read now",
            onClick: () => onOpenRef.current(),
          },
        }
      );
    };

    showReminder();
    const interval = window.setInterval(showReminder, REMINDER_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      toast.dismiss("unread-private-messages");
    };
  }, [unreadCount, enabled]);
};
