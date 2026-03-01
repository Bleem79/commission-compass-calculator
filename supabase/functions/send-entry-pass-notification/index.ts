import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { driverId, driverName, reason } = await req.json();

    if (!driverId) {
      return new Response(
        JSON.stringify({ success: true, message: "No driverId provided" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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

    // Find push subscriptions for the driver
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("driver_id", driverId);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions for driver:", driverId);
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

    const displayName = driverName || driverId;
    const notificationPayload = JSON.stringify({
      title: "🎫 Entry Pass Created",
      body: `Your entry pass has been created. Reason: ${reason}`,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      vibrate: [200, 100, 200],
      tag: `entry-pass-${driverId}-${Date.now()}`,
      data: {
        url: "/driver-entry-pass",
        type: "entry_pass_created",
      },
    });

    const results = [];
    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        };

        await webpush.sendNotification(pushSubscription, notificationPayload);
        results.push({ endpoint: subscription.endpoint, success: true });
        console.log("Push sent to driver:", subscription.endpoint);
      } catch (pushError: any) {
        console.error("Error sending push:", pushError);
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

    const successCount = results.filter((r) => r.success).length;
    console.log(`Sent ${successCount}/${results.length} entry pass notifications`);

    return new Response(
      JSON.stringify({ success: true, sent: successCount, total: results.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-entry-pass-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
