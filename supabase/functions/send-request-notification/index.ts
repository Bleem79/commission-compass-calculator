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
    const { driverId, driverName, requestType, subject, notifyFleet, status } = await req.json();

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

    // 1. Look up the controller name from driver_master_file
    const { data: masterData, error: masterError } = await supabase
      .from("driver_master_file")
      .select("controller")
      .eq("driver_id", driverId)
      .maybeSingle();

    if (masterError) {
      console.error("Error fetching driver master file:", masterError);
      throw masterError;
    }

    const controllerName = masterData?.controller;
    if (!controllerName) {
      console.log("No controller assigned for driver:", driverId);
      return new Response(
        JSON.stringify({ success: true, message: "No controller assigned" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Driver ${driverId} has controller: ${controllerName}`);

    // 2. Find user(s) whose username matches the controller name
    // List all users and filter by username in metadata
    const { data: { users: allUsers }, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    
    if (usersError) {
      console.error("Error listing users:", usersError);
      throw usersError;
    }

    const matchingUsers = allUsers.filter(
      (u) => u.user_metadata?.username?.toLowerCase() === controllerName.toLowerCase()
    );

    if (matchingUsers.length === 0) {
      console.log("No user found with username:", controllerName);
      return new Response(
        JSON.stringify({ success: true, message: "No matching controller user found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const controllerUserIds = matchingUsers.map((u) => u.id);
    console.log(`Found ${controllerUserIds.length} controller user(s)`);

    // 3. Also find all admin users to notify them too
    const adminUsers = allUsers.filter((u) => {
      // We need to check user_roles table for admin role
      return false; // Will fetch from DB instead
    });

    const { data: adminRoles, error: adminRolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminUserIds = (adminRoles || []).map((r) => r.user_id);
    const allTargetUserIds = [...new Set([...controllerUserIds, ...adminUserIds])];
    console.log(`Notifying ${allTargetUserIds.length} user(s) (${controllerUserIds.length} controller + ${adminUserIds.length} admin)`);

    // 4. Find push subscriptions for target users
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", allTargetUserIds);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions for target user(s)");
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 4. Send push notification
    const webpush = await import("npm:web-push@3.6.7");

    webpush.setVapidDetails(
      "mailto:admin@amandriver.com",
      vapidPublicKey,
      vapidPrivateKey
    );

    const displayName = driverName || driverId;

    // --- Send confirmation notification to the DRIVER ---
    const { data: driverSubs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("driver_id", driverId);

    if (driverSubs && driverSubs.length > 0) {
      const driverPayload = JSON.stringify({
        title: "✅ Request Submitted",
        body: `Your request "${subject || requestType}" has been submitted successfully.`,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        vibrate: [200, 100, 200],
        tag: `driver-request-confirm-${driverId}-${Date.now()}`,
        data: {
          url: "/driver-requests",
          type: "driver_request_confirmed",
        },
      });

      for (const sub of driverSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            driverPayload
          );
          console.log("Confirmation push sent to driver:", sub.endpoint);
        } catch (e: any) {
          console.error("Driver confirmation push error:", e.message);
          if (e.statusCode === 410 || e.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }
    }

    // --- Send notification to controllers/admins ---
    const notificationPayload = JSON.stringify({
      title: "🔔 New Driver Request",
      body: `Driver ${displayName} submitted: ${subject || requestType}`,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      vibrate: [200, 100, 200, 100, 200],
      sound: "/notification.mp3",
      requireInteraction: true,
      tag: `driver-request-${driverId}-${Date.now()}`,
      data: {
        url: "/admin-requests",
        type: "driver_request_submitted",
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
        console.log("Push sent to controller:", subscription.endpoint);
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

    // --- Notify fleet@amantaxi.com when request is approved or in_progress ---
    if (notifyFleet && (status === "approved" || status === "in_progress")) {
      try {
        const { data: { users: fleetUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const fleetUser = fleetUsers.find(
          (u) => u.email?.toLowerCase() === "fleet@amantaxi.com"
        );

        if (fleetUser) {
          const { data: fleetSubs } = await supabase
            .from("push_subscriptions")
            .select("*")
            .eq("user_id", fleetUser.id);

          if (fleetSubs && fleetSubs.length > 0) {
            const statusLabel = status === "approved" ? "✅ Approved" : "🔄 In Progress";
            const fleetPayload = JSON.stringify({
              title: `📋 Request ${statusLabel}`,
              body: `Driver ${displayName}: "${subject || requestType}" has been ${status === "approved" ? "approved" : "set to in-progress"}.`,
              icon: "/pwa-192x192.png",
              badge: "/pwa-192x192.png",
              vibrate: [200, 100, 200],
              tag: `fleet-request-${driverId}-${Date.now()}`,
              data: {
                url: "/admin-requests",
                type: "fleet_request_update",
              },
            });

            for (const sub of fleetSubs) {
              try {
                await webpush.sendNotification(
                  { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                  fleetPayload
                );
                console.log("Fleet notification sent to:", sub.endpoint);
              } catch (e: any) {
                console.error("Fleet push error:", e.message);
                if (e.statusCode === 410 || e.statusCode === 404) {
                  await supabase.from("push_subscriptions").delete().eq("id", sub.id);
                }
              }
            }
          }
        } else {
          console.log("Fleet user not found");
        }
      } catch (fleetErr: any) {
        console.error("Fleet notification error:", fleetErr.message);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`Sent ${successCount}/${results.length} notifications to controller`);

    return new Response(
      JSON.stringify({ success: true, sent: successCount, total: results.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-request-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
