import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "broadcast" | "private";
  driverIds?: string[];
  messageContent: string;
  imageUrl?: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, driverIds, messageContent, imageUrl }: NotificationRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("WEB_PUSH_VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("WEB_PUSH_VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ success: true, message: "VAPID keys not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let subscriptions: any[] = [];

    if (type === "private" && driverIds && driverIds.length > 0) {
      // Resolve driver IDs to their linked user_ids so we can also reach
      // devices whose push_subscriptions row is missing a driver_id.
      const userIds = new Set<string>();
      const QUERY_CHUNK = 200;
      for (let i = 0; i < driverIds.length; i += QUERY_CHUNK) {
        const chunk = driverIds.slice(i, i + QUERY_CHUNK);
        const { data: creds, error: credErr } = await supabase
          .from("driver_credentials")
          .select("user_id")
          .in("driver_id", chunk);
        if (credErr) {
          console.error("Error resolving driver credentials:", credErr);
        } else {
          creds?.forEach((c: any) => c.user_id && userIds.add(c.user_id));
        }
      }

      // Fetch subscriptions matching either the driver_id or the resolved user_id.
      const seen = new Set<string>();
      const collect = (rows: any[] | null) => {
        rows?.forEach((r) => {
          if (!seen.has(r.id)) {
            seen.add(r.id);
            subscriptions.push(r);
          }
        });
      };

      for (let i = 0; i < driverIds.length; i += QUERY_CHUNK) {
        const chunk = driverIds.slice(i, i + QUERY_CHUNK);
        const { data, error } = await supabase
          .from("push_subscriptions")
          .select("*")
          .in("driver_id", chunk);
        if (error) console.error("Error fetching subs by driver_id:", error);
        else collect(data);
      }

      const userIdArr = Array.from(userIds);
      for (let i = 0; i < userIdArr.length; i += QUERY_CHUNK) {
        const chunk = userIdArr.slice(i, i + QUERY_CHUNK);
        const { data, error } = await supabase
          .from("push_subscriptions")
          .select("*")
          .in("user_id", chunk);
        if (error) console.error("Error fetching subs by user_id:", error);
        else collect(data);
      }
    } else {
      // Broadcast: every registered device.
      const { data, error: subError } = await supabase
        .from("push_subscriptions")
        .select("*");
      if (subError) {
        console.error("Error fetching subscriptions:", subError);
        throw subError;
      }
      subscriptions = data || [];
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const webpush = await import("npm:web-push@3.6.7");
    
    webpush.setVapidDetails(
      "mailto:admin@amandriver.com",
      vapidPublicKey,
      vapidPrivateKey
    );

    const truncatedContent = messageContent.length > 120 
      ? messageContent.substring(0, 120) + "..." 
      : messageContent;

    const title = type === "broadcast" 
      ? "📢 New Admin Message" 
      : "💬 Private Message from Admin";

    const notificationPayload = JSON.stringify({
      title,
      body: truncatedContent,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      ...(imageUrl && { image: imageUrl }),
      data: {
        url: "/driver-portal",
        type: type === "broadcast" ? "admin_broadcast" : "admin_private_message"
      }
    });

    const invalidIds: string[] = [];
    const BATCH_SIZE = 50;
    let successCount = 0;
    let totalProcessed = 0;

    // Process in batches concurrently
    for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
      const batch = subscriptions.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (subscription) => {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth }
          };
          try {
            await webpush.sendNotification(pushSubscription, notificationPayload);
            return { success: true };
          } catch (pushError: any) {
            if (pushError.statusCode === 410 || pushError.statusCode === 404) {
              invalidIds.push(subscription.id);
            }
            return { success: false };
          }
        })
      );

      for (const r of results) {
        totalProcessed++;
        if (r.status === "fulfilled" && r.value.success) successCount++;
      }
    }

    // Bulk delete invalid subscriptions
    if (invalidIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", invalidIds);
      console.log(`Removed ${invalidIds.length} invalid subscriptions`);
    }

    console.log(`Sent ${successCount}/${totalProcessed} notifications`);

    return new Response(
      JSON.stringify({ success: true, sent: successCount, total: totalProcessed }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-message-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
