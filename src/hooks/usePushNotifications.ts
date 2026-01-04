import { useState, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
}

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported = "Notification" in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: "Notifications not supported",
        description: "Your browser doesn't support push notifications",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        toast({
          title: "Notifications enabled",
          description: "You'll receive updates and alerts",
        });
        return true;
      } else if (result === "denied") {
        toast({
          title: "Notifications blocked",
          description: "You can enable them in your browser settings",
          variant: "destructive",
        });
        return false;
      }
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback(
    (options: NotificationOptions): Notification | null => {
      if (!isSupported || permission !== "granted") {
        console.warn("Cannot send notification: not supported or permission denied");
        return null;
      }

      try {
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || "/pwa-192x192.png",
          badge: options.badge || "/pwa-192x192.png",
          tag: options.tag,
          data: options.data,
          requireInteraction: options.requireInteraction,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        return notification;
      } catch (error) {
        console.error("Error sending notification:", error);
        return null;
      }
    },
    [isSupported, permission]
  );

  const scheduleNotification = useCallback(
    (options: NotificationOptions, delayMs: number): NodeJS.Timeout | null => {
      if (!isSupported || permission !== "granted") {
        return null;
      }

      return setTimeout(() => {
        sendNotification(options);
      }, delayMs);
    },
    [isSupported, permission, sendNotification]
  );

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
    scheduleNotification,
    isGranted: permission === "granted",
    isDenied: permission === "denied",
  };
};

export default usePushNotifications;
