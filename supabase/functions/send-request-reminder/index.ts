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

    // 2. Get ALL revenue controllers (advanced + user roles) and admins
    const { data: staffRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["advanced", "user", "admin"]);

    if (rolesError) {
      console.error("Error fetching staff roles:", rolesError);
      throw rolesError;
    }

    if (!staffRoles || staffRoles.length === 0) {
      console.log("No staff users found");
      return new Response(
        JSON.stringify({ success: true, message: "No staff to notify", reminded: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const staffUserIds = [...new Set(staffRoles.map((r) => r.user_id))];
    console.log(`Found ${staffUserIds.length} staff users to notify`);

    // 3. Get push subscriptions for all staff
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", staffUserIds);

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for staff");
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions", reminded: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const webpush = await import("npm:web-push@3.6.7");
    webpush.setVapidDetails("mailto:admin@amandriver.com", vapidPublicKey, vapidPrivateKey);

    const count = pendingRequests.length;
    const notificationPayload = JSON.stringify({
      title: "⏰ Pending Request Reminder",
      body: `There are ${count} unresponded driver request${count > 1 ? "s" : ""} waiting for action.`,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      vibrate: [200, 100, 200],
      requireInteraction: true,
      tag: `reminder-all-${Date.now()}`,
      data: {
        url: "/admin-requests",
        type: "request_reminder",
      },
    });

    let totalSent = 0;

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
        console.log(`Reminder sent to user ${subscription.user_id}`);
      } catch (pushError: any) {
        console.error(`Push error for ${subscription.user_id}:`, pushError.message);
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
          console.log("Removed invalid subscription:", subscription.id);
        }
      }
    }

    // --- Also remind fleet@amantaxi.com about approved/in_progress requests ---
    const approvedOrInProgress = pendingRequests.filter(
      (r) => r.status === "approved" || r.status === "in_progress"
    );
    // Also count all approved/in_progress requests (not just from pending batch)
    const { data: fleetPendingRequests } = await supabase
      .from("driver_requests")
      .select("*")
      .in("status", ["approved", "in_progress"])
      .is("fleet_remarks", null);

    const fleetCount = fleetPendingRequests?.length || 0;

    if (fleetCount > 0) {
      try {
        const { data: { users: allUsersForFleet } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const fleetUser = allUsersForFleet.find(
          (u) => u.email?.toLowerCase() === "fleet@amantaxi.com"
        );

        if (fleetUser) {
          const { data: fleetSubs } = await supabase
            .from("push_subscriptions")
            .select("*")
            .eq("user_id", fleetUser.id);

          if (fleetSubs && fleetSubs.length > 0) {
            const fleetPayload = JSON.stringify({
              title: "⏰ Fleet Reminder",
              body: `There are ${fleetCount} approved/in-progress request${fleetCount > 1 ? "s" : ""} awaiting your remarks.`,
              icon: "/pwa-192x192.png",
              badge: "/pwa-192x192.png",
              vibrate: [200, 100, 200],
              requireInteraction: true,
              tag: `fleet-reminder-${Date.now()}`,
              data: {
                url: "/admin-requests",
                type: "fleet_reminder",
              },
            });

            for (const sub of fleetSubs) {
              try {
                await webpush.sendNotification(
                  { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                  fleetPayload
                );
                totalSent++;
                console.log("Fleet reminder sent to:", sub.endpoint);
              } catch (e: any) {
                console.error("Fleet reminder push error:", e.message);
                if (e.statusCode === 410 || e.statusCode === 404) {
                  await supabase.from("push_subscriptions").delete().eq("id", sub.id);
                }
              }
            }
          }
        }
      } catch (fleetErr: any) {
        console.error("Fleet reminder error:", fleetErr.message);
      }
    }

    console.log(`Reminder complete. Sent ${totalSent} notifications.`);
    return new Response(
      JSON.stringify({ success: true, reminded: totalSent, pendingCount: pendingRequests.length, fleetPendingCount: fleetCount }),
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
