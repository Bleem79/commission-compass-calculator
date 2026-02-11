import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Registers the browser's push subscription in the push_subscriptions table
 * so the backend can send web-push notifications to this device.
 */
export const usePushSubscriptionRegistration = (
  userId: string | undefined,
  driverId: string | null | undefined
) => {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!userId || registeredRef.current) return;

    const register = async () => {
      try {
        // Check browser support
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          console.log("Push notifications not supported");
          return;
        }

        // Check permission
        if (Notification.permission !== "granted") {
          console.log("Notification permission not granted, skipping registration");
          return;
        }

        const registration = await navigator.serviceWorker.ready as any;

        // Get existing subscription or create new one
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          // We need the VAPID public key to subscribe
          // Fetch it from the edge function or use a known key
          const vapidPublicKey = "BPyGoLh-AHAHEbn2VB2acpyzMnWq3RemqJsoCljNwu-Cq6_Ug59ERnD4xvfOtx1w4bmHCe4E9_Qq2UcgnJOhpsE";
          
          const convertedKey = urlBase64ToUint8Array(vapidPublicKey) as any;
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey,
          });
        }

        const subscriptionJson = subscription.toJSON();
        const endpoint = subscriptionJson.endpoint!;
        const p256dh = subscriptionJson.keys!.p256dh!;
        const auth = subscriptionJson.keys!.auth!;

        // Upsert subscription (update if endpoint exists, insert if new)
        const { error } = await supabase
          .from("push_subscriptions")
          .upsert(
            {
              user_id: userId,
              driver_id: driverId || null,
              endpoint,
              p256dh,
              auth,
            },
            { onConflict: "endpoint" }
          );

        if (error) {
          console.error("Error saving push subscription:", error);
        } else {
          console.log("Push subscription registered successfully");
          registeredRef.current = true;
        }
      } catch (err) {
        console.error("Error registering push subscription:", err);
      }
    };

    register();
  }, [userId, driverId]);
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
