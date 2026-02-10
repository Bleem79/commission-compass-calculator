import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "broadcast" | "private";
  driverIds?: string[]; // For private messages - specific driver IDs
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
      console.log("VAPID keys not configured, skipping push notification");
      return new Response(
        JSON.stringify({ success: true, message: "VAPID keys not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get push subscriptions based on type
    let query = supabase.from("push_subscriptions").select("*");
    
    if (type === "private" && driverIds && driverIds.length > 0) {
      query = query.in("driver_id", driverIds);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found");
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

    const results = [];
    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        };

        await webpush.sendNotification(pushSubscription, notificationPayload);
        results.push({ endpoint: subscription.endpoint, success: true });
      } catch (pushError: any) {
        console.error("Error sending push notification:", pushError);
        results.push({ endpoint: subscription.endpoint, success: false, error: pushError.message });
        
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
          console.log("Removed invalid subscription:", subscription.id);
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Sent ${successCount}/${results.length} notifications`);

    return new Response(
      JSON.stringify({ success: true, sent: successCount, total: results.length, results }),
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
