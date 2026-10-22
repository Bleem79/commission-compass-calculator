import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const requestSchema = z.object({
  type: z.enum(["broadcast", "private"]),
  driverIds: z.array(z.string().trim().min(1).max(100)).max(10000).optional(),
  messageContent: z.string().trim().min(1).max(10000),
  imageUrl: z.string().url().max(2048).nullable().optional(),
}).refine(value => value.type !== "private" || (value.driverIds?.length ?? 0) > 0, {
  message: "Private notifications require at least one driver ID",
});

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseServiceKey || !anonKey) throw new Error("Service configuration unavailable");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roles, error: roleError } = await supabase.from("user_roles").select("role")
      .eq("user_id", authData.user.id).in("role", ["admin", "advanced", "user"]);
    if (roleError || !roles?.length) {
      return new Response(JSON.stringify({ error: "Staff access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed = requestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { type, messageContent, imageUrl } = parsed.data;
    const driverIds = parsed.data.driverIds ? Array.from(new Set(parsed.data.driverIds)) : undefined;
    const vapidPublicKey = Deno.env.get("WEB_PUSH_VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("WEB_PUSH_VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Device notifications are not configured" }),
        { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let subscriptions: any[] = [];
    const coveredDriverIds = new Set<string>();
    const driverByUser = new Map<string, string[]>();

    if (type === "private" && driverIds && driverIds.length > 0) {
      // Resolve driver IDs to their linked user_ids so we can also reach
      // devices whose push_subscriptions row is missing a driver_id.
      const userIds = new Set<string>();
      const QUERY_CHUNK = 200;
      for (let i = 0; i < driverIds.length; i += QUERY_CHUNK) {
        const chunk = driverIds.slice(i, i + QUERY_CHUNK);
        const { data: creds, error: credErr } = await supabase
          .from("driver_credentials")
          .select("user_id, driver_id")
          .eq("status", "enabled")
          .in("driver_id", chunk);
        if (credErr) {
          throw credErr;
        } else {
          creds?.forEach((c: any) => {
            if (!c.user_id) return;
            userIds.add(c.user_id);
            driverByUser.set(c.user_id, [...(driverByUser.get(c.user_id) || []), c.driver_id]);
          });
        }
      }

      // Fetch subscriptions matching either the driver_id or the resolved user_id.
      const seen = new Set<string>();
      const collect = (rows: any[] | null) => {
        rows?.forEach((r) => {
          const ownerDrivers = driverByUser.get(r.user_id) || [];
          if (!ownerDrivers.length) return;
          ownerDrivers.forEach(id => coveredDriverIds.add(id));
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
        if (error) throw error;
        else collect(data);
      }

      const userIdArr = Array.from(userIds);
      for (let i = 0; i < userIdArr.length; i += QUERY_CHUNK) {
        const chunk = userIdArr.slice(i, i + QUERY_CHUNK);
        const { data, error } = await supabase
          .from("push_subscriptions")
          .select("*")
          .in("user_id", chunk);
        if (error) throw error;
        else collect(data);
      }
    } else {
      // Broadcast: every registered device.
      for (let from = 0; ; from += 1000) {
        const { data, error: subError } = await supabase.from("push_subscriptions")
          .select("*").order("id", { ascending: true }).range(from, from + 999);
        if (subError) throw subError;
        subscriptions.push(...(data || []));
        if ((data?.length || 0) < 1000) break;
      }
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, total: 0, failed: 0, coveredDrivers: 0, message: "No registered devices; portal messages remain available" }),
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
    const BATCH_SIZE = 10;
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
      JSON.stringify({ success: successCount === totalProcessed, sent: successCount, total: totalProcessed, failed: totalProcessed - successCount, coveredDrivers: coveredDriverIds.size }),
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
