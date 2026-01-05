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
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      
      // Get existing service worker registration
      navigator.serviceWorker.ready.then((registration) => {
        setSwRegistration(registration);
      }).catch(console.error);
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
    async (options: NotificationOptions): Promise<boolean> => {
      if (!isSupported || permission !== "granted") {
        console.warn("Cannot send notification: not supported or permission denied");
        return false;
      }

      try {
        // Use Service Worker for better mobile support
        if (swRegistration) {
          await swRegistration.showNotification(options.title, {
            body: options.body,
            icon: options.icon || "/pwa-192x192.png",
            badge: options.badge || "/pwa-192x192.png",
            tag: options.tag,
            data: options.data,
            requireInteraction: options.requireInteraction || false,
          });
          return true;
        } else {
          // Fallback to regular Notification API
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
          return true;
        }
      } catch (error) {
        console.error("Error sending notification:", error);
        return false;
      }
    },
    [isSupported, permission, swRegistration]
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
