import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "@/hooks/use-toast";

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  image?: string; // Large image to display in notification
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
  silent?: boolean;
}

// Notification sound URL (using a reliable web audio)
const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const supported = "Notification" in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      
      // Get service worker registration if available
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready
          .then((registration) => {
            setSwRegistration(registration);
          })
          .catch((err) => {
            console.warn("Service worker not ready:", err);
          });
      }
    }
  }, []);

  const vibrate = useCallback((pattern: number | number[] = [100, 50, 100]) => {
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (err) {
        console.warn("Could not vibrate:", err);
      }
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    // Play sound
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.warn("Could not play notification sound:", err);
      });
    }
    // Vibrate device
    vibrate([100, 50, 100]);
  }, [vibrate]);

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
      if (!isSupported) {
        console.warn("Notifications not supported");
        return false;
      }

      if (permission !== "granted") {
        console.warn("Notification permission not granted");
        return false;
      }

      try {
        // Play notification sound unless silent is true
        if (!options.silent) {
          playNotificationSound();
        }

        const notificationOptions = {
          body: options.body,
          icon: options.icon || "/pwa-192x192.png",
          badge: options.badge || "/pwa-192x192.png",
          tag: options.tag || "default-notification",
          data: options.data,
          requireInteraction: options.requireInteraction || false,
          silent: true, // We handle sound ourselves
          ...(options.image && { image: options.image }), // Include image if provided
        };

        // Try Service Worker notification first (works better on mobile PWA)
        if (swRegistration && swRegistration.showNotification) {
          await swRegistration.showNotification(options.title, notificationOptions);
          console.log("Notification sent via Service Worker");
          return true;
        }

        // Fallback to regular Notification API
        const notification = new Notification(options.title, notificationOptions);

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        console.log("Notification sent via Notification API");
        return true;
      } catch (error) {
        console.error("Error sending notification:", error);
        return false;
      }
    },
    [isSupported, permission, swRegistration, playNotificationSound]
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
    playNotificationSound,
    isGranted: permission === "granted",
    isDenied: permission === "denied",
  };
};

export default usePushNotifications;
