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

    // 1. Find all pending requests (no admin_response and status is pending/in_progress)
    const { data: pendingRequests, error: reqError } = await supabase
      .from("driver_requests")
      .select("*")
      .is("admin_response", null)
      .in("status", ["pending", "in_progress"]);

    if (reqError) {
      console.error("Error fetching pending requests:", reqError);
      throw reqError;
    }

    if (!pendingRequests || pendingRequests.length === 0) {
      console.log("No pending unresponded requests found");
      return new Response(
        JSON.stringify({ success: true, message: "No pending requests", reminded: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${pendingRequests.length} unresponded pending requests`);

    // 2. Get unique driver IDs and look up their controllers
    const driverIds = [...new Set(pendingRequests.map((r) => r.driver_id))];
    const { data: masterData, error: masterError } = await supabase
      .from("driver_master_file")
      .select("driver_id, controller")
      .in("driver_id", driverIds);

    if (masterError) {
      console.error("Error fetching master file:", masterError);
      throw masterError;
    }

    // Build controller -> requests map
    const controllerRequestsMap: Record<string, typeof pendingRequests> = {};
    for (const request of pendingRequests) {
      const master = masterData?.find((m) => m.driver_id === request.driver_id);
      const controller = master?.controller;
      if (controller) {
        if (!controllerRequestsMap[controller]) {
          controllerRequestsMap[controller] = [];
        }
        controllerRequestsMap[controller].push(request);
      }
    }

    const controllerNames = Object.keys(controllerRequestsMap);
    if (controllerNames.length === 0) {
      console.log("No controllers found for pending requests");
      return new Response(
        JSON.stringify({ success: true, message: "No controllers to notify", reminded: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Find user IDs for each controller by username
    const { data: { users: allUsers }, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (usersError) throw usersError;

    const webpush = await import("npm:web-push@3.6.7");
    webpush.setVapidDetails("mailto:admin@amandriver.com", vapidPublicKey, vapidPrivateKey);

    let totalSent = 0;

    for (const controllerName of controllerNames) {
      const requests = controllerRequestsMap[controllerName];
      const matchingUsers = allUsers.filter(
        (u) => u.user_metadata?.username?.toLowerCase() === controllerName.toLowerCase()
      );

      if (matchingUsers.length === 0) {
        console.log(`No user found for controller: ${controllerName}`);
        continue;
      }

      const controllerUserIds = matchingUsers.map((u) => u.id);

      // Get push subscriptions for this controller
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .in("user_id", controllerUserIds);

      if (!subscriptions || subscriptions.length === 0) {
        console.log(`No push subscriptions for controller: ${controllerName}`);
        continue;
      }

      const count = requests.length;
      const notificationPayload = JSON.stringify({
        title: "⏰ Pending Request Reminder",
        body: `You have ${count} unresponded driver request${count > 1 ? "s" : ""} waiting for your action.`,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        vibrate: [200, 100, 200],
        requireInteraction: true,
        tag: `reminder-${controllerName}-${Date.now()}`,
        data: {
          url: "/admin-requests",
          type: "request_reminder",
        },
      });

      for (const subscription of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            notificationPayload
          );
          totalSent++;
          console.log(`Reminder sent to ${controllerName} at ${subscription.endpoint}`);
        } catch (pushError: any) {
          console.error(`Push error for ${controllerName}:`, pushError.message);
          if (pushError.statusCode === 410 || pushError.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
            console.log("Removed invalid subscription:", subscription.id);
          }
        }
      }
    }

    console.log(`Reminder complete. Sent ${totalSent} notifications.`);
    return new Response(
      JSON.stringify({ success: true, reminded: totalSent, pendingCount: pendingRequests.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-request-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
